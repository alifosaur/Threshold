import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  CatalogItem, 
  AuditLogEntry, 
  GrowthMetrics, 
  OrderRecord, 
  OrderStatus, 
  PaymentStatus, 
  PaymentEventRecord,
  ReconciliationReport
} from './types.js';

// Resolve current directory for ESM/TypeScript execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.resolve(__dirname, '../catalog.db');

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) return db;

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    try {
      await db.close();
      db = null;
      console.log('Database connection closed cleanly.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
  }
}

// Payment State Machine Transitions Rule Definition
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED'],
  PAID: ['COMPLETED', 'REFUND_PENDING', 'CANCELLED'],
  COMPLETED: ['REFUND_PENDING', 'CANCELLED'],
  REFUND_PENDING: ['REFUNDED', 'COMPLETED'],
  REFUNDED: [],
  PAYMENT_FAILED: [],
  PAYMENT_EXPIRED: [],
  CANCELLED: []
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export async function initDb(): Promise<void> {
  const database = await getDb();

  // 1. Create Catalog Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      stock INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL,
      merchant TEXT NOT NULL,
      image_url TEXT NOT NULL
    )
  `);

  // 2. Create Audit Log Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      request_id TEXT,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      reasoning TEXT,
      status TEXT NOT NULL,
      details TEXT
    )
  `);
  
  // Safe migration for audit_log table
  const auditColumns = await database.all<Array<{ name: string }>>(`PRAGMA table_info(audit_log)`);
  const auditColNames = Array.isArray(auditColumns) ? auditColumns.map(c => c.name) : [];
  if (!auditColNames.includes('request_id')) {
    await database.exec(`ALTER TABLE audit_log ADD COLUMN request_id TEXT`);
  }
  
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_audit_run_id ON audit_log (run_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_audit_req_id ON audit_log (request_id)`);

  // 3. Create Orders Table with Hardened Schema
  await database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT UNIQUE NOT NULL,
      idempotency_key TEXT UNIQUE,
      order_id TEXT UNIQUE NOT NULL,
      razorpay_order_id TEXT,
      payment_id TEXT,
      razorpay_payment_id TEXT,
      refund_id TEXT,
      refund_amount REAL,
      status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      amount REAL NOT NULL,
      price REAL,
      currency TEXT NOT NULL DEFAULT 'INR',
      merchant TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      refunded_at TEXT
    )
  `);

  // 4. Safe Migration for existing orders table
  const columns = await database.all<Array<{ name: string }>>(`PRAGMA table_info(orders)`);
  const colNames = Array.isArray(columns) ? columns.map(c => c.name) : [];

  if (!colNames.includes('idempotency_key')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN idempotency_key TEXT`);
  }
  if (!colNames.includes('razorpay_order_id')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT`);
  }
  if (!colNames.includes('payment_id')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN payment_id TEXT`);
  }
  if (!colNames.includes('razorpay_payment_id')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT`);
  }
  if (!colNames.includes('refund_id')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN refund_id TEXT`);
  }
  if (!colNames.includes('refund_amount')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN refund_amount REAL`);
  }
  if (!colNames.includes('status')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING'`);
  }
  if (!colNames.includes('payment_status')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PENDING'`);
  }
  if (!colNames.includes('amount')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN amount REAL DEFAULT 0`);
    await database.exec(`UPDATE orders SET amount = price WHERE amount = 0 OR amount IS NULL`);
  }
  if (!colNames.includes('currency')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'`);
  }
  if (!colNames.includes('updated_at')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN updated_at TEXT`);
    await database.exec(`UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL`);
  }
  if (!colNames.includes('completed_at')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN completed_at TEXT`);
  }
  if (!colNames.includes('refunded_at')) {
    await database.exec(`ALTER TABLE orders ADD COLUMN refunded_at TEXT`);
  }

  // Ensure performance indexes
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders (order_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_run_id ON orders (run_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_idemp ON orders (idempotency_key)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at)`);

  // 5. Create Payment Events Table for Webhooks and Callbacks
  await database.exec(`
    CREATE TABLE IF NOT EXISTS payment_events (
      event_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON payment_events (order_id)`);

  // 6. Create Settings Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default settings if empty
  const spendLimitResult = await database.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'max_spend');
  if (!spendLimitResult) {
    await database.run("INSERT INTO settings (key, value) VALUES ('max_spend', '1000')");
    await database.run("INSERT INTO settings (key, value) VALUES ('session_limit', '1500')");
    await database.run("INSERT INTO settings (key, value) VALUES ('policy_locked', 'false')");
    console.log('Seeded database settings with defaults.');
  }

  const sessionLimitResult = await database.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'session_limit');
  if (!sessionLimitResult) {
    await database.run("INSERT INTO settings (key, value) VALUES ('session_limit', '1500')");
  }

  const approvedMerchantsResult = await database.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'approved_merchants');
  if (!approvedMerchantsResult) {
    const defaultMerchants = JSON.stringify(['Razorpay Store', 'Luxe Mart', 'Urban Basics']);
    await database.run("INSERT INTO settings (key, value) VALUES ('approved_merchants', ?)", defaultMerchants);
  }

  // Seed Catalog if empty or count mismatch
  const countResult = await database.get<{ count: number }>('SELECT COUNT(*) as count FROM catalog');
  if (!countResult || countResult.count !== 20) {
    console.log('Seeding initial catalog...');
    await database.exec('DROP TABLE IF EXISTS catalog');
    await database.exec(`
      CREATE TABLE IF NOT EXISTS catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        stock INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL,
        merchant TEXT NOT NULL,
        image_url TEXT NOT NULL
      )
    `);

    const products = [
      { name: "Black Oversized Tee", price: 699, currency: "INR", stock: 25, tags: "clothing, tshirt, black, oversized, streetwear, casual", merchant: "Razorpay Store", image_url: "/products/black_oversized_tee.jpg" },
      { name: "Classic White Sneakers", price: 1499, currency: "INR", stock: 12, tags: "footwear, shoes, sneakers, white, casual, sport", merchant: "Razorpay Store", image_url: "/products/classic_white_sneakers.png" },
      { name: "Minimalist Leather Wallet", price: 499, currency: "INR", stock: 40, tags: "accessories, wallet, leather, black, minimalist, pocket", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80" },
      { name: "Stainless Steel Water Bottle", price: 299, currency: "INR", stock: 50, tags: "lifestyle, bottle, water, steel, eco-friendly, sports", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80" },
      { name: "Premium Noise-Cancelling Headphones", price: 4999, currency: "INR", stock: 8, tags: "electronics, audio, headphones, wireless, bluetooth, premium", merchant: "Luxe Mart", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" },
      { name: "Ceramic Coffee Mug (Matte Black)", price: 249, currency: "INR", stock: 35, tags: "home, kitchen, mug, coffee, ceramic, black", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80" },
      { name: "Fast Charging USB-C Cable (2m)", price: 199, currency: "INR", stock: 100, tags: "electronics, cable, usbc, charging, fast-charge, phone", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80" },
      { name: "Organic Cotton Tote Bag", price: 149, currency: "INR", stock: 60, tags: "accessories, bag, tote, organic, cotton, eco-friendly", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80" },
      { name: "Smart Fitness Band", price: 899, currency: "INR", stock: 18, tags: "electronics, fitness, tracker, watch, band, smart", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?auto=format&fit=crop&w=600&q=80" },
      { name: "Canvas Casual Backpack", price: 999, currency: "INR", stock: 15, tags: "bags, backpack, canvas, travel, laptop, casual", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80" },
      { name: "Classic Navy Blue T-Shirt", price: 499, currency: "INR", stock: 30, tags: "clothing, tshirt, navy, blue, cotton, casual", merchant: "Urban Basics", image_url: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=600&q=80" },
      { name: "Black Slim Fit Denim Jeans", price: 999, currency: "INR", stock: 20, tags: "clothing, jeans, denim, black, slim-fit, pants", merchant: "Urban Basics", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80" },
      { name: "Leather Formal Belt (Brown)", price: 449, currency: "INR", stock: 25, tags: "accessories, belt, leather, brown, formal, classic", merchant: "Luxe Mart", image_url: "/products/leather_formal_belt.png" },
      { name: "Polarized Aviator Sunglasses", price: 799, currency: "INR", stock: 15, tags: "accessories, sunglasses, polarized, eyewear, summer, style", merchant: "Luxe Mart", image_url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80" },
      { name: "Cotton Crew Socks (3-Pack)", price: 199, currency: "INR", stock: 50, tags: "clothing, socks, cotton, basics, comfortable, footwear", merchant: "Urban Basics", image_url: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=600&q=80" },
      { name: "Wireless Ergonomic Mouse", price: 649, currency: "INR", stock: 22, tags: "electronics, computer, mouse, wireless, productivity, tech", merchant: "Razorpay Store", image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80" },
      { name: "Desk Mat Extra Large (Grey)", price: 399, currency: "INR", stock: 30, tags: "home, office, desk, pad, accessories, gaming, workspace", merchant: "Razorpay Store", image_url: "/products/desk_mat_grey.jpg" },
      { name: "Aeropress Style Coffee Maker", price: 899, currency: "INR", stock: 10, tags: "home, kitchen, coffee, brewer, manual, travel", merchant: "Luxe Mart", image_url: "/products/aeropress_coffee_maker.jpg" },
      { name: "Sand Washed Cotton Shirt", price: 899, currency: "INR", stock: 18, tags: "clothing, shirt, cotton, casual, summer, beige", merchant: "Luxe Mart", image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80" },
      { name: "Classic Crew Tee", price: 499, currency: "INR", stock: 10, tags: "clothing, tshirt, crew, green, casual", merchant: "Apparel Hub", image_url: "/products/classic_crew_tee.png" }
    ];

    const stmt = await database.prepare(`
      INSERT INTO catalog (name, price, currency, stock, tags, merchant, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
      await stmt.run(p.name, p.price, p.currency, p.stock, p.tags, p.merchant, p.image_url);
    }
    await stmt.finalize();
    console.log(`Seeded ${products.length} products into catalog database.`);
  }
}

// Catalog Query Helpers
export async function getCatalog(): Promise<CatalogItem[]> {
  const database = await getDb();
  return database.all<CatalogItem[]>('SELECT * FROM catalog');
}

export async function getCatalogItemById(id: number): Promise<CatalogItem | undefined> {
  const database = await getDb();
  return database.get<CatalogItem>('SELECT * FROM catalog WHERE id = ?', id);
}

// Audit Log Query Helpers
export async function addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
  const database = await getDb();
  await database.run(
    'INSERT INTO audit_log (run_id, request_id, timestamp, actor, action, reasoning, status, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.run_id, 
      entry.request_id || null, 
      entry.timestamp, 
      entry.actor, 
      entry.action, 
      entry.reasoning, 
      entry.status, 
      entry.details
    ]
  );
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const database = await getDb();
  const rows = await database.all<any[]>('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
  return rows.map(r => ({
    id: r.id,
    run_id: r.run_id,
    request_id: r.request_id,
    timestamp: r.timestamp,
    actor: r.actor,
    action: r.action,
    reasoning: r.reasoning,
    status: r.status,
    details: JSON.parse(r.details || '{}')
  }));
}

export async function getOrderEvents(orderIdOrRunId: string): Promise<AuditLogEntry[]> {
  const database = await getDb();
  const rows = await database.all<any[]>(
    `SELECT * FROM audit_log 
     WHERE run_id = ? OR details LIKE ? 
     ORDER BY id ASC`,
    [orderIdOrRunId, `%"order_id":"${orderIdOrRunId}"%`]
  );
  return rows.map(r => ({
    id: r.id,
    run_id: r.run_id,
    request_id: r.request_id,
    timestamp: r.timestamp,
    actor: r.actor,
    action: r.action,
    reasoning: r.reasoning,
    status: r.status,
    details: JSON.parse(r.details || '{}')
  }));
}

// Settings Helpers
export async function getSetting(key: string): Promise<string | undefined> {
  const database = await getDb();
  const result = await database.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return result ? result.value : undefined;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// Concurrency Mutex for Serialized Transactions
class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>(resolve => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = current.then(() => next);
    await current;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export const transactionLock = new AsyncMutex();

// Helper to map DB row to OrderRecord
function mapRowToOrder(row: any): OrderRecord {
  return {
    id: row.id,
    run_id: row.run_id,
    idempotency_key: row.idempotency_key,
    order_id: row.order_id,
    razorpay_order_id: row.razorpay_order_id,
    payment_id: row.payment_id,
    razorpay_payment_id: row.razorpay_payment_id || row.payment_id,
    refund_id: row.refund_id,
    refund_amount: row.refund_amount,
    status: row.status as OrderStatus,
    payment_status: row.payment_status as PaymentStatus,
    amount: row.amount || row.price,
    price: row.amount || row.price,
    currency: row.currency || 'INR',
    merchant: row.merchant,
    item_id: row.item_id,
    failure_reason: row.failure_reason,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    completed_at: row.completed_at,
    refunded_at: row.refunded_at
  };
}

// Orders and Payment State Machine Management
export async function getOrderByRunId(runId: string): Promise<OrderRecord | undefined> {
  const database = await getDb();
  const row = await database.get<any>('SELECT * FROM orders WHERE run_id = ?', runId);
  if (!row) return undefined;
  return mapRowToOrder(row);
}

export async function getOrderByIdempotencyKey(key: string): Promise<OrderRecord | undefined> {
  const database = await getDb();
  const row = await database.get<any>('SELECT * FROM orders WHERE idempotency_key = ?', key);
  if (!row) return undefined;
  return mapRowToOrder(row);
}

export async function getOrderByOrderId(orderId: string): Promise<OrderRecord | undefined> {
  const database = await getDb();
  const row = await database.get<any>('SELECT * FROM orders WHERE order_id = ?', orderId);
  if (!row) return undefined;
  return mapRowToOrder(row);
}

export async function getOrderByPaymentId(paymentId: string): Promise<OrderRecord | undefined> {
  const database = await getDb();
  const row = await database.get<any>('SELECT * FROM orders WHERE payment_id = ? OR razorpay_payment_id = ?', [paymentId, paymentId]);
  if (!row) return undefined;
  return mapRowToOrder(row);
}

export async function getAllOrders(limit: number = 50): Promise<OrderRecord[]> {
  const database = await getDb();
  const rows = await database.all<any[]>('SELECT rowid as id, * FROM orders ORDER BY created_at DESC LIMIT ?', limit);
  return rows.map(mapRowToOrder);
}

export async function recordOrder(order: OrderRecord): Promise<boolean> {
  const database = await getDb();
  const amount = order.amount || order.price || 0;
  const now = new Date().toISOString();
  const result = await database.run(
    `INSERT OR IGNORE INTO orders (
      run_id, idempotency_key, order_id, razorpay_order_id, payment_id, razorpay_payment_id,
      refund_id, refund_amount, status, payment_status, amount, price, currency, merchant, item_id, 
      failure_reason, created_at, updated_at, completed_at, refunded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.run_id,
      order.idempotency_key || null,
      order.order_id,
      order.razorpay_order_id || order.order_id,
      order.payment_id || null,
      order.razorpay_payment_id || order.payment_id || null,
      order.refund_id || null,
      order.refund_amount || null,
      order.status || 'PAYMENT_PENDING',
      order.payment_status || 'PENDING',
      amount,
      amount,
      order.currency || 'INR',
      order.merchant,
      order.item_id,
      order.failure_reason || null,
      order.created_at || now,
      order.updated_at || now,
      order.completed_at || null,
      order.refunded_at || null
    ]
  );
  return (result.changes || 0) > 0;
}

export async function transitionOrderStatus(
  orderId: string, 
  nextStatus: OrderStatus, 
  nextPaymentStatus: PaymentStatus, 
  failureReason?: string,
  paymentId?: string
): Promise<{ success: boolean; order?: OrderRecord; error?: string }> {
  const database = await getDb();
  const order = await getOrderByOrderId(orderId);
  
  if (!order) {
    return { success: false, error: `Order "${orderId}" not found.` };
  }

  // Check for duplicate payment ID attached to a DIFFERENT order
  if (paymentId) {
    const existingWithPayment = await getOrderByPaymentId(paymentId);
    if (existingWithPayment && existingWithPayment.order_id !== orderId) {
      return {
        success: false,
        error: `Payment ID "${paymentId}" is already bound to order "${existingWithPayment.order_id}".`
      };
    }
  }

  // Validate state machine transition
  if (!isValidTransition(order.status, nextStatus)) {
    return { 
      success: false, 
      error: `Invalid state transition from "${order.status}" to "${nextStatus}".` 
    };
  }

  const now = new Date().toISOString();
  const completedAt = nextStatus === 'COMPLETED' ? (order.completed_at || now) : order.completed_at || null;
  const refundedAt = nextStatus === 'REFUNDED' ? (order.refunded_at || now) : order.refunded_at || null;
  const assignedPaymentId = paymentId || order.payment_id || null;

  await database.run(
    `UPDATE orders SET 
      status = ?, 
      payment_status = ?, 
      payment_id = ?,
      razorpay_payment_id = ?,
      failure_reason = ?, 
      updated_at = ?, 
      completed_at = ?,
      refunded_at = ?
     WHERE order_id = ?`,
    [nextStatus, nextPaymentStatus, assignedPaymentId, assignedPaymentId, failureReason || null, now, completedAt, refundedAt, order.order_id]
  );

  const updatedOrder = await getOrderByOrderId(order.order_id);
  return { success: true, order: updatedOrder };
}

export async function initiateRefundInDb(
  orderId: string,
  refundAmount: number,
  refundId: string
): Promise<{ success: boolean; order?: OrderRecord; error?: string }> {
  const database = await getDb();
  const order = await getOrderByOrderId(orderId);
  
  if (!order) {
    return { success: false, error: `Order "${orderId}" not found.` };
  }

  if (order.status !== 'PAID' && order.status !== 'COMPLETED') {
    return { 
      success: false, 
      error: `Cannot refund order in "${order.status}" status. Only PAID or COMPLETED orders can be refunded.` 
    };
  }

  if (refundAmount > order.amount) {
    return {
      success: false,
      error: `Refund amount (₹${refundAmount}) cannot exceed order captured amount (₹${order.amount}).`
    };
  }

  const now = new Date().toISOString();

  await database.run(
    `UPDATE orders SET 
      status = 'REFUNDED',
      payment_status = 'REFUNDED',
      refund_id = ?,
      refund_amount = ?,
      updated_at = ?,
      refunded_at = ?
     WHERE order_id = ?`,
    [refundId, refundAmount, now, now, order.order_id]
  );

  const updatedOrder = await getOrderByOrderId(order.order_id);
  return { success: true, order: updatedOrder };
}

// Payment Events (Webhook Idempotency)
export async function recordPaymentEvent(event: PaymentEventRecord): Promise<boolean> {
  const database = await getDb();
  const result = await database.run(
    `INSERT OR IGNORE INTO payment_events (event_id, order_id, event_type, status, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [event.event_id, event.order_id, event.event_type, event.status, event.payload, event.created_at]
  );
  return (result.changes || 0) > 0;
}

export async function getPaymentEvent(eventId: string): Promise<PaymentEventRecord | undefined> {
  const database = await getDb();
  return database.get<PaymentEventRecord>('SELECT * FROM payment_events WHERE event_id = ?', eventId);
}

// Cumulative Active Session Spend
export async function getSessionSpent(): Promise<number> {
  const database = await getDb();
  const result = await database.get<{ total: number }>(
    `SELECT COALESCE(SUM(amount), SUM(price), 0) as total 
     FROM orders 
     WHERE status NOT IN ('PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED', 'REFUNDED')`
  );
  return result ? result.total : 0;
}

// Reconciliation Report
export async function getReconciliationReport(): Promise<ReconciliationReport> {
  const database = await getDb();
  const allOrders = await getAllOrders(200);

  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter(o => o.status === 'PAYMENT_PENDING').length;
  const paidOrders = allOrders.filter(o => o.status === 'PAID').length;
  const completedOrders = allOrders.filter(o => o.status === 'COMPLETED').length;
  const failedOrders = allOrders.filter(o => o.status === 'PAYMENT_FAILED').length;
  const refundedOrders = allOrders.filter(o => o.status === 'REFUNDED').length;

  // Stale pending payments (older than 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const stalePendingOrders = allOrders.filter(
    o => o.status === 'PAYMENT_PENDING' && o.created_at < fifteenMinutesAgo
  );

  // Group total amount by status
  const totalAmountByStatus: Record<string, number> = {};
  for (const o of allOrders) {
    const s = o.status;
    totalAmountByStatus[s] = (totalAmountByStatus[s] || 0) + (o.amount || 0);
  }

  // Discrepancy detection
  const stateMismatches: Array<{
    order_id: string;
    local_status: OrderStatus;
    expected_status?: string;
    discrepancy: string;
  }> = [];

  for (const o of allOrders) {
    if (o.status === 'COMPLETED' && !o.completed_at) {
      stateMismatches.push({
        order_id: o.order_id,
        local_status: o.status,
        discrepancy: 'COMPLETED order is missing completed_at timestamp'
      });
    }
    if (o.status === 'REFUNDED' && (!o.refund_id || !o.refunded_at)) {
      stateMismatches.push({
        order_id: o.order_id,
        local_status: o.status,
        discrepancy: 'REFUNDED order is missing refund_id or refunded_at metadata'
      });
    }
  }

  return {
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    paid_orders: paidOrders,
    completed_orders: completedOrders,
    failed_orders: failedOrders,
    refunded_orders: refundedOrders,
    stale_pending_count: stalePendingOrders.length,
    stale_pending_orders: stalePendingOrders,
    state_mismatches: stateMismatches,
    total_amount_by_status: totalAmountByStatus,
    generated_at: new Date().toISOString()
  };
}

export async function getGrowthMetrics(): Promise<GrowthMetrics> {
  const database = await getDb();
  
  const opportunities = 7;
  
  const campaignsResult = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_log WHERE action LIKE 'Growth Campaign Generated%'"
  );
  
  const buyerTestsResult = await database.get<{ count: number }>(
    "SELECT COUNT(DISTINCT run_id) as count FROM audit_log WHERE actor = 'user'"
  );
  
  const approvedResult = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_log WHERE actor = 'policy_engine' AND status = 'APPROVED'"
  );
  
  const blockedResult = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_log WHERE actor = 'policy_engine' AND status = 'REJECTED'"
  );
  
  const duplicateResult = await database.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_log WHERE action LIKE 'Duplicate Transaction Prevented%'"
  );

  const revenueResult = await database.get<{ total: number }>(
    "SELECT COALESCE(SUM(amount), SUM(price), 0) as total FROM orders WHERE status NOT IN ('PAYMENT_FAILED', 'CANCELLED', 'REFUNDED')"
  );

  const ordersApproved = approvedResult?.count || 0;
  const ordersBlocked = blockedResult?.count || 0;
  const duplicatesPrevented = duplicateResult?.count || 0;

  return {
    ai_opportunities: opportunities,
    campaigns_generated: campaignsResult?.count || 0,
    ai_buyer_tests: buyerTestsResult?.count || 0,
    orders_approved: ordersApproved,
    orders_blocked: ordersBlocked,
    test_revenue: revenueResult?.total || 0,
    duplicate_prevented: duplicatesPrevented,
    protected_attempts: ordersBlocked + duplicatesPrevented
  };
}

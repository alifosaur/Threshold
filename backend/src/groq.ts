import { CatalogItem } from './types.js';

export interface AgentDecision {
  match_status: 'EXACT_MATCH' | 'NO_EXACT_MATCH';
  selected_item_id: number | null; // Item ID or null if no exact match
  reasoning: string;
  alternatives: number[];          // Up to 3 alternative product IDs from the catalog
}

export interface CrossSellDecision {
  product_id: number;
  reasoning: string;
}

export interface CampaignProposal {
  campaign_name: string;
  target_intent: string;
  ai_buyer_message: string;
  sample_buyer_query: string;
}

const GROQ_MODELS = [
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

export async function queryAgent(goal: string, catalog: CatalogItem[]): Promise<AgentDecision> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env file.');
  }

  // Compact serialization containing only essential decision fields to minimize token usage
  const minimalCatalog = catalog.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    merchant: item.merchant,
    tags: item.tags
  }));

  const catalogJson = JSON.stringify(minimalCatalog);

  const systemPrompt = `You are the Threshold Autonomous Commerce assistant. Your role is to understand the user's natural-language shopping goal and match it to a real product in our catalog.

Catalog (Authoritative Source of Truth):
${catalogJson}

Rules:
1. Product Intent Matching:
   - Natural language queries must be understood flexibly (e.g., "black t-shirt", "black tee", "get me a black oversized tee", "I want a black oversized t-shirt", "find me a black tee under 800" all match "Black Oversized Tee" with ID 1).
   - Carefully inspect item names, categories/tags, and prices.
2. Anti-Hallucination & No-Substitution (CRITICAL):
   - You may ONLY choose an existing product ID from the supplied catalog list.
   - If the user requests a product type that does NOT exist in the catalog (e.g., "cap", "baseball cap", "denim jacket", "shoes", "sunglasses", etc.), you MUST NOT select an unrelated product (such as a t-shirt, shirt, mug, or candle) simply because it exists or satisfies a price condition.
   - If no product genuinely matches the requested product type, you MUST return "NO_EXACT_MATCH" with "selected_item_id": null.
   - Never invent product names, product IDs, merchants, or prices.
3. Decision States:
   - When a genuine match exists:
     * "match_status": "EXACT_MATCH"
     * "selected_item_id": <integer ID of the matched product>
     * "reasoning": "<clear explanation of why this product satisfies the user's request>"
     * "alternatives": []
   - When NO genuine match exists:
     * "match_status": "NO_EXACT_MATCH"
     * "selected_item_id": null
     * "reasoning": "<clear explanation stating that the requested item is not available in the catalog>"
     * "alternatives": [<up to 3 integer IDs of real products in the catalog that are closest or popular>]
4. Policy Decoupling:
   - Do NOT perform server policy checks (such as merchant whitelists or max spend caps). That is evaluated downstream by the Policy Engine.

Response Format:
Respond strictly in valid JSON:
{
  "match_status": "EXACT_MATCH" | "NO_EXACT_MATCH",
  "selected_item_id": number | null,
  "reasoning": string,
  "alternatives": number[]
}`;

  let attempts = 0;
  const maxAttempts = 8;

  for (let i = 0; i < maxAttempts; i++) {
    attempts++;
    const model = GROQ_MODELS[i % GROQ_MODELS.length];
    const startTime = Date.now();
    console.log(`[Groq] Sending query for goal "${goal}" via ${model} (attempt ${attempts}/${maxAttempts})...`);
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User Purchase Goal: "${goal}"` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (response.status === 429) {
        console.log(`[Groq] Rate limit hit on ${model}. Switching to next model in pool...`);
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Groq] Error response from ${model} (${response.status}):`, errorText);
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`Groq API error (status ${response.status}): ${errorText}`);
      }

      const result = (await response.json()) as any;
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        if (i < maxAttempts - 1) continue;
        throw new Error('Groq returned an empty completions response.');
      }

      console.log(`[Groq] Received decision for goal "${goal}" via ${model} in ${Date.now() - startTime}ms.`);
      const decision: AgentDecision = JSON.parse(content);
      return decision;
    } catch (err: any) {
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Groq request exceeded maximum retry attempts.');
}

export async function queryCrossSell(
  selectedItem: CatalogItem,
  catalog: CatalogItem[],
  remainingBudget: number,
  goal: string
): Promise<CrossSellDecision | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  // Pre-filter catalog: Only items that are within budget and not the purchased item
  const candidates = catalog
    .filter(item => item.id !== selectedItem.id && item.price <= remainingBudget)
    .map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      merchant: item.merchant,
      tags: item.tags
    }));

  if (candidates.length === 0) {
    return null; // Zero eligible candidates within remaining budget
  }

  const systemPrompt = `You are the Threshold Autonomous Commerce assistant. The user just purchased "${selectedItem.name}" (Price: ₹${selectedItem.price}).
The user's remaining transaction budget is ₹${remainingBudget}.

Candidate Complementary Products (All under ₹${remainingBudget}):
${JSON.stringify(candidates)}

Instructions:
1. Recommend AT MOST ONE complementary product from the candidate list that naturally pairs with "${selectedItem.name}".
   - Examples of natural affinity:
     * Apparel (T-shirt/Shirt/Shorts) -> Socks, Wallet, Belt, Beanie, Tote Bag
     * Electronics (Headphones/Mouse/Keyboard) -> Power Bank, Laptop Stand, Charging Pad
     * Home (Mug/Vase) -> Scented Candle, Desk Tray
2. If none of the candidates are genuinely complementary, return null. Do NOT force an unrelated product.
3. You may ONLY choose an existing product ID from the candidates list.
4. Response Format (JSON):
   {
     "cross_sell": {
       "product_id": <number>,
       "reasoning": "<clear 1-sentence explanation of why this complements the purchase>"
     }
   }
   OR
   {
     "cross_sell": null
   }`;

  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Original purchase goal was: "${goal}"` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      console.log(`[Groq Cross-sell] Model: ${model} Status: ${response.status}`);
      if (!response.ok) {
        continue;
      }

      const result = (await response.json()) as any;
      const content = result.choices?.[0]?.message?.content;
      console.log(`[Groq Cross-sell] Model: ${model} Content:`, content);
      if (!content) {
        continue;
      }

      const parsed = JSON.parse(content);
      let prodId: number | undefined;
      let reasoning: string = 'Complements your purchase.';

      if (parsed.cross_sell && typeof parsed.cross_sell.product_id === 'number') {
        prodId = parsed.cross_sell.product_id;
        reasoning = parsed.cross_sell.reasoning || reasoning;
      } else if (typeof parsed.product_id === 'number') {
        prodId = parsed.product_id;
        reasoning = parsed.reasoning || reasoning;
      } else if (typeof parsed.selected_item_id === 'number') {
        prodId = parsed.selected_item_id;
        reasoning = parsed.reasoning || reasoning;
      }

      if (typeof prodId === 'number') {
        return {
          product_id: prodId,
          reasoning: String(reasoning)
        };
      }

      return null;
    } catch (err) {
      if (i < GROQ_MODELS.length - 1) continue;
      console.error('Error during cross-sell generation (gracefully skipped):', err);
      return null;
    }
  }
  return null;
}

export async function generateCampaignProposal(
  product: CatalogItem,
  merchantGoal?: string
): Promise<CampaignProposal> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env file.');
  }

  const systemPrompt = `You are the Threshold Autonomous Commerce Growth Agent.
A merchant wants to create a targeted growth campaign for a product in their catalog to make it discoverable to AI shopping buyers.

Product Details (Authoritative facts only):
ID: ${product.id}
Name: ${product.name}
Price: ₹${product.price}
Merchant: ${product.merchant}
Tags: ${product.tags}

Merchant Goal: "${merchantGoal || 'Promote this product to AI buyers looking for relevant items.'}"

Instructions:
1. Use ONLY the real product information provided above. Do NOT invent discounts, fake stock counts, fake reviews, or nonexistent features.
2. Generate a concise, professional campaign proposal with:
   - campaign_name: A short, catchy title (e.g. "Everyday Essentials Push", "Summer Linen Spotlight", "Office Workspace Push")
   - target_intent: The natural-language intent of buyers looking for this product (e.g. "Customers searching for casual t-shirts under ₹1,000")
   - ai_buyer_message: A clear, factual message explaining why the product matches buyer intent (e.g. "Looking for a relaxed black tee under ₹1,000? Black Oversized Tee from ${product.merchant} is available for ₹${product.price}.")
   - sample_buyer_query: A realistic natural-language buyer query that a simulated AI buyer would use to find and buy this product (e.g. "buy a black oversized tee under 1000" or "buy ${product.name.toLowerCase()} from ${product.merchant}").

Response Format (JSON):
Respond strictly in valid JSON:
{
  "campaign_name": string,
  "target_intent": string,
  "ai_buyer_message": string,
  "sample_buyer_query": string
}`;

  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate growth campaign for product ID ${product.id} ("${product.name}").` }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        console.warn(`[Groq Campaign] Model ${model} returned status ${response.status}`);
        continue;
      }

      const result = (await response.json()) as any;
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        continue;
      }

      const proposal: CampaignProposal = JSON.parse(content);
      if (proposal.campaign_name && proposal.sample_buyer_query) {
        return proposal;
      }
    } catch (err) {
      console.warn(`[Groq Campaign] Model ${model} failed, trying next model:`, err);
      continue;
    }
  }

  // Graceful deterministic fallback if upstream LLM is temporarily saturated
  return {
    campaign_name: `${product.name} AI Growth Push`,
    target_intent: `Buyers searching for ${product.name.toLowerCase()} or complementary ${product.tags} under ₹${product.price + 500}`,
    ai_buyer_message: `Looking for premium ${product.name.toLowerCase()}? ${product.name} from ${product.merchant} is available for ₹${product.price}.`,
    sample_buyer_query: `buy ${product.name.toLowerCase()} from ${product.merchant}`
  };
}

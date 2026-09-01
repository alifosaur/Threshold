import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiErrorCode } from './types.js';

export function requireAgentAuth(req: Request, res: Response, next: NextFunction) {
  const expectedToken = process.env.AGENT_API_TOKEN;
  const authHeader = req.headers['authorization'];
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED' as ApiErrorCode,
        message: 'Invalid or missing Authorization token. Bearer token required.',
        request_id: requestId,
        retryable: false
      }
    });
  }

  const providedToken = authHeader.substring(7).trim();
  if (!expectedToken || providedToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED' as ApiErrorCode,
        message: 'Invalid or missing Authorization token.',
        request_id: requestId,
        retryable: false
      }
    });
  }

  next();
}

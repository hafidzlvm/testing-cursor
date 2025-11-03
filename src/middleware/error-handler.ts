import { Context } from 'hono';
import { logger } from '../config/logger';

export const errorHandler = async (error: Error, c: Context) => {
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    path: c.req.path,
    method: c.req.method,
  });

  const status = error.name === 'ValidationError' ? 400 : 500;

  return c.json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  }, status);
};


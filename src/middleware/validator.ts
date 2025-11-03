import { Context, Next } from 'hono';
import { z } from 'zod';

export const validator = (schema: z.ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const query = Object.fromEntries(c.req.query());
      const params = c.req.param();

      const data = { ...body, ...query, ...params };
      const validated = await schema.parseAsync(data);
      
      // Attach validated data to context
      c.set('validated', validated);
      
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        }, 400);
      }
      throw error;
    }
  };
};


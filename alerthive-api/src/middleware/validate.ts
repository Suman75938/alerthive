import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../types/api';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: result.error.flatten().fieldErrors,
      } satisfies ApiResponse);
      return;
    }
    // Replace with parsed/coerced values
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}

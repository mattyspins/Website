import { Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = createError.notFound(
    `Route ${req.method} ${req.path} not found`
  );
  next(error);
};

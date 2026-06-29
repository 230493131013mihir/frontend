import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  } else {
    // Log unexpected errors
    console.error('💥 Unexpected Server Error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async wrapper to avoid try-catch blocks in route handlers
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

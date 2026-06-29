import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { readDatabase, toPublicUser } from '../data/localDatabase.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { PublicUser, Role } from '../types/domain.js';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
  token?: string;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const database = await readDatabase();

    const session = database.sessions.find(
      (item) =>
        item.token === token &&
        item.userId === decoded.userId &&
        new Date(item.expiresAt).getTime() > Date.now(),
    );

    if (!session) {
      throw new UnauthorizedError('Session has expired or is invalid');
    }

    const user = database.users.find((item) => item.id === decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User account associated with session not found');
    }

    req.user = toPublicUser(user, database);
    req.token = token;
    next();
  } catch {
    next(new UnauthorizedError('Unauthorized access'));
  }
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

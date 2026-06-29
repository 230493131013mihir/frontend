import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService.js';
import { catchAsync } from '../middleware/errorMiddleware.js';
import { ValidationError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.format());
  }

  const { user, company } = await AuthService.registerCompanyOwner(result.data);

  res.status(201).json({
    status: 'success',
    data: {
      user,
      company,
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.format());
  }

  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;

  const { user, accessToken, refreshToken } = await AuthService.login({
    ...result.data,
    userAgent,
    ipAddress,
  });

  // Set refresh token in secure HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
      accessToken,
    },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    res.status(401).json({
      status: 'error',
      message: 'Refresh token is missing',
    });
    return;
  }

  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip;

  const { user, accessToken } = await AuthService.refresh(refreshToken, userAgent, ipAddress);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      accessToken,
    },
  });
});

export const logout = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const token = req.token;
  const userId = req.user?.id;

  if (token && userId) {
    await AuthService.logout(token, userId);
  }

  res.clearCookie('refreshToken');
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

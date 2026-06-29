import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { readDatabase, toPublicUser, writeDatabase } from '../data/localDatabase.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    });
  }

  static async registerCompanyOwner(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
  }) {
    const database = await readDatabase();
    const email = data.email.toLowerCase();
    const existingUser = database.users.find((user) => user.email.toLowerCase() === email);

    if (existingUser) {
      throw new ConflictError('Email address is already in use');
    }

    const timestamp = new Date().toISOString();
    const company = {
      id: randomUUID(),
      name: data.companyName,
      domain: `${data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.skillforge.ai`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const user = {
      id: randomUUID(),
      email,
      password: await this.hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'COMPANY_OWNER' as const,
      companyId: company.id,
      isVerified: true,
      twoFactorEnabled: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.companies.push(company);
    database.users.push(user);
    database.auditLogs.unshift({
      id: randomUUID(),
      userId: user.id,
      action: 'REGISTER_COMPANY',
      details: JSON.stringify({ companyId: company.id, companyName: company.name }),
      createdAt: timestamp,
    });

    await writeDatabase(database);
    return { user: toPublicUser(user, database), company };
  }

  static async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const database = await readDatabase();
    const user = database.users.find((item) => item.email.toLowerCase() === data.email.toLowerCase());

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    database.sessions.push({
      id: randomUUID(),
      userId: user.id,
      token: accessToken,
      expiresAt: expiresAt.toISOString(),
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      createdAt: new Date().toISOString(),
    });
    database.auditLogs.unshift({
      id: randomUUID(),
      userId: user.id,
      action: 'LOGIN',
      ipAddress: data.ipAddress,
      createdAt: new Date().toISOString(),
    });

    await writeDatabase(database);
    return {
      user: toPublicUser(user, database),
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
      const database = await readDatabase();
      const user = database.users.find((item) => item.id === decoded.userId);

      if (!user) {
        throw new UnauthorizedError('User account not found');
      }

      const accessToken = this.generateAccessToken(user.id);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      database.sessions.push({
        id: randomUUID(),
        userId: user.id,
        token: accessToken,
        expiresAt: expiresAt.toISOString(),
        userAgent,
        ipAddress,
        createdAt: new Date().toISOString(),
      });
      await writeDatabase(database);

      return {
        user: toPublicUser(user, database),
        accessToken,
      };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async logout(accessToken: string, userId: string) {
    const database = await readDatabase();
    database.sessions = database.sessions.filter(
      (session) => session.token !== accessToken || session.userId !== userId,
    );
    database.auditLogs.unshift({
      id: randomUUID(),
      userId,
      action: 'LOGOUT',
      createdAt: new Date().toISOString(),
    });
    await writeDatabase(database);
  }
}

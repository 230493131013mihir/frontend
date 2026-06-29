export const roles = [
  'SUPER_ADMIN',
  'COMPANY_OWNER',
  'MANAGER',
  'EMPLOYEE',
  'CUSTOMER',
  'VENDOR',
  'HR',
  'ACCOUNTANT',
  'SALES_EXECUTIVE',
  'SUPPORT_EXECUTIVE',
] as const;

export type Role = (typeof roles)[number];

export interface Company {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyId?: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'password'> & { company?: Company };

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  email: string;
  stage: 'New' | 'Qualified' | 'Proposal' | 'Won';
  value: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillForgeDatabase {
  companies: Company[];
  users: User[];
  sessions: Session[];
  auditLogs: AuditLog[];
  leads: Lead[];
}

import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { SkillForgeDatabase, Lead, PublicUser, User } from '../types/domain.js';

const dataDir = path.resolve(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'skillforge-db.json');

const now = () => new Date().toISOString();

const seedDatabase = (): SkillForgeDatabase => {
  const companyId = randomUUID();
  const ownerId = randomUUID();
  const employeeId = randomUUID();
  const createdAt = now();

  return {
    companies: [
      {
        id: companyId,
        name: 'Acme Corporation',
        domain: 'acme.skillforge.ai',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    users: [
      {
        id: ownerId,
        email: 'admin@acme.com',
        password: bcrypt.hashSync('adminpassword123', 10),
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'COMPANY_OWNER',
        companyId,
        isVerified: true,
        twoFactorEnabled: false,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: employeeId,
        email: 'employee@acme.com',
        password: bcrypt.hashSync('employeepassword123', 10),
        firstName: 'John',
        lastName: 'Smith',
        role: 'EMPLOYEE',
        companyId,
        isVerified: true,
        twoFactorEnabled: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    sessions: [],
    auditLogs: [
      {
        id: randomUUID(),
        userId: ownerId,
        action: 'SYSTEM_SEED',
        details: 'Initial local database created',
        createdAt,
      },
    ],
    leads: [
      {
        id: randomUUID(),
        companyId,
        name: 'Northstar Retail',
        email: 'ops@northstar.example',
        stage: 'Qualified',
        value: 42000,
        owner: 'Jane Doe',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        companyId,
        name: 'BluePeak Hospital',
        email: 'admin@bluepeak.example',
        stage: 'Proposal',
        value: 86000,
        owner: 'John Smith',
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
};

const ensureDatabase = async () => {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, 'utf8');
  } catch {
    await writeFile(dataFile, JSON.stringify(seedDatabase(), null, 2));
  }
};

export const readDatabase = async (): Promise<SkillForgeDatabase> => {
  await ensureDatabase();
  const raw = await readFile(dataFile, 'utf8');
  return JSON.parse(raw) as SkillForgeDatabase;
};

export const writeDatabase = async (database: SkillForgeDatabase) => {
  await ensureDatabase();
  await writeFile(dataFile, JSON.stringify(database, null, 2));
};

export const toPublicUser = (user: User, database: SkillForgeDatabase): PublicUser => {
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    company: database.companies.find((company) => company.id === user.companyId),
  };
};

export const createLead = async (companyId: string, input: Omit<Lead, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
  const database = await readDatabase();
  const timestamp = now();
  const lead: Lead = {
    id: randomUUID(),
    companyId,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  database.leads.unshift(lead);
  await writeDatabase(database);
  return lead;
};

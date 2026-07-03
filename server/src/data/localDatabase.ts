import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Employee,
  Invoice,
  Lead,
  Product,
  PublicUser,
  SkillForgeDatabase,
  User,
  WorkTask,
} from '../types/domain.js';

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
    employees: [
      {
        id: randomUUID(),
        companyId,
        name: 'Aarav Mehta',
        email: 'aarav@acme.example',
        department: 'Sales',
        role: 'Sales Executive',
        status: 'Active',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        companyId,
        name: 'Priya Sharma',
        email: 'priya@acme.example',
        department: 'Operations',
        role: 'Manager',
        status: 'Active',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    products: [
      {
        id: randomUUID(),
        companyId,
        name: 'Premium POS Terminal',
        sku: 'POS-1001',
        category: 'Hardware',
        stock: 34,
        price: 499,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        companyId,
        name: 'Inventory Scanner',
        sku: 'SCAN-2040',
        category: 'Barcode',
        stock: 18,
        price: 149,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    invoices: [
      {
        id: randomUUID(),
        companyId,
        customer: 'Northstar Retail',
        amount: 42000,
        status: 'Sent',
        dueDate: '2026-07-15',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        companyId,
        customer: 'BluePeak Hospital',
        amount: 86000,
        status: 'Draft',
        dueDate: '2026-07-25',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    tasks: [
      {
        id: randomUUID(),
        companyId,
        title: 'Prepare CRM demo for client',
        owner: 'Jane Doe',
        priority: 'High',
        status: 'In Progress',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        companyId,
        title: 'Review invoice workflow',
        owner: 'John Smith',
        priority: 'Medium',
        status: 'Todo',
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
  const database = JSON.parse(raw) as SkillForgeDatabase;
  const changed = ensureCollections(database);
  if (changed) {
    await writeDatabase(database);
  }
  return database;
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

const ensureCollections = (database: SkillForgeDatabase) => {
  let changed = false;
  const fallback = seedDatabase();
  if (!Array.isArray(database.employees)) {
    database.employees = fallback.employees;
    changed = true;
  }
  if (!Array.isArray(database.products)) {
    database.products = fallback.products;
    changed = true;
  }
  if (!Array.isArray(database.invoices)) {
    database.invoices = fallback.invoices;
    changed = true;
  }
  if (!Array.isArray(database.tasks)) {
    database.tasks = fallback.tasks;
    changed = true;
  }
  const companyId = database.companies[0]?.id;
  if (companyId && database.employees.every((employee) => employee.companyId !== companyId)) {
    const timestamp = now();
    database.employees.push({
      id: randomUUID(),
      companyId,
      name: 'Aarav Mehta',
      email: 'aarav@acme.example',
      department: 'Sales',
      role: 'Sales Executive',
      status: 'Active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    changed = true;
  }
  if (companyId && database.products.every((product) => product.companyId !== companyId)) {
    const timestamp = now();
    database.products.push({
      id: randomUUID(),
      companyId,
      name: 'Premium POS Terminal',
      sku: 'POS-1001',
      category: 'Hardware',
      stock: 34,
      price: 499,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    changed = true;
  }
  if (companyId && database.invoices.every((invoice) => invoice.companyId !== companyId)) {
    const timestamp = now();
    database.invoices.push({
      id: randomUUID(),
      companyId,
      customer: 'Northstar Retail',
      amount: 42000,
      status: 'Sent',
      dueDate: '2026-07-15',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    changed = true;
  }
  if (companyId && database.tasks.every((task) => task.companyId !== companyId)) {
    const timestamp = now();
    database.tasks.push({
      id: randomUUID(),
      companyId,
      title: 'Prepare CRM demo for client',
      owner: 'Jane Doe',
      priority: 'High',
      status: 'In Progress',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    changed = true;
  }
  return changed;
};

const withRecordMeta = <T extends object>(companyId: string, input: T) => {
  const timestamp = now();
  return {
    id: randomUUID(),
    companyId,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const createEmployee = async (
  companyId: string,
  input: Omit<Employee, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) => {
  const database = await readDatabase();
  const employee = withRecordMeta(companyId, input) as Employee;
  database.employees.unshift(employee);
  await writeDatabase(database);
  return employee;
};

export const createProduct = async (
  companyId: string,
  input: Omit<Product, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) => {
  const database = await readDatabase();
  const product = withRecordMeta(companyId, input) as Product;
  database.products.unshift(product);
  await writeDatabase(database);
  return product;
};

export const createInvoice = async (
  companyId: string,
  input: Omit<Invoice, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) => {
  const database = await readDatabase();
  const invoice = withRecordMeta(companyId, input) as Invoice;
  database.invoices.unshift(invoice);
  await writeDatabase(database);
  return invoice;
};

export const createTask = async (
  companyId: string,
  input: Omit<WorkTask, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
) => {
  const database = await readDatabase();
  const task = withRecordMeta(companyId, input) as WorkTask;
  database.tasks.unshift(task);
  await writeDatabase(database);
  return task;
};

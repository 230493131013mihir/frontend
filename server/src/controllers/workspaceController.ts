import { Response } from 'express';
import { z } from 'zod';
import {
  createEmployee,
  createInvoice,
  createLead,
  createProduct,
  createTask,
  readDatabase,
} from '../data/localDatabase.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { catchAsync } from '../middleware/errorMiddleware.js';
import { ValidationError } from '../utils/errors.js';

const leadSchema = z.object({
  name: z.string().min(2, 'Lead name is required'),
  email: z.string().email('Valid lead email is required'),
  stage: z.enum(['New', 'Qualified', 'Proposal', 'Won']).default('New'),
  value: z.coerce.number().min(0),
  owner: z.string().min(2, 'Owner name is required'),
});

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  department: z.string().min(2),
  role: z.string().min(2),
  status: z.enum(['Active', 'On Leave', 'Inactive']).default('Active'),
});

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  stock: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

const invoiceSchema = z.object({
  customer: z.string().min(2),
  amount: z.coerce.number().min(0),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).default('Draft'),
  dueDate: z.string().min(8),
});

const taskSchema = z.object({
  title: z.string().min(2),
  owner: z.string().min(2),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['Todo', 'In Progress', 'Done']).default('Todo'),
});

export const getWorkspaceSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const database = await readDatabase();
  const companyId = req.user?.companyId;
  const companyLeads = database.leads.filter((lead) => lead.companyId === companyId);
  const employees = database.employees.filter((employee) => employee.companyId === companyId);
  const products = database.products.filter((product) => product.companyId === companyId);
  const invoices = database.invoices.filter((invoice) => invoice.companyId === companyId);
  const tasks = database.tasks.filter((task) => task.companyId === companyId);
  const pipelineValue = companyLeads.reduce((total, lead) => total + lead.value, 0);
  const invoiceValue = invoices.reduce((total, invoice) => total + invoice.amount, 0);
  const stockUnits = products.reduce((total, product) => total + product.stock, 0);

  res.status(200).json({
    status: 'success',
    data: {
      metrics: [
        { label: 'Companies', value: database.companies.length.toString(), note: 'Tenants in local database' },
        { label: 'Employees', value: employees.length.toString(), note: 'HR records' },
        { label: 'Pipeline', value: `$${pipelineValue.toLocaleString()}`, note: 'CRM lead value' },
        { label: 'Inventory', value: stockUnits.toString(), note: 'Units in stock' },
        { label: 'Invoices', value: `$${invoiceValue.toLocaleString()}`, note: 'Finance amount' },
        { label: 'Tasks', value: tasks.length.toString(), note: 'Work items' },
      ],
      modules: [
        { name: 'CRM', status: 'Live', description: 'Lead list and create flow are connected to the API.' },
        { name: 'Authentication', status: 'Live', description: 'Register, login, refresh, logout, and /me are connected.' },
        { name: 'HR', status: 'Live', description: 'Employee records can be created and viewed.' },
        { name: 'Inventory', status: 'Live', description: 'Product stock records can be created and viewed.' },
        { name: 'Finance', status: 'Live', description: 'Invoices can be created and tracked.' },
        { name: 'Tasks', status: 'Live', description: 'Team work items can be created and tracked.' },
        { name: 'AI Desk', status: 'Demo', description: 'Assistant view explains planned AI workflows.' },
      ],
      activities: database.auditLogs.slice(0, 6),
      leads: companyLeads,
      employees,
      products,
      invoices,
      tasks,
    },
  });
});

export const listLeads = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const database = await readDatabase();
  const leads = database.leads.filter((lead) => lead.companyId === req.user?.companyId);

  res.status(200).json({
    status: 'success',
    data: { leads },
  });
});

export const addLead = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const result = leadSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.format());
  }

  const lead = await createLead(req.user?.companyId ?? '', result.data);

  res.status(201).json({
    status: 'success',
    data: { lead },
  });
});

const getCompanyId = (req: AuthenticatedRequest) => req.user?.companyId ?? '';

export const addEmployee = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const result = employeeSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.format());
  const employee = await createEmployee(getCompanyId(req), result.data);
  res.status(201).json({ status: 'success', data: { employee } });
});

export const addProduct = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.format());
  const product = await createProduct(getCompanyId(req), result.data);
  res.status(201).json({ status: 'success', data: { product } });
});

export const addInvoice = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const result = invoiceSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.format());
  const invoice = await createInvoice(getCompanyId(req), result.data);
  res.status(201).json({ status: 'success', data: { invoice } });
});

export const addTask = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const result = taskSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.format());
  const task = await createTask(getCompanyId(req), result.data);
  res.status(201).json({ status: 'success', data: { task } });
});

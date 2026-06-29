import { Response } from 'express';
import { z } from 'zod';
import { createLead, readDatabase } from '../data/localDatabase.js';
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

export const getWorkspaceSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const database = await readDatabase();
  const companyId = req.user?.companyId;
  const companyLeads = database.leads.filter((lead) => lead.companyId === companyId);
  const pipelineValue = companyLeads.reduce((total, lead) => total + lead.value, 0);

  res.status(200).json({
    status: 'success',
    data: {
      metrics: [
        { label: 'Companies', value: database.companies.length.toString(), note: 'Tenants in local database' },
        { label: 'Users', value: database.users.length.toString(), note: 'Registered team members' },
        { label: 'Pipeline', value: `$${pipelineValue.toLocaleString()}`, note: 'CRM lead value' },
        { label: 'Audit logs', value: database.auditLogs.length.toString(), note: 'Security activity' },
      ],
      modules: [
        { name: 'CRM', status: 'Live', description: 'Lead list and create flow are connected to the API.' },
        { name: 'Authentication', status: 'Live', description: 'Register, login, refresh, logout, and /me are connected.' },
        { name: 'HR', status: 'Ready next', description: 'Employee model and attendance flows come after CRM.' },
        { name: 'Finance', status: 'Ready next', description: 'Invoices, expenses, and reports will reuse tenant foundation.' },
      ],
      activities: database.auditLogs.slice(0, 6),
      leads: companyLeads,
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

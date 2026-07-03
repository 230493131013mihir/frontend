import { Router } from 'express';
import {
  addEmployee,
  addInvoice,
  addLead,
  addProduct,
  addTask,
  getWorkspaceSummary,
  listLeads,
} from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', getWorkspaceSummary);
router.get('/leads', listLeads);
router.post('/leads', addLead);
router.post('/employees', addEmployee);
router.post('/products', addProduct);
router.post('/invoices', addInvoice);
router.post('/tasks', addTask);

export default router;

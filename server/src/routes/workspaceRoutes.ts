import { Router } from 'express';
import { addLead, getWorkspaceSummary, listLeads } from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', getWorkspaceSummary);
router.get('/leads', listLeads);
router.post('/leads', addLead);

export default router;

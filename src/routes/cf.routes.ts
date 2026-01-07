import { Router } from 'express';
import { validateCf } from '../controllers/cf.controller';

const router = Router();

// POST /api/cf/validate
router.post('/validate', validateCf);

export default router;

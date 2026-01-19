// routes/vatRoutes.ts
import { Router } from 'express';
import { validateVat } from '../controllers/vatControllers';

const router = Router();

router.post('/validate-vat', validateVat);

export default router;

// src/routes/company.routes.ts
import { Router } from 'express';
import { lookupCompanyByVat } from '../controllers/pIva.controller';

const router = Router();

// Definiamo la rotta POST che il frontend chiamerà
// es. POST /api/company/lookup
router.post('/lookup', lookupCompanyByVat);

export default router;
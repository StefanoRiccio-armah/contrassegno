// src/routes/payment.routes.ts
import { Router } from 'express';
import { handlePaymentChange } from '../controllers/payments.controller'

const router = Router();

// Definiamo la rotta e le associamo il suo controller
router.post('/handle-payment-change', handlePaymentChange);

export default router;
import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Verifica firma webhook BigCommerce
// ─────────────────────────────────────────────────────────────────────────────
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.BIGCOMMERCE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] BIGCOMMERCE_WEBHOOK_SECRET non configurato, skip verifica firma');
    return true;
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhooks/bigcommerce/order-created
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bigcommerce/order-created', async (req: Request, res: Response) => {
  // Risponde subito 200 a BigCommerce per evitare retry
  res.status(200).json({ received: true });

  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-webhook-signature'] as string;

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.error('[Webhook] Firma non valida, evento ignorato');
      return;
    }

    const orderId: number = req.body?.data?.id;
    if (!orderId) {
      console.warn('[Webhook] orderId mancante nel payload, evento ignorato');
      return;
    }

    console.log(`[Webhook] Ordine ricevuto: #${orderId} — logica GLS gestita da saveShopSelection`);

    // Logica futura: email, ERP, notifiche, ecc.

  } catch (err) {
    console.error('[Webhook] Errore elaborazione ordine:', err);
  }
});

export default router;
import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { getGLSToken } from '../utils/token';

// ─────────────────────────────────────────────────────────────────────────────
// BigCommerce Webhook Handler
// Riceve gli eventi di creazione ordine da BigCommerce e, se l'ordine
// contiene una spedizione verso un GLS Parcel Shop, chiama AddParcel
// e CloseWorkDay in automatico.
//
// Setup nel tuo pannello BigCommerce:
//   POST https://api.bigcommerce.com/stores/{store_hash}/v2/hooks
//   Body: { "scope": "store/order/created", "destination": "https://tuoserver.com/webhooks/bigcommerce/order-created", "is_active": true }
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// Verifica firma HMAC del webhook BigCommerce
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.BIGCOMMERCE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] BIGCOMMERCE_WEBHOOK_SECRET non configurato, skip verifica firma');
    return true; // In sviluppo puoi saltare la verifica
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Helper: legge i metadati GLS dell'ordine tramite BigCommerce Orders API
async function getOrderGLSMeta(orderId: number): Promise<{
  shipmentNumber?: string | undefined;
  partnerId?: string;
  parcelShopId?: string;
} | null> {
  try {
    const response = await axios.get(
      `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v2/orders/${orderId}/metafields`,
      {
        headers: {
          'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN!,
          'Accept': 'application/json'
        }
      }
    );

    const metafields: Array<{ key: string; value: string }> = response.data;
    const meta: Record<string, string> = {};
    metafields.forEach(m => { meta[m.key] = m.value; });

    if (!meta.gls_partner_id || !meta.gls_parcel_shop_id) {
      return null; // Non è una spedizione GLS Parcel Shop
    }

    return {
      shipmentNumber: meta.gls_shipment_number,
      partnerId: meta.gls_partner_id,
      parcelShopId: meta.gls_parcel_shop_id
    };
  } catch (err) {
    console.error('[Webhook] Errore lettura metafields ordine:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhooks/bigcommerce/order-created
// Chiamato automaticamente da BigCommerce alla creazione di ogni ordine.
// Se l'ordine ha metadati GLS (parcelShopId), esegue AddParcel + CloseWorkDay.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bigcommerce/order-created', async (req: Request, res: Response) => {
  // Risponde subito 200 a BigCommerce (evita timeout/retry)
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
      console.warn('[Webhook] Nessun orderId nel payload:', req.body);
      return;
    }

    console.log(`[Webhook] Ordine ricevuto: #${orderId}`);

    // Legge i metadati GLS salvati durante il checkout
    const glsMeta = await getOrderGLSMeta(orderId);
    if (!glsMeta) {
      console.log(`[Webhook] Ordine #${orderId} non è una spedizione GLS Parcel Shop, skip`);
      return;
    }

    const { shipmentNumber, partnerId, parcelShopId } = glsMeta;
    if (!shipmentNumber || !partnerId || !parcelShopId) {
      console.warn(`[Webhook] Metadati GLS incompleti per ordine #${orderId}:`, glsMeta);
      return;
    }

    const token = await getGLSToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const body = {
      shipmentNumber,
      tags: {
        PARTNER_SHOP_ID: partnerId,
        SHOP_ID: parcelShopId
      }
    };

    // STEP 5.5 — Add Parcel
    await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/addParcel`,
      body,
      { headers }
    );
    console.log(`[Webhook] AddParcel OK per ordine #${orderId}`);

    // STEP 5.6 — Close Work Day
    await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/closeWorkDay`,
      body,
      { headers }
    );
    console.log(`[Webhook] CloseWorkDay OK per ordine #${orderId}`);

  } catch (err) {
    console.error('[Webhook] Errore elaborazione ordine:', err);
  }
});

export default router;

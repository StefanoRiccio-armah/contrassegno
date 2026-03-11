import axios from 'axios';
import { Request, Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Salva la selezione del Parcel Shop nei metafields dell'ordine BigCommerce.
// Chiamato dal checkout script dopo che l'utente sceglie lo shop.
// I dati salvati qui vengono poi letti dal webhook order-created per
// eseguire AddParcel e CloseWorkDay.
//
// POST /gls/save-shop-selection
// Body: { orderId, partnerId, parcelShopId }
// ─────────────────────────────────────────────────────────────────────────────
export async function saveShopSelection(req: Request, res: Response) {
  try {
    const { orderId, partnerId, parcelShopId, shipmentNumber } = req.body;

    if (!orderId || !partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: '"orderId", "partnerId" e "parcelShopId" sono obbligatori'
      });
    }

    const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

    const metafields = [
      { key: 'gls_partner_id',      value: partnerId,      namespace: 'gls', permission_set: 'write' },
      { key: 'gls_parcel_shop_id',  value: parcelShopId,   namespace: 'gls', permission_set: 'write' },
      ...(shipmentNumber ? [{ key: 'gls_shipment_number', value: shipmentNumber, namespace: 'gls', permission_set: 'write' }] : [])
    ];

    // Crea ogni metafield sull'ordine BigCommerce
    await Promise.all(
      metafields.map(meta =>
        axios.post(
          `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}/metafields`,
          meta,
          {
            headers: {
              'X-Auth-Token': accessToken!,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        )
      )
    );

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore salvataggio metafields BigCommerce:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore salvataggio selezione shop'
      });
    } else if (error instanceof Error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore sconosciuto' });
    }
  }
}

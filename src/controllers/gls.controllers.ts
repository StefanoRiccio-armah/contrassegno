import axios from 'axios';
import { Request, Response } from 'express';
import { getGLSToken } from '../utils/token';
import { glsAddParcel, glsCloseWorkDay } from '../utils/gls-soap';
import { getOrder, getOrderShippingAddress, saveOrderMetafields } from '../utils/bigcommerce';

const GLS_SOAP_URL = 'https://labelservice.gls-italy.com/ilswebservice.asmx';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.1 — Geolocalizzazione indirizzo
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(req: Request, res: Response) {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ success: false, error: 'Il parametro "address" è richiesto' });

    let results = await callNominatim(address as string);
    if (!results?.length) {
      const parts = (address as string).split(',');
      if (parts.length >= 3) {
        results = await callNominatim(parts.slice(-3).join(',').trim());
      }
    }
    if (!results?.length) return res.status(404).json({ success: false, error: 'Indirizzo non trovato' });

    res.status(200).json({
      success: true,
      data: { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), label: results[0].display_name || '' }
    });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

async function callNominatim(query: string) {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: query, format: 'json', limit: 1, countrycodes: 'it' },
    headers: { 'User-Agent': 'gls-parcelshop-dev/1.0' }
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.3 — Verifica dei limiti di spedizione
// ─────────────────────────────────────────────────────────────────────────────
export async function checkLimit(req: Request, res: Response) {
  try {
    const { isCashOnDelivery = false, measures, nOfPackages, pv, weight, plus = false, sprinterList = [], insuranceList = [] } = req.body;
    const token = await getGLSToken();
    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/check/limit`,
      { ca: isCashOnDelivery, cartItemList: [{ measures: [measures], nOfPackages, pv, weight }], plus, sprinterList, insuranceList },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    res.status(200).json({ success: true, data: response.data });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.4 — Ricerca Parcel Shop vicini
// ─────────────────────────────────────────────────────────────────────────────
export async function searchParcelShops(req: Request, res: Response) {
  try {
    const { lat, lng, distance = '10' } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, error: '"lat" e "lng" sono obbligatori' });

    const token = await getGLSToken();
    const response = await axios.get(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/check/shop`,
      { params: { latitude: lat, longitude: lng, 'country-code': 'IT', distance: parseInt(distance as string, 10) }, headers: { Authorization: `Bearer ${token}` } }
    );
    res.status(200).json({ success: true, data: response.data });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.5 — Add Parcel (SOAP) — per test manuali
// ─────────────────────────────────────────────────────────────────────────────
export async function addParcel(req: Request, res: Response) {
  try {
    const { partnerId, parcelShopId, nomeCliente, indirizzo, citta, provincia, cap, pesoReale, colli, email = '', telefono = '' } = req.body;
    if (!partnerId || !parcelShopId) return res.status(400).json({ success: false, error: '"partnerId" e "parcelShopId" sono obbligatori' });

    const shipmentNumber = await glsAddParcel({ partnerId, parcelShopId, nomeCliente, indirizzo, citta, provincia, cap, pesoReale, colli, email, telefono });
    res.status(200).json({ success: true, shipmentNumber });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.6 — Close Work Day (SOAP) — per test manuali
// ─────────────────────────────────────────────────────────────────────────────
export async function closeWorkDay(req: Request, res: Response) {
  try {
    const { shipmentNumber, partnerId, parcelShopId } = req.body;
    if (!shipmentNumber || !partnerId || !parcelShopId) return res.status(400).json({ success: false, error: 'Parametri obbligatori mancanti' });

    await glsCloseWorkDay({ shipmentNumber, partnerId, parcelShopId });
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Save Shop Selection — AddParcel + CloseWorkDay + metafields BigCommerce
// ─────────────────────────────────────────────────────────────────────────────
export async function saveShopSelection(req: Request, res: Response) {
  console.log('[saveShopSelection] Body ricevuto:', req.body);
  try {
    const { orderId, partnerId, parcelShopId } = req.body;
    if (!orderId || !partnerId || !parcelShopId) return res.status(400).json({ success: false, error: 'Parametri obbligatori mancanti' });

    // 1. Dati ordine da BigCommerce
    const [order, shipping] = await Promise.all([
      getOrder(orderId),
      getOrderShippingAddress(orderId)
    ]);
    const addr = shipping || order.billing_address;

    // 2. AddParcel GLS
    const shipmentNumber = await glsAddParcel({
      nomeCliente: `${addr.first_name} ${addr.last_name}`,
      indirizzo: `${addr.street_1}${addr.street_2 ? ' ' + addr.street_2 : ''}`,
      citta: addr.city,
      provincia: addr.state || '',
      cap: addr.zip,
      email: addr.email || order.billing_address?.email || '',
      telefono: addr.phone || order.billing_address?.phone || '',
      pesoReale: parseFloat(order.total_weight) || 1,
      colli: parseInt(order.items_total) || 1,
      parcelShopId,
      partnerId
    });
    console.log(`[saveShopSelection] AddParcel OK — shipmentNumber: ${shipmentNumber}`);

    // 3. CloseWorkDay GLS
    await glsCloseWorkDay({ shipmentNumber, parcelShopId, partnerId });
    console.log(`[saveShopSelection] CloseWorkDay OK — shipmentNumber: ${shipmentNumber}`);

    // 4. Salva metafields BigCommerce
    await saveOrderMetafields(orderId, [
      { key: 'gls_partner_id', value: partnerId, namespace: 'gls', permission_set: 'read_and_sf_access' },
      { key: 'gls_parcel_shop_id', value: parcelShopId, namespace: 'gls', permission_set: 'read_and_sf_access' },
      { key: 'gls_shipment_number', value: shipmentNumber, namespace: 'gls', permission_set: 'read_and_sf_access' },
    ]);

    res.status(200).json({ success: true, shipmentNumber });

  } catch (error: unknown) {
    handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper errori centralizzato
// ─────────────────────────────────────────────────────────────────────────────
function handleError(res: Response, error: unknown) {
  if (axios.isAxiosError(error)) {
    console.error('Errore Axios:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ success: false, error: error.response?.data?.message || error.message });
  } else if (error instanceof Error) {
    res.status(500).json({ success: false, error: error.message });
  } else {
    res.status(500).json({ success: false, error: 'Errore sconosciuto' });
  }
}
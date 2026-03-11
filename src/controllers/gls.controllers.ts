import axios from 'axios';
import { Request, Response } from 'express';
import { getGLSToken } from '../utils/token';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.1 — Geolocalizzazione indirizzo
// Converte un indirizzo testuale in coordinate lat/lng tramite HERE o Google.
// Usato prima di searchParcelShops per ottenere le coordinate da passare alla ricerca.
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(req: Request, res: Response) {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Il parametro "address" è richiesto'
      });
    }

    // Usa HERE Geocoding API (alternativa: Google Maps Geocoding API)
    const response = await axios.get(
      'https://geocode.search.hereapi.com/v1/geocode',
      {
        params: {
          q: address,
          apiKey: process.env.HERE_API_KEY
        }
      }
    );

    const items = response.data?.items;
    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Indirizzo non trovato'
      });
    }

    const { lat, lng } = items[0].position;

    res.status(200).json({
      success: true,
      data: {
        lat,
        lng,
        label: items[0].address?.label || ''
      }
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore geocoding HERE:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la geolocalizzazione'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico geocoding:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore sconosciuto geocoding' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.3 — Verifica dei limiti di spedizione
// Verifica che peso, dimensioni e opzioni del pacco siano compatibili
// con la spedizione verso un GLS Parcel Shop.
// POST /gls/check-limit
// Body: { isCashOnDelivery, measures, nOfPackages, pv, weight, plus, sprinterList, insuranceList }
// ─────────────────────────────────────────────────────────────────────────────
export async function checkLimit(req: Request, res: Response) {
  try {
    const {
      isCashOnDelivery = false,
      measures,
      nOfPackages,
      pv,
      weight,
      plus = false,
      sprinterList = [],
      insuranceList = []
    } = req.body;

    const token = await getGLSToken();

    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/check/limit`,
      {
        ca: isCashOnDelivery,   // "ca" = contrassegno (cash on delivery)
        measures,
        nOfPackages,
        pv,
        weight,
        plus,
        sprinterList,
        insuranceList
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore verifica limiti GLS:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la verifica dei limiti di spedizione'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico verifica limiti GLS:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante la verifica dei limiti di spedizione' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.4 — Ricerca Parcel Shop vicini all'indirizzo geolocalizzato
// Restituisce i 20 GLS Parcel Shop più vicini alle coordinate fornite.
// GET /gls/parcelshops?lat=...&lng=...&distance=10
// FIX: endpoint corretto è /v1/check/shop (non /v1/parcelshoppes)
// ─────────────────────────────────────────────────────────────────────────────
export async function searchParcelShops(req: Request, res: Response) {
  try {
    const { lat, lng, distance = '10' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '"lat" e "lng" sono parametri obbligatori'
      });
    }

    const token = await getGLSToken();

    // ENDPOINT CORRETTO: /v1/check/shop (con Query Params, metodo GET)
    // Ref: MU407 §5.4 Fig. 5-6
    const response = await axios.get(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/check/shop`,
      {
        params: {
          latitude: lat,
          longitude: lng,
          'country-code': 'IT',
          distance: parseInt(distance as string, 10)
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // La risposta è un array di shop, ognuno con:
    // partnerId, parcelShopId, name, address, coordinates, openingDays/hours
    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore ricerca Parcel Shop GLS:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la ricerca dei Parcel Shop'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico ricerca Parcel Shop GLS:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante la ricerca dei Parcel Shop' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.5 — Add Parcel
// Registra la spedizione associandola al Parcel Shop scelto dall'utente.
// I tag PARTNER_SHOP_ID e SHOP_ID identificano univocamente lo shop nei sistemi GLS.
// POST /gls/add-parcel
// Body: { shipmentNumber, partnerId, parcelShopId }
// ─────────────────────────────────────────────────────────────────────────────
export async function addParcel(req: Request, res: Response) {
  try {
    const { shipmentNumber, partnerId, parcelShopId } = req.body;

    if (!shipmentNumber || !partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: '"shipmentNumber", "partnerId" e "parcelShopId" sono obbligatori'
      });
    }

    const token = await getGLSToken();

    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/addParcel`,
      {
        shipmentNumber,
        tags: {
          PARTNER_SHOP_ID: partnerId,   // es. "GLS_IT" o "PRP_IT"
          SHOP_ID: parcelShopId          // id univoco dello shop
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in addParcel GLS:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante addParcel'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico addParcel GLS:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante addParcel' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.6 — Close Work Day
// Chiude e trasmette la spedizione alla sede GLS di competenza.
// DEVE essere chiamato dopo addParcel per completare il flusso.
// POST /gls/close-work-day
// Body: { shipmentNumber, partnerId, parcelShopId }
// FIX: endpoint corretto è /v1/closeWorkDay (non /v1/addParcel come nella versione precedente)
// ─────────────────────────────────────────────────────────────────────────────
export async function closeWorkDay(req: Request, res: Response) {
  try {
    const { shipmentNumber, partnerId, parcelShopId } = req.body;

    if (!shipmentNumber || !partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: '"shipmentNumber", "partnerId" e "parcelShopId" sono obbligatori'
      });
    }

    const token = await getGLSToken();

    // ENDPOINT CORRETTO: /v1/closeWorkDay
    // FIX rispetto alla versione precedente che usava /v1/addParcel per errore
    // Ref: MU407 §5.6 Fig. 8
    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/closeWorkDay`,
      {
        shipmentNumber,
        tags: {
          PARTNER_SHOP_ID: partnerId,
          SHOP_ID: parcelShopId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in closeWorkDay GLS:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante closeWorkDay'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico closeWorkDay GLS:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante closeWorkDay' });
    }
  }
}

import axios from 'axios';
import { Request, Response } from 'express';
import { getGLSToken } from '../utils/token';
import { config } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.1 — Geolocalizzazione indirizzo
// Converte un indirizzo testuale in coordinate lat/lng tramite HERE o Google.
// Usato prima di searchParcelShops per ottenere le coordinate da passare alla ricerca.
// ─────────────────────────────────────────────────────────────────────────────
/*
export async function geocodeAddress(req: Request, res: Response) {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Il parametro "address" è richiesto'
      });
    }


   const response = await axios.get(
  'https://maps.googleapis.com/maps/api/geocode/json',
  {
    params: {
      address,
      key: config.google.mapsApiKey,
      region: 'it'
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
*/

//sopra c'è funzione di geocoding con google API
export async function geocodeAddress(req: Request, res: Response) {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Il parametro "address" è richiesto'
      });
    }

    // Tenta geocoding con indirizzo completo
    let results = await callNominatim(address as string);

    // Fallback: prova solo con le ultime parti (città, CAP, IT)
    if (!results || results.length === 0) {
      const parts = (address as string).split(',');
      if (parts.length >= 3) {
        const fallback = parts.slice(-3).join(',').trim();
        console.log('[Geocoding] Fallback con:', fallback);
        results = await callNominatim(fallback);
      }
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Indirizzo non trovato'
      });
    }

    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);

    res.status(200).json({
      success: true,
      data: {
        lat,
        lng,
        label: results[0].display_name || ''
      }
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore geocoding Nominatim:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la geolocalizzazione'
      });
    } else if (error instanceof Error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore sconosciuto geocoding' });
    }
  }
}

// Helper per chiamare Nominatim
async function callNominatim(query: string) {
  const response = await axios.get(
    'https://nominatim.openstreetmap.org/search',
    {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: 'it'
      },
      headers: {
        'User-Agent': 'gls-parcelshop-dev/1.0'
      }
    }
  );
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.3 — Verifica dei limiti di spedizione
// Verifica che peso, dimensioni e opzioni del pacco siano compatibili
// con la spedizione verso un GLS Parcel Shop.
// POST /gls/check-limit
// Body: { isCashOnDelivery, measures, nOfPackages, pv, weight, plus, sprinterList, insuranceList }
// ─────────────────────────────────────────────────────────────────────────────
export async function checkLimit(req: Request, res: Response) {
  console.log('[checkLimit] Body ricevuto:', JSON.stringify(req.body));
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
        ca: isCashOnDelivery,         // contrassegno — "ca" è il nome GLS
        cartItemList: [               // struttura richiesta dal PDF §5.3 Fig. 4
          {
            measures: [
              {
                depth: measures?.depth,
                height: measures?.height,
                length: measures?.length
              }
            ],
            nOfPackages,
            pv,
            weight
          }
        ],
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

const GLS_SOAP_URL = 'https://labelservice.gls-italy.com/ilswebservice.asmx';
export async function addParcel(req: Request, res: Response) {
  try {
    const { partnerId, parcelShopId, nomeCliente, indirizzo, citta, provincia, cap, pesoReale, colli } = req.body;

    if (!partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: '"partnerId" e "parcelShopId" sono obbligatori'
      });
    }

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <AddParcel xmlns="https://labelservice.gls-italy.com/">
      <XMLInfoParcel><![CDATA[
        <Info>
          <SedeGls>${process.env.GLS_SEDE_GLS}</SedeGls>
          <CodiceClienteGls>${process.env.GLS_CODICE_CLIENTE}</CodiceClienteGls>
          <PasswordClienteGls>${process.env.GLS_PASSWORD_CLIENTE}</PasswordClienteGls>
          <Parcel>
            <CodiceContrattoGls>${process.env.GLS_CODICE_CONTRATTO}</CodiceContrattoGls>
            <RagioneSociale>${nomeCliente}</RagioneSociale>
            <Indirizzo>${indirizzo}</Indirizzo>
            <Localita>${citta}</Localita>
            <Provincia>${provincia}</Provincia>
            <Zipcode>${cap}</Zipcode>
            <Colli>${colli || 1}</Colli>
            <PesoReale>${pesoReale || 1}</PesoReale>
            <TipoSpedizione>N</TipoSpedizione>
            <TipoPorto>F</TipoPorto>
            <TipoCollo>0</TipoCollo>
            <SHOP_ID>${parcelShopId}</SHOP_ID>
            <PARTNER_SHOP_ID>${partnerId}</PARTNER_SHOP_ID>
            <GeneraPDF>S</GeneraPDF>
            <ContatoreProgressivo>9999</ContatoreProgressivo>
          </Parcel>
        </Info>
      ]]></XMLInfoParcel>
    </AddParcel>
  </soap12:Body>
</soap12:Envelope>`;

    const response = await axios.post(GLS_SOAP_URL, soapBody, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'https://labelservice.gls-italy.com/AddParcel'
      }
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in addParcel SOAP:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data || 'Errore durante addParcel'
      });
    } else if (error instanceof Error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante addParcel' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.6 — Close Work Day (SOAP)
// Chiude e trasmette la spedizione alla sede GLS di competenza.
// DEVE essere chiamato dopo addParcel.
// POST /gls/close-work-day
// Body: { shipmentNumber, partnerId, parcelShopId }
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

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CloseWorkDayByShipmentNumber xmlns="https://labelservice.gls-italy.com/">
      <lab:xmlRequest>
        <![CDATA[
        <Info>
          <CodiceClienteGls>${process.env.GLS_CODICE_CLIENTE}</CodiceClienteGls>
          <PasswordClienteGls>${process.env.GLS_PASSWORD_CLIENTE}</PasswordClienteGls>
          <Parcel>
            <NumeroDiSpedizioneGLSdaConfermare>${shipmentNumber}</NumeroDiSpedizioneGLSdaConfermare>
            <CloseWorkDayResult>0</CloseWorkDayResult>
            <SHOP_ID>${parcelShopId}</SHOP_ID>
            <PARTNER_SHOP_ID>${partnerId}</PARTNER_SHOP_ID>
          </Parcel>
        </Info>
        ]]>
      </lab:xmlRequest>
    </CloseWorkDayByShipmentNumber>
  </soap12:Body>
</soap12:Envelope>`;

    const response = await axios.post(GLS_SOAP_URL, soapBody, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'https://labelservice.gls-italy.com/CloseWorkDayByShipmentNumber'
      }
    });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in closeWorkDay SOAP:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data || 'Errore durante closeWorkDay'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico closeWorkDay:', error.message);
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Errore durante closeWorkDay' });
    }
  }
}

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
// webhook.routes.ts — versione corretta con SOAP per addParcel e closeWorkDay

import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';


const router = Router();
const GLS_SOAP_URL = 'https://labelservice.gls-italy.com/ilswebservice.asmx';

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.BIGCOMMERCE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] BIGCOMMERCE_WEBHOOK_SECRET non configurato, skip verifica firma');
    return true;
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function getOrderGLSMeta(orderId: number): Promise<{
  partnerId?: string;
  parcelShopId?: string;
  // shipmentNumber non serve più: viene generato da addParcel SOAP
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
    const meta: Record<string, string> = {};
    (response.data as Array<{ key: string; value: string }>)
      .forEach(m => { meta[m.key] = m.value; });

    if (!meta.gls_partner_id || !meta.gls_parcel_shop_id) return null;

    return {
      partnerId: meta.gls_partner_id,
      parcelShopId: meta.gls_parcel_shop_id
    };
  } catch (err) {
    console.error('[Webhook] Errore lettura metafields:', err);
    return null;
  }
}

// Recupera i dati dell'ordine BigCommerce (indirizzo, peso, colli)
async function getOrderData(orderId: number) {
  const response = await axios.get(
    `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}/v2/orders/${orderId}`,
    {
      headers: {
        'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN!,
        'Accept': 'application/json'
      }
    }
  );
  return response.data;
}

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
    if (!orderId) return;

    console.log(`[Webhook] Ordine ricevuto: #${orderId}`);

    const glsMeta = await getOrderGLSMeta(orderId);
    if (!glsMeta) {
      console.log(`[Webhook] Ordine #${orderId} non è GLS Parcel Shop, skip`);
      return;
    }

    const { partnerId, parcelShopId } = glsMeta;
    const order = await getOrderData(orderId);

    // Dati spedizione dall'ordine BigCommerce
    const shipping = order.billing_address; // o shipping_address se disponibile
    const nomeCliente = `${shipping.first_name} ${shipping.last_name}`;
    const indirizzo = shipping.street_1;
    const civico = shipping.street_2 || '';
    const citta = shipping.city;
    const provincia = shipping.state || '';
    const cap = shipping.zip;
    const pesoReale = parseFloat(order.total_weight) || 1;
    const colli = parseInt(order.items_total) || 1;

    // ── STEP 5.5 — AddParcel SOAP ──────────────────────────────────────────
    const addParcelXml = `<?xml version="1.0" encoding="utf-8"?>
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
            <Indirizzo>${indirizzo} ${civico}</Indirizzo>
            <Localita>${citta}</Localita>
            <Provincia>${provincia}</Provincia>
            <Zipcode>${cap}</Zipcode>
            <Colli>${colli}</Colli>
            <PesoReale>${pesoReale}</PesoReale>
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

    const addParcelResponse = await axios.post(GLS_SOAP_URL, addParcelXml, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'https://labelservice.gls-italy.com/AddParcel'
      }
    });
    console.log(`[Webhook] AddParcel OK per ordine #${orderId}`);

    // Estrai il numero spedizione dalla risposta XML di addParcel
    const shipmentMatch = addParcelResponse.data.match(
      /<NumeroDiSpedizioneGLS>(.*?)<\/NumeroDiSpedizioneGLS>/
    );
    const shipmentNumber = shipmentMatch?.[1];
    if (!shipmentNumber) {
      console.error('[Webhook] Numero spedizione non trovato nella risposta addParcel');
      return;
    }

    // ── STEP 5.6 — CloseWorkDay SOAP ──────────────────────────────────────
    const closeWorkDayXml = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CloseWorkDayByShipmentNumber xmlns="https://labelservice.gls-italy.com/">
      <lab:xmlRequest><![CDATA[
        <Info>
          <SedeGls>${process.env.GLS_SEDE_GLS}</SedeGls>
          <CodiceClienteGls>${process.env.GLS_CODICE_CLIENTE}</CodiceClienteGls>
          <PasswordClienteGls>${process.env.GLS_PASSWORD_CLIENTE}</PasswordClienteGls>
          <Parcel>
            <NumeroDiSpedizioneGLSdaConfermare>${shipmentNumber}</NumeroDiSpedizioneGLSdaConfermare>
            <CloseWorkDayResult>0</CloseWorkDayResult>
            <SHOP_ID>${parcelShopId}</SHOP_ID>
            <PARTNER_SHOP_ID>${partnerId}</PARTNER_SHOP_ID>
          </Parcel>
        </Info>
      ]]></lab:xmlRequest>
    </CloseWorkDayByShipmentNumber>
  </soap12:Body>
</soap12:Envelope>`;

    await axios.post(GLS_SOAP_URL, closeWorkDayXml, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'https://labelservice.gls-italy.com/CloseWorkDayByShipmentNumber'
      }
    });
    console.log(`[Webhook] CloseWorkDay OK per ordine #${orderId}, spedizione: ${shipmentNumber}`);

  } catch (err) {
    console.error('[Webhook] Errore elaborazione ordine:', err);
  }
});

export default router;
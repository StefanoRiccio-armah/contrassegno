import axios from 'axios';

const GLS_SOAP_URL = 'https://labelservice.gls-italy.com/ilswebservice.asmx';

export async function glsAddParcel(params: {
  nomeCliente: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  cap: string;
  email: string;
  telefono: string;
  colli: number;
  pesoReale: number;
  parcelShopId: string;
  partnerId: string;
}): Promise<string> {
  const soapBody =
  `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
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
            <RagioneSociale>${params.nomeCliente}</RagioneSociale>
            <Indirizzo>${params.indirizzo}</Indirizzo>
            <Localita>${params.citta}</Localita>
            <Provincia>${params.provincia}</Provincia>
            <Zipcode>${params.cap}</Zipcode>
            <EMail>${params.email}</EMail>
            <Cellulare>${params.telefono}</Cellulare>
            <Colli>${params.colli}</Colli>
            <PesoReale>${params.pesoReale}</PesoReale>
            <TipoSpedizione>N</TipoSpedizione>
            <TipoPorto>F</TipoPorto>
            <TipoCollo>0</TipoCollo>
            <SHOP_ID>${params.parcelShopId}</SHOP_ID>
            <PARTNER_SHOP_ID>${params.partnerId}</PARTNER_SHOP_ID>
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

  const match = response.data.match(/<NumeroSpedizione>(.*?)<\/NumeroSpedizione>/);
  if (!match?.[1]) {
    throw new Error(`AddParcel: numero spedizione non trovato. Risposta: ${response.data}`);
  }

  return match[1];
}

export async function glsCloseWorkDay(params: {
  shipmentNumber: string;
  parcelShopId: string;
  partnerId: string;
}): Promise<void> {
  const soapBody =
   `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <CloseWorkDayByShipmentNumber xmlns="https://labelservice.gls-italy.com/">
      <_xmlRequest><![CDATA[<Info>
<SedeGls>${process.env.GLS_SEDE_GLS}</SedeGls>
<CodiceClienteGls>${process.env.GLS_CODICE_CLIENTE}</CodiceClienteGls>
<PasswordClienteGls>${process.env.GLS_PASSWORD_CLIENTE}</PasswordClienteGls>
<CloseWorkDayResult>0</CloseWorkDayResult>
<Parcel>
<NumeroDiSpedizioneGLSdaConfermare>${params.shipmentNumber}</NumeroDiSpedizioneGLSdaConfermare>
<SHOP_ID>${params.parcelShopId}</SHOP_ID>
<PARTNER_SHOP_ID>${params.partnerId}</PARTNER_SHOP_ID>
</Parcel>
</Info>]]></_xmlRequest>
    </CloseWorkDayByShipmentNumber>
  </soap12:Body>
</soap12:Envelope>`;

  await axios.post(GLS_SOAP_URL, soapBody, {
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'https://labelservice.gls-italy.com/CloseWorkDayByShipmentNumber'
    }
  });
}
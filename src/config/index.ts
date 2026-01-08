import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || '3000',

  bigCommerce: {
    storeHash: process.env.BIGCOMMERCE_STORE_HASH,
    accessToken: process.env.BIGCOMMERCE_ACCESS_TOKEN,
  },

  // --- SEZIONE MODIFICATA ---
  payment: {
    codProviderId: process.env.COD_PROVIDER_ID,
    feeAmount: parseFloat(process.env.FEE_AMOUNT || '5'),

    // MODIFICA 1: 'feeName' ora punta al nome INTERNO. 
    // Questo nome non cambia e viene usato per la logica di cancellazione.
    feeName: process.env.FEE_INTERNAL_NAME || 'COD Fee',

    // MODIFICA 2: Aggiunto un oggetto per contenere i nomi visualizzati (traduzioni).
    // Questi sono i testi che vedrà l'utente nel checkout.
    feeDisplayNames: {
      it: process.env.FEE_NAME_IT || 'Contrassegno',
      en: process.env.FEE_NAME_EN || 'Cash on Delivery',
      // Se aggiungi altre lingue nel file .env, aggiungile anche qui.
    }
  },
  // --- FINE SEZIONE MODIFICATA ---

  cfApi: {
    clientId: process.env.CF_CLIENT_ID,
    clientSecret: process.env.CF_CLIENT_SECRET,
    baseUrl: process.env.CF_API_URL,
    apiKey: process.env.CF_API_KEY,
    timeout: parseInt(process.env.CF_API_TIMEOUT || '3000', 10)
  },

  registroImprese: {
    baseUrl: process.env.REGISTRO_IMPRESE_API_URL,
    authToken: process.env.REGISTRO_IMPRESE_AUTH_TOKEN,
  }
};

// Il tuo controllo di validazione rimane invariato
if (!config.registroImprese.baseUrl || !config.registroImprese.authToken) {
    console.error("ERRORE: Variabili d'ambiente per l'API Registro Imprese non impostate!");
    process.exit(1);
}
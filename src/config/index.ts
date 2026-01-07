import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || '3000',

  bigCommerce: {
    storeHash: process.env.BIGCOMMERCE_STORE_HASH,
    accessToken: process.env.BIGCOMMERCE_ACCESS_TOKEN,
  },

  payment: {
    codProviderId: process.env.COD_PROVIDER_ID,
    feeName: process.env.FEE_NAME || 'Costo Contrassegno',
    feeAmount: parseFloat(process.env.FEE_AMOUNT || '5'),
  },

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

// Aggiungiamo un controllo di validazione per le nuove variabili
if (!config.registroImprese.baseUrl || !config.registroImprese.authToken) {
    console.error("ERRORE: Variabili d'ambiente per l'API Registro Imprese non impostate!");
    process.exit(1);
}

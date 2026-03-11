// index.ts (versione aggiornata)

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
    feeAmount: parseFloat(process.env.FEE_AMOUNT || '5'),
    feeName: process.env.FEE_INTERNAL_NAME || 'COD Fee',
    feeDisplayNames: {
      it: process.env.FEE_NAME_IT || 'Contrassegno',
      en: process.env.FEE_NAME_EN || 'Cash on Delivery',
    }
  },
};
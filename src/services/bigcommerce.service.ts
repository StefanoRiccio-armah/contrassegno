import axios from 'axios';
import { config } from '../config';

// Creiamo un'istanza di axios pre-configurata
const bigCommerceApi = axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${config.bigCommerce.storeHash}`,
    headers: { 
        'X-Auth-Token': config.bigCommerce.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Tipizzazione per chiarezza
interface CheckoutFee {
    id: string;
    name: string;
}

// Funzione per recuperare il checkout con le sue fee
export const getCheckoutWithFees = async (checkoutId: string) => {
    const response = await bigCommerceApi.get<{ data?: { fees?: CheckoutFee[] } }>(
        `/v3/checkouts/${checkoutId}?include=fees`
    );
    return response.data.data;
};

// Funzione per cancellare le fee
export const deleteFeesFromCheckout = async (checkoutId: string, feeIds: string[]) => {
    if (feeIds.length === 0) return;
    return bigCommerceApi.delete(`/v3/checkouts/${checkoutId}/fees`, {
        data: { ids: feeIds }
    });
};

// Funzione per aggiungere la fee di contrassegno
export const addCodFeeToCheckout = async (checkoutId: string, language: string) => {
    const displayName = (config.payment.feeDisplayNames as Record<string, string>)[language] 
    || config.payment.feeDisplayNames.en;

    const feeRequestBody = {
        type: 'custom_fee',
        name: config.payment.feeName, 
        display_name: displayName,
        cost: config.payment.feeAmount,
        source: 'custom'
    };

    // Aggiungo un log per debugging, così puoi vedere esattamente cosa viene inviato a BigCommerce
    console.log(`[${checkoutId}] Corpo della fee da inviare (lingua: ${language}):`, JSON.stringify(feeRequestBody, null, 2));

    return bigCommerceApi.post(`/v3/checkouts/${checkoutId}/fees`, { fees: [feeRequestBody] });
};
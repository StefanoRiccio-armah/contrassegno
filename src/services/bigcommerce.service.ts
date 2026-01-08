import axios from 'axios';
import { config } from '../config';

// Creiamo un'istanza di axios pre-configurata (INVARIATO)
const bigCommerceApi = axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${config.bigCommerce.storeHash}`,
    headers: { 
        'X-Auth-Token': config.bigCommerce.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Tipizzazione per chiarezza (INVARIATO)
interface CheckoutFee {
    id: string;
    name: string;
}

// Funzione per recuperare il checkout con le sue fee (INVARIATO)
export const getCheckoutWithFees = async (checkoutId: string) => {
    const response = await bigCommerceApi.get<{ data?: { fees?: CheckoutFee[] } }>(
        `/v3/checkouts/${checkoutId}?include=fees`
    );
    return response.data.data;
};

// Funzione per cancellare le fee (INVARIATO)
export const deleteFeesFromCheckout = async (checkoutId: string, feeIds: string[]) => {
    if (feeIds.length === 0) return;
    return bigCommerceApi.delete(`/v3/checkouts/${checkoutId}/fees`, {
        data: { ids: feeIds }
    });
};


// --- SEZIONE MODIFICATA ---

// Funzione per aggiungere la fee di contrassegno
export const addCodFeeToCheckout = async (checkoutId: string, language: string) => {
    
    // MODIFICA 1: Logica per selezionare la traduzione corretta.
    // Cerca la lingua richiesta (es. 'it') nell'oggetto di configurazione.
    // Se non la trova, utilizza l'inglese ('en') come opzione di riserva (fallback).
    const displayName = 
        (config.payment.feeDisplayNames as Record<string, string>)[language] 
        || config.payment.feeDisplayNames.en;

    const feeRequestBody = {
        type: 'custom_fee',
        
        // MODIFICA 2: 'name' usa il nome INTERNO dalla config (es. "COD Fee").
        // Questo è fondamentale per la logica di CANCELLAZIONE, perché non cambia mai.
        name: config.payment.feeName, 
        
        // MODIFICA 3: 'display_name' usa il testo TRADOTTO (es. "Contrassegno" o "Cash on Delivery").
        // Questo è il testo che l'utente finale vedrà nel checkout.
        display_name: displayName,

        cost: config.payment.feeAmount,
        source: 'custom'
    };

    // Aggiungo un log per debugging, così puoi vedere esattamente cosa viene inviato a BigCommerce
    console.log(`[${checkoutId}] Corpo della fee da inviare (lingua: ${language}):`, JSON.stringify(feeRequestBody, null, 2));

    return bigCommerceApi.post(`/v3/checkouts/${checkoutId}/fees`, { fees: [feeRequestBody] });
};
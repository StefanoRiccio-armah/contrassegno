import type { Request, Response } from 'express';
import * as BigCommerceService from '../services/bigcommerce.service';
import { config } from '../config';

export const handlePaymentChange = async (req: Request, res: Response) => {
    // Estraiamo 'language' dal corpo della richiesta.
    const { checkoutId, selectedPaymentMethodId, language = 'it' } = req.body;

    // Aggiorniamo il log per includere la lingua, utile per il debug.
    console.log(`[${checkoutId}] Richiesta per metodo: ${selectedPaymentMethodId}, Lingua: ${language}`);

    if (!checkoutId) {
        return res.status(400).json({ message: 'checkoutId è richiesto.' });
    }

    try {
        // PASSO 1: Usa il service per recuperare le fee
        const checkout = await BigCommerceService.getCheckoutWithFees(checkoutId);
        const existingFees = checkout?.fees || [];
        console.log(`[${checkoutId}] Fees esistenti:`, JSON.stringify(existingFees, null, 2));

        // PASSO 2: PULIZIA
        // Questo filtro funzionerà correttamente indipendentemente dalla lingua visualizzata all'utente.
        const feesToDelete = existingFees
            .filter(fee => fee.name === config.payment.feeName)
            .map(fee => fee.id);
        
        if (feesToDelete.length > 0) {
            console.log(`[${checkoutId}] Rimuovo le fee esistenti con ID:`, feesToDelete);
            await BigCommerceService.deleteFeesFromCheckout(checkoutId, feesToDelete);
        }

        // PASSO 3: AGGIUNTA CONDIZIONALE
        if (selectedPaymentMethodId === config.payment.codProviderId) {
            console.log(`[${checkoutId}] Aggiungo la fee per il contrassegno.`);
            
            // Passiamo la variabile 'language' al service.
            // Il service ora sa quale traduzione utilizzare.
            await BigCommerceService.addCodFeeToCheckout(checkoutId, language);

        } else {
            console.log(`[${checkoutId}] Nessuna fee da aggiungere.`);
        }

        res.status(200).json({ message: 'Fee aggiornata con successo.' });

    } catch (error: any) {
        const bcError = error.response?.data;
        console.error(`[${checkoutId}] Errore API BigCommerce:`, JSON.stringify(bcError, null, 2) || error.message);
        res.status(500).json({
            message: 'Errore durante l-aggiornamento della fee.',
            error: bcError || { detail: error.message },
        });
    }
};
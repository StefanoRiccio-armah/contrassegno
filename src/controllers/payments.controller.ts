import type { Request, Response } from 'express';
import * as BigCommerceService from '../services/bigcommerce.service';
import { config } from '../config';

export const handlePaymentChange = async (req: Request, res: Response) => {
    const { checkoutId, selectedPaymentMethodId } = req.body;

    console.log(`[${checkoutId}] Richiesta per metodo: ${selectedPaymentMethodId}`);

    if (!checkoutId) {
        return res.status(400).json({ message: 'checkoutId è richiesto.' });
    }

    try {
        // PASSO 1: Usa il service per recuperare le fee
        const checkout = await BigCommerceService.getCheckoutWithFees(checkoutId);
        const existingFees = checkout?.fees || [];
        console.log(`[${checkoutId}] Fees esistenti:`, JSON.stringify(existingFees, null, 2));

        // PASSO 2: PULIZIA - Trova e cancella le fee precedenti
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
            await BigCommerceService.addCodFeeToCheckout(checkoutId);
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
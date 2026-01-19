// controllers/vatController.ts
import { Request, Response } from 'express';
import { validateVatEU } from '@salespark/validate-vat-eu';

export const validateVat = async (req: Request, res: Response) => {
    let { countryCode, vatNumber } = req.body;

    if (!countryCode || !vatNumber) {
        return res.status(400).json({ error: 'countryCode e vatNumber richiesti' });
    }

    try {
        countryCode = countryCode.trim().toUpperCase();
        vatNumber = vatNumber.replace(/\s+/g, '').replace(/[^0-9A-Z]/gi, ''); // solo caratteri alfanumerici

        // Se l'utente ha messo prefisso paese dentro vatNumber, lo rimuoviamo
        if (vatNumber.toUpperCase().startsWith(countryCode)) {
            vatNumber = vatNumber.substring(2);
        }

        const result = await validateVatEU(countryCode, vatNumber);

        res.json({
            valid: result.valid,
            name: result.name,
            address: result.address,
        });
    } catch (err) {
        console.error('Errore durante la validazione della partita IVA:', err);
        res.status(500).json({ error: 'Errore durante la validazione VAT' });
    }
};

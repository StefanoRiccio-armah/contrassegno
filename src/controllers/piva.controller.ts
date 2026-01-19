// src/controllers/piva.controller.ts

import { Request, Response } from 'express';
import { getCompanyDetailsByPiva } from '../services/openapi.service'; // Importiamo la nostra funzione dal service

/**
 * Gestisce la richiesta HTTP per la verifica di una Partita IVA.
 */
export const verifyPivaController = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Estraiamo il parametro 'piva' dall'URL della richiesta
        const { piva } = req.params;

        if (!piva) {
            res.status(400).json({ message: 'Partita IVA non fornita.' });
            return;
        }

        // 2. Chiamiamo il service per ottenere i dati
        const companyData = await getCompanyDetailsByPiva(piva);

        // 3. Inviamo la risposta HTTP in base al risultato del service
        if (companyData) {
            // Successo: abbiamo trovato l'azienda
            res.status(200).json(companyData);
        } else {
            // Fallimento: il service ha restituito null (azienda non trovata o errore API)
            res.status(404).json({ message: `Nessuna informazione trovata per la Partita IVA: ${piva}` });
        }
    } catch (error) {
        // Gestiamo eventuali errori imprevisti nel controller stesso
        console.error('Errore nel PIVA Controller:', error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
};
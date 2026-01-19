// src/services/openapi.service.ts

import axios from 'axios';
import { config } from '../config'; // Importiamo la nostra configurazione centralizzata

// Controlliamo subito che le configurazioni essenziali esistano.
// Se mancano, l'applicazione non deve nemmeno partire.
if (!config.openapi.apiKey || !config.openapi.baseUrl) {
    throw new Error("Le configurazioni per Openapi (apiKey, baseUrl) non sono state trovate!");
}

/**
 * Recupera i dettagli completi di un'azienda data la sua Partita IVA.
 * @param piva - La Partita IVA italiana da verificare.
 * @returns L'oggetto con i dati dell'azienda, oppure null se non trovata o in caso di errore.
 */
export const getCompanyDetailsByPiva = async (piva: string): Promise<any | null> => {
    // 1. Costruiamo l'URL completo usando le variabili di configurazione
    // QUESTA È LA RIGA CORRETTA
const apiUrl = `${config.openapi.baseUrl}/IT-full/${piva}`;

    try {
        // 2. Eseguiamo la chiamata API con Axios
        const response = await axios.get(apiUrl, {
            headers: {
                // Usiamo la chiave API dalla nostra configurazione
                'x-api-key': config.openapi.apiKey,
            }
        });

        // 3. Se la chiamata ha successo (status 200-299), restituiamo i dati
        return response.data;

    } catch (error) {
        // 4. Gestiamo gli errori in modo pulito
        if (axios.isAxiosError(error)) {
            // Se l'errore è specifico di Axios (es. 404 Not Found, 401 Unauthorized)
            console.error(`Errore API da Openapi [${error.response?.status}]:`, error.response?.data);
        } else {
            // Per qualsiasi altro tipo di errore
            console.error('Errore imprevisto durante la chiamata a Openapi:', error);
        }
        return null; // Restituiamo null per segnalare al controller che l'operazione è fallita
    }
};
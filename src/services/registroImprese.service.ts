// src/services/registroImprese.service.ts
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// Definiamo un'interfaccia per la risposta che ci aspettiamo
// NOTA: I nomi dei campi sono ipotetici! Adattali alla documentazione reale.
export interface CompanyData {
    ragioneSociale: string | null;
    partitaIva: string;
    codiceFiscale: string | null;
    pec: string | null;
    codiceSdi: string | null;
    indirizzoCompleto: string | null;
    statoAttivita: string | null;
}

// Creiamo un'istanza di axios pre-configurata
const registroImpreseApi: AxiosInstance = axios.create({
    // Aggiungiamo l'operatore '!' per asserire che baseUrl non è undefined
    baseURL: config.registroImprese.baseUrl!, 
    headers: { 
        // Aggiungiamo '!' anche qui per coerenza e sicurezza
        'Authorization': `Bearer ${config.registroImprese.authToken!}`,
        'Content-Type': 'application/json',
    }
});

/**
 * Interroga l'API del Registro Imprese per ottenere dati aziendali da una P.IVA.
 * @param {string} piva - Il numero di Partita IVA da cercare.
 * @returns {Promise<CompanyData>} I dati dell'azienda.
 */
export const getCompanyDataByVat = async (piva: string): Promise<CompanyData> => {
    // La documentazione del fornitore specificherà l'endpoint esatto e il body
    // Ipotizziamo sia un POST a /ricerca
    const response = await registroImpreseApi.post('/ricerca', {
        partitaIva: piva
    });

    // La risposta (response.data) conterrà i dati grezzi dell'API
    // Eseguiamo una mappatura per restituire un oggetto pulito e standardizzato
    const apiData = response.data;

    const companyData: CompanyData = {
        ragioneSociale: apiData.denominazione || null,
        partitaIva: apiData.partita_iva || piva,
        codiceFiscale: apiData.codice_fiscale || null,
        pec: apiData.indirizzo_pec || null,
        codiceSdi: apiData.codice_destinatario || '0000000', // Default a 7 zeri se non presente
        indirizzoCompleto: apiData.indirizzo_sede?.full || null,
        statoAttivita: apiData.stato_attivita || null,
    };

    return companyData;
};
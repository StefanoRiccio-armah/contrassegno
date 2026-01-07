// src/controllers/company.controller.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { getCompanyDataByVat } from '../services/registroImprese.service';

// Funzione helper per la validazione della P.IVA
const isValidItalianVat = (piva: any): piva is string => {
    return typeof piva === 'string' && /^[0-9]{11}$/.test(piva);
};

export async function lookupCompanyByVat(req: Request, res: Response) {
  try {
    const { piva } = req.body;

    // 1. Validazione dell'input
    if (!isValidItalianVat(piva)) {
      return res.status(400).json({
        success: false,
        error: 'Formato Partita IVA non valido. Deve contenere 11 cifre.',
      });
    }

    // 2. Chiamata al servizio
    const companyData = await getCompanyDataByVat(piva);

    // 3. Risposta di successo
    res.status(200).json({
      success: true,
      data: companyData,
    });

  } catch (error: unknown) {
    // Gestione errori robusta, come quella che usi per GLS
    if (axios.isAxiosError(error)) {
      console.error('Errore API Registro Imprese:', error.response?.data || error.message);
      const statusCode = error.response?.status === 404 ? 404 : 500;
      const message = error.response?.status === 404 
        ? 'Nessuna azienda trovata per la Partita IVA fornita.'
        : 'Errore durante la comunicazione con il servizio anagrafica.';
      
      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    } 
    
    console.error('Errore generico in lookupCompanyByVat:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server.',
    });
  }
}
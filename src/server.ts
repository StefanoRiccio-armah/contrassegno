
import express from 'express';
import type { Request, Response } from 'express';
import glsRoutes from './routes/gls.routes'
import axios from 'axios';
import * as dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const {
    BIGCOMMERCE_STORE_HASH,
    BIGCOMMERCE_ACCESS_TOKEN,
    COD_PROVIDER_ID,
    FEE_NAME,
    FEE_AMOUNT
} = process.env;

const feeAmount = parseFloat(FEE_AMOUNT || '5');

const bigCommerceApi = axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${BIGCOMMERCE_STORE_HASH}`,
    headers: { 'X-Auth-Token': BIGCOMMERCE_ACCESS_TOKEN }
});

app.post('/handle-payment-change', async (req: Request, res: Response) => {
    const { checkoutId, selectedPaymentMethodId } = req.body;

    console.log(`[${checkoutId}] Richiesta per metodo: ${selectedPaymentMethodId}`);

    if (!checkoutId) {
        return res.status(400).json({ message: 'checkoutId è richiesto.' });
    }

    try {
        // PASSO 1: Recupera le fee esistenti
        const { data: checkoutResponse } = await bigCommerceApi.get<{ data?: { fees?: Array<{ id: string, name: string }> } }>(`/v3/checkouts/${checkoutId}?include=fees`);
        const existingFees = checkoutResponse.data?.fees || [];
        
        console.log(`[${checkoutId}] Fees esistenti:`, JSON.stringify(existingFees, null, 2));

        // PASSO 2: PULIZIA (metodo corretto)
        // Filtra per trovare solo le fee che abbiamo creato noi e prendi i loro ID
        const feesToDelete = existingFees
            .filter(fee => fee.name === FEE_NAME)
            .map(fee => fee.id);

        // Se ci sono fee da cancellare, esegui la richiesta DELETE
        if (feesToDelete.length > 0) {
            console.log(`[${checkoutId}] Rimuovo le fee esistenti con ID:`, feesToDelete);
            
            // L'API DELETE richiede un corpo con un array di "ids"
            await bigCommerceApi.delete(`/v3/checkouts/${checkoutId}/fees`, {
                data: { ids: feesToDelete }
            });
        }

        // PASSO 3: AGGIUNTA CONDIZIONALE
        // Ora che abbiamo pulito, aggiungiamo la nuova fee se necessario
        if (selectedPaymentMethodId === COD_PROVIDER_ID) {
            console.log(`[${checkoutId}] Aggiungo la fee per il contrassegno.`);
            
            const feeRequestBody = {
                type: 'custom_fee',
                name: FEE_NAME,
                display_name: FEE_NAME,
                cost: feeAmount,
                source: 'custom'
            };
            
            await bigCommerceApi.post(`/v3/checkouts/${checkoutId}/fees`, { fees: [feeRequestBody] });
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
});

app.use('/api/gls', glsRoutes); // es: /api/gls/check-limit

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});
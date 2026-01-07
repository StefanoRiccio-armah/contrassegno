// src/server.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';

// Importa i tuoi router
import glsRoutes from './routes/gls.routes';
import paymentRoutes from './routes/payment.routes';
import cfRoutes from './routes/cf.routes';
import pIvaRoutes from './routes/pIva.routes';

const app = express();

// Middleware globali
app.use(cors());
app.use(express.json());

// Monta i router su un prefisso comune /api
// es: POST /api/handle-payment-change
app.use(paymentRoutes); 
// es: /api/gls/check-limit
app.use('/api/gls', glsRoutes);
app.use('/api/cf', cfRoutes);
app.use('/api/company', pIvaRoutes);

// Avvio del server
app.listen(config.port, () => {
    console.log(`🚀 Server in ascolto sulla porta ${config.port}`);
});
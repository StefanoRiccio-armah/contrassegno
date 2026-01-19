// src/server.ts
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { config } from './config';

import glsRoutes from './routes/gls.routes';
import paymentRoutes from './routes/payment.routes';
import vatRoutes from './routes/vatRoutes';
import pivaRoutes from './routes/piva.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Rimuoviamo il prefisso /api perché Vercel lo aggiunge automaticamente
app.use( paymentRoutes);
app.use('/gls', glsRoutes);
app.use('/vat', vatRoutes);
app.use('/piva', pivaRoutes);

// Esporta l'handler per Vercel
export const handler = serverless(app);

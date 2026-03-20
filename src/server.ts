import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import glsRoutes from './routes/gls.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes'

const app = express();


// ─── CORS ────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  'https://farmacia-test-1816752.mybigcommerce.com',
  'https://stefanoriccio-armah.github.io',
   'https://glucosic-dylan-ectoblastic.ngrok-free.dev'
];

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Body parser ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(paymentRoutes);
app.use('/gls', glsRoutes);
app.use('/webhooks', webhookRoutes);  // BigCommerce webhook handler

// ─── Avvio server ────────────────────────────────────────────────────────────
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server attivo su porta ${port}`));

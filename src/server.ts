import express from 'express';
import cors from 'cors';
//import { config } from './config';

import glsRoutes from './routes/gls.routes';
import paymentRoutes from './routes/payment.routes';
import vatRoutes from './routes/vatRoutes';
import pivaRoutes from './routes/piva.routes';

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://farmacia-test-1816752.mybigcommerce.com',
  'https://stefanoriccio-armah.github.io'
];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parser
app.use(express.json());

// Routes
app.use(paymentRoutes);
app.use('/gls', glsRoutes);
app.use('/vat', vatRoutes);
app.use('/piva', pivaRoutes);

// Route di test
app.post('/api/test', (req, res) => {
  console.log('BODY RICEVUTO:', req.body);
  res.json({ received: req.body });
});

// Avvio server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server attivo su porta ${port}`));

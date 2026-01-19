// src/routes/piva.routes.ts

import { Router } from 'express';
import { verifyPivaController } from '../controllers/piva.controller'; // Importiamo il nostro controller

// Creiamo un'istanza del router di Express
const router = Router();

// Definiamo la nostra rotta:
// Quando arriva una richiesta GET a '/verify/QUALSIASI_COSA'
// Express la passerà alla funzione 'verifyPivaController'.
router.get('/verify/:piva', verifyPivaController);

// Esportiamo il router per poterlo usare nel file principale del server
export default router;
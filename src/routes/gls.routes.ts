import { Router } from 'express';
import {
  geocodeAddress,
  checkLimit,
  searchParcelShops,
  addParcel,
  closeWorkDay
} from '../controllers/gls.controllers';

const router = Router();

// STEP 5.1 — Geolocalizzazione indirizzo
// Converte indirizzo in lat/lng tramite HERE API
// GET /gls/geocode?address=Via Roma 1, Milano
router.get('/geocode', geocodeAddress);

// STEP 5.3 — Verifica limiti spedizione
// POST /gls/check-limit
router.post('/check-limit', checkLimit);

// STEP 5.4 — Ricerca Parcel Shop vicini
// GET /gls/parcelshops?lat=45.46&lng=9.19&distance=10
router.get('/parcelshops', searchParcelShops);

// STEP 5.5 — Registra spedizione verso Parcel Shop
// POST /gls/add-parcel
router.post('/add-parcel', addParcel);

// STEP 5.6 — Chiudi e trasmetti spedizione alla sede GLS
// POST /gls/close-work-day
router.post('/close-work-day', closeWorkDay);

export default router;

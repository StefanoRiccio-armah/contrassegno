import { Router } from 'express';
import { checkLimit, searchParcelShops, addParcel, closeWorkDay } from '../controllers/gls.controllers';

const router = Router();

router.post('/check-limit', checkLimit);
router.get('/parcelshops', searchParcelShops);
router.post('/add-parcel', addParcel);
router.post('/close-work-day', closeWorkDay);

export default router;

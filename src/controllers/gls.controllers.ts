import axios from 'axios';
import { Request, Response } from 'express';
import { getGLSToken } from '../utils/token';

export async function checkLimit(req: Request, res: Response) {
  try {
    const {
      isCashOnDelivery = false,
      measures,
      nOfPackages,
      pv,
      weight,
      plus = false,
      sprinterList = [],
      insuranceList = []
    } = req.body;

    const token = await getGLSToken();

    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/check/limit`,
      {
        ca: isCashOnDelivery,
        measures,
        nOfPackages,
        pv,
        weight,
        plus,
        sprinterList,
        insuranceList
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore verifica limiti GLS:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la verifica dei limiti di spedizione'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico verifica limiti GLS:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Errore sconosciuto verifica limiti GLS:', error);
      res.status(500).json({
        success: false,
        error: 'Errore durante la verifica dei limiti di spedizione'
      });
    }
  }
}

export async function searchParcelShops(req: Request, res: Response) {
  try {
    const { lat, lng, distance = '10' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat e lng sono richiesti'
      });
    }

    const token = await getGLSToken();

    const response = await axios.get(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/parcelshoppes`,
      {
        params: {
          latitude: lat,
          longitude: lng,
          'country-code': 'IT',
          distance: parseInt(distance as string, 10)
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore ricerca Parcel Shop GLS:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante la ricerca dei Parcel Shop'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico ricerca Parcel Shop GLS:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Errore sconosciuto ricerca Parcel Shop GLS:', error);
      res.status(500).json({
        success: false,
        error: 'Errore durante la ricerca dei Parcel Shop'
      });
    }
  }
}

export async function addParcel(req: Request, res: Response) {
  try {
    const {
      shipmentNumber,
      partnerId,
      parcelShopId
    } = req.body;

    if (!shipmentNumber || !partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: 'shipmentNumber, partnerId e parcelShopId sono richiesti'
      });
    }

    const token = await getGLSToken();

    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/addParcel`,
      {
        shipmentNumber,
        tags: {
          PARTNER_SHOP_ID: partnerId,
          SHOP_ID: parcelShopId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in addParcel GLS:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante addParcel'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico addParcel GLS:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Errore sconosciuto addParcel GLS:', error);
      res.status(500).json({
        success: false,
        error: 'Errore durante addParcel'
      });
    }
  }
}

export async function closeWorkDay(req: Request, res: Response) {
  try {
    const {
      shipmentNumber,
      partnerId,
      parcelShopId
    } = req.body;

    if (!shipmentNumber || !partnerId || !parcelShopId) {
      return res.status(400).json({
        success: false,
        error: 'shipmentNumber, partnerId e parcelShopId sono richiesti'
      });
    }

    const token = await getGLSToken();

    const response = await axios.post(
      `${process.env.GLS_API_URL}/gls-shop-italy-public-v1/v1/closeWorkDay`,
      {
        shipmentNumber,
        tags: {
          PARTNER_SHOP_ID: partnerId,
          SHOP_ID: parcelShopId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Errore in closeWorkDay GLS:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || 'Errore durante closeWorkDay'
      });
    } else if (error instanceof Error) {
      console.error('Errore generico closeWorkDay GLS:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Errore sconosciuto closeWorkDay GLS:', error);
      res.status(500).json({
        success: false,
        error: 'Errore durante closeWorkDay'
      });
    }
  }
}

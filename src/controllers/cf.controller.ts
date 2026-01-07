import { Request, Response } from 'express';
import { CfService } from '../services/cf.service';

const cfService = new CfService();

export const validateCf = async (req: Request, res: Response) => {
  try {
    const { codiceFiscale } = req.body;

    if (!codiceFiscale) {
      return res.status(400).json({ error: 'codiceFiscale obbligatorio' });
    }

    const result = await cfService.validate(codiceFiscale);

    return res.json(result);

  } catch (err: any) {
    return res.status(500).json({
      error: 'Errore servizio CF',
      detail: err.message,
    });
  }
};

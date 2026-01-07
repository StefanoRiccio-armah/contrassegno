import axios from 'axios';
import { config } from '../config';
import { isValidCodiceFiscale } from '../utils/cf.validator'

export class CfService {

  async validate(cf: string) {
    // validazione formale locale
    if (!isValidCodiceFiscale(cf)) {
      return {
        valid: false,
        exists: false,
        message: 'Codice fiscale formalmente non valido',
        source: 'LOCAL',
      };
    }

    const { clientId, clientSecret, baseUrl, apiKey, timeout } = config.cfApi;

    // mock chiamata esterna (puoi sostituire con Agenzia Entrate reale)
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      // simulazione chiamata POST / GET
      const response = await axios.post(
        `${baseUrl}?codiceFiscale=${cf}`,
        {},
        { headers, timeout }
      );

      return {
        valid: true,
        exists: response.data?.exists ?? true,
        message: response.data?.exists
          ? 'CF verificato (mock)'
          : 'CF non trovato (mock)',
        provider: baseUrl,
        source: 'EXTERNAL_MOCK',
      };

    } catch (e: any) {
      return {
        valid: true,
        exists: false,
        message: `Errore chiamata esterna mock: ${e.message}`,
        source: 'EXTERNAL_MOCK',
      };
    }
  }
}

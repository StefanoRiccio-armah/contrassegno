import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Cache del token GLS
// Il token ha durata massima 4 ore (14400 secondi) e supporta max 100.000 request.
// Il caching evita di richiedere un nuovo token ad ogni chiamata API.
// Ref: MU407 §5.2
// ─────────────────────────────────────────────────────────────────────────────
let glsToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGLSToken(): Promise<string> {
  // Riusa il token se ancora valido (con margine di 60 secondi)
  if (glsToken && tokenExpiry > Date.now()) {
    return glsToken;
  }

  try {
    // Ref: MU407 §5.2 — POST https://api.gls-group.net/oauth2/v2/token
    // Parametri obbligatori: grant_type, client_id, client_secret
    const response = await axios.post(
      process.env.GLS_AUTH_URL!,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.GLS_CLIENT_ID!,
        client_secret: process.env.GLS_CLIENT_SECRET!
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new Error('Token GLS non presente nella risposta');
    }

    glsToken = access_token;
    // Scade con margine di 60 secondi per sicurezza
    tokenExpiry = Date.now() + (expires_in - 60) * 1000;

    console.log(`[GLS Token] Nuovo token ottenuto. Scade tra ${expires_in}s`);
    return glsToken as string;

  } catch (error) {
    console.error('[GLS Token] Errore recupero token GLS:', error);
    // Reset cache in caso di errore
    glsToken = null;
    tokenExpiry = 0;
    throw error;
  }
}

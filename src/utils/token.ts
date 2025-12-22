import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

let glsToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGLSToken(): Promise<string> {
  if (glsToken && tokenExpiry > Date.now()) {
    return glsToken;
  }
  try {
    const response = await axios.post(process.env.GLS_AUTH_URL!, {
      grant_type: 'client_credentials',
      client_id: process.env.GLS_CLIENT_ID,
      client_secret: process.env.GLS_CLIENT_SECRET
    });
    glsToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    if (!glsToken) {
      throw new Error('Token GLS non ottenuto');
    }
    return glsToken;
  } catch (error) {
    console.error('Errore recupero token GLS:', error);
    throw error;
  }
}

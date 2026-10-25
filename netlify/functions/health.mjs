import { getEngine } from './phonemize.mjs';

export default async function handler() {
  try {
    await getEngine();
    return Response.json({ engine: 'eSpeak NG' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Moteur indisponible.' }, { status: 503 });
  }
}

export const config = { path: '/api/health' };

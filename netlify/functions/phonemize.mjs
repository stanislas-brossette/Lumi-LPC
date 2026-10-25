import createEphone, { roa } from 'ephone';

let enginePromise;
export function getEngine() {
  if (!enginePromise) {
    enginePromise = createEphone(roa).then(engine => {
      engine.setVoice('fr');
      return engine;
    }).catch(error => { enginePromise = undefined; throw error; });
  }
  return enginePromise;
}

const reply = (status, data) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, { error: 'Utilise la méthode POST.' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return reply(403, { error: 'Origine refusée.' });
  }
  // Bound the body before decoding JSON, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply(400, { error: 'Requête vide.' });
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply(413, { error: 'Requête trop volumineuse.' });
      }
      chunks.push(value);
    }
  } catch {
    return reply(400, { error: 'Requête invalide.' });
  }
  let text;
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    text = data?.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 300) {
      return reply(400, { error: 'Saisis une phrase de 1 à 300 caractères.' });
    }
  } catch {
    return reply(400, { error: 'JSON invalide.' });
  }
  try {
    const engine = await getEngine();
    const ipa = engine.textToIpa(text.trim());
    if (!ipa.trim()) return reply(400, { error: 'Aucune prononciation obtenue.' });
    return reply(200, { ipa, engine: 'eSpeak NG' });
  } catch {
    return reply(503, { error: 'Le moteur phonétique est indisponible. Réessaie.' });
  }
}

export const config = { path: '/api/phonemize' };

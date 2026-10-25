#!/usr/bin/env python3
"""Serve Lumi and phonemize French locally using eSpeak NG."""
import argparse
import json
import mimetypes
from urllib.parse import unquote
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
MAX_BODY = 8192
STATIC = {
    '/speech-sync.mjs': ('speech-sync.mjs', 'text/javascript; charset=utf-8'),
    # Built by npm run build, like the voice files it precaches.
    '/sw.js': ('dist/sw.js', 'text/javascript; charset=utf-8'),
    '/manifest.webmanifest': ('manifest.webmanifest', 'application/manifest+json; charset=utf-8'),
    **{f'/icons/{name}': (f'icons/{name}', 'image/png')
       for name in ('icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png')},
}


def phonemize(text, engine):
    result = subprocess.run(
        [engine, '-q', '-b', '1', '-v', 'fr-fr', '--ipa', '--stdin'],
        input=text, capture_output=True, text=True, encoding='utf-8',
        timeout=8, check=True,
    )
    ipa = result.stdout.strip()
    if not ipa:
        raise ValueError('Aucune prononciation obtenue pour ce texte.')
    return ipa


class Handler(BaseHTTPRequestHandler):
    # Do not record request contents or URLs in access logs.
    def log_message(self, *_args):
        pass

    def reply(self, status, data, content_type='application/json; charset=utf-8'):
        body = json.dumps(data, ensure_ascii=False).encode() if isinstance(data, dict) else data
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/api/health':
            return self.reply(200, {'engine': 'eSpeak NG'})
        if path in ('/', '/Lumi-LPC-V0.html'):
            return self.reply(200, (ROOT / 'Lumi-LPC-V0.html').read_bytes(), 'text/html; charset=utf-8')
        if path in STATIC and (ROOT / STATIC[path][0]).is_file():
            name, mime = STATIC[path]
            return self.reply(200, (ROOT / name).read_bytes(), mime)
        if path.startswith('/assets/voice/'):
            assets = (ROOT / 'dist/assets/voice').resolve()
            target = (assets / unquote(path[len('/assets/voice/'):])).resolve()
            if target.is_relative_to(assets) and target.is_file():
                mime = 'application/gzip' if target.suffix == '.gz' else mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
                return self.reply(200, target.read_bytes(), mime)
        self.reply(404, {'error': 'Page introuvable.'})

    def do_POST(self):
        if self.path != '/api/phonemize':
            return self.reply(404, {'error': 'Route introuvable.'})
        # Only same-origin browser requests may use the local endpoint.
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + self.headers.get('Host', ''):
            return self.reply(403, {'error': 'Origine refusée.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY:
                return self.reply(413, {'error': 'Requête trop volumineuse ou vide.'})
            data = json.loads(self.rfile.read(length))
            text = data.get('text') if isinstance(data, dict) else None
            if not isinstance(text, str) or not text.strip() or len(text) > 300:
                return self.reply(400, {'error': 'Saisis une phrase de 1 à 300 caractères.'})
            ipa = phonemize(text.strip(), self.server.engine)
            self.reply(200, {'ipa': ipa, 'engine': 'eSpeak NG'})
        except (ValueError, UnicodeError):
            self.reply(400, {'error': 'Texte ou JSON invalide.'})
        except subprocess.TimeoutExpired:
            self.reply(504, {'error': 'Le moteur phonétique met trop de temps à répondre.'})
        except (subprocess.CalledProcessError, OSError):
            self.reply(503, {'error': 'Le moteur phonétique est indisponible.'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    engine = shutil.which('espeak-ng')
    if not engine:
        parser.exit(1, 'eSpeak NG est requis. Sur Ubuntu : sudo apt install espeak-ng\n')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.engine = engine
    print(f'Lumi : http://127.0.0.1:{args.port} (Ctrl+C pour arrêter)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

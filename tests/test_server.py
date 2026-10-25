import json
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler, ThreadingHTTPServer


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.server.engine = shutil.which('espeak-ng')
        if not cls.server.engine:
            cls.server.server_close()
            raise unittest.SkipTest('eSpeak NG requis')
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, data, origin=None):
        headers = {'Content-Type': 'application/json'}
        if origin:
            headers['Origin'] = origin
        req = Request(self.url + '/api/phonemize', data=json.dumps(data).encode(), headers=headers)
        return urlopen(req, timeout=12)

    def test_page_and_health(self):
        with urlopen(self.url) as response:
            self.assertIn(b'Atelier LPC', response.read())
        with urlopen(self.url + '/api/health') as response:
            self.assertEqual(json.load(response)['engine'], 'eSpeak NG')
        with self.assertRaises(HTTPError) as error:
            urlopen(self.url + '/server.py')
        self.assertEqual(error.exception.code, 404)

    def test_free_phrases_encode_with_real_lpc_engine(self):
        phrases = [
            'Demain, les astronautes visiteront une bibliothèque extraordinaire.',
            "J’ai acheté 23 croissants pour mes collègues !",
            'Les écureuils grignotent des noisettes près du vieux château.',
        ]
        ipas = []
        for phrase in phrases:
            with self.post({'text': phrase}) as response:
                ipa = json.load(response)['ipa']
                self.assertTrue(ipa)
                ipas.append(ipa)
        # Execute the application's actual encoder against the backend output.
        script = r'''
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('Lumi-LPC-V0.html', 'utf8');
vm.runInThisContext(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
for (const ipa of JSON.parse(fs.readFileSync(0, 'utf8'))) {
  if (!LPC.encode(ipa).length) throw new Error('Empty LPC sequence');
}
'''
        subprocess.run(['node', '-e', script], input=json.dumps(ipas), text=True, check=True)

    def test_text_is_not_a_command(self):
        from unittest.mock import patch
        from server import phonemize
        with patch('server.subprocess.run') as run:
            run.return_value.stdout = 'bɔ̃ʒuʁ'
            text = '--help $(touch /tmp/lumi-must-not-exist)'
            phonemize(text, '/usr/bin/espeak-ng')
            self.assertEqual(run.call_args.kwargs['input'], text)
            self.assertNotIn(text, run.call_args.args[0])
            self.assertNotIn('shell', run.call_args.kwargs)

    def test_invalid_input(self):
        for data in ({'text': ''}, {'text': 'a' * 301}, {'text': 42}, []):
            with self.assertRaises(HTTPError) as error:
                self.post(data)
            self.assertEqual(error.exception.code, 400)

    def test_cross_origin_rejected(self):
        with self.assertRaises(HTTPError) as error:
            self.post({'text': 'Bonjour'}, origin='https://example.org')
        self.assertEqual(error.exception.code, 403)


if __name__ == '__main__':
    unittest.main()

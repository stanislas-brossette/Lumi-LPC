# Voix des clés — Piper / Siwis

Cette banque contient 329 unités : les 21 consonnes, les 14 voyelles et leurs
294 combinaisons consonne-voyelle du référentiel de Lumi. Ce sont des sons
**synthétiques**, pas des enregistrements humains ni un corpus validé LPC.

Le modèle `fr_FR-siwis-medium` de Piper a généré chaque unité depuis
ses phonèmes. Depuis la correction 0.2.1, les six consonnes explosives isolées
/p b t d k g/ sont extraites d'une phrase française porteuse, plutôt que
synthétisées seules. La passe 0.4.3 remplace aussi dix consonnes isolées après comparaison en contexte. Sept utilisent un appui /ø/ coupé avant la voyelle ; /ɲ/ et /j/ gardent un contexte /a/. /ŋ/ utilise exceptionnellement eSpeak NG, signalé à l’écran ; /ɥ/ reste à confirmer. Les 319 autres extraits sont conservés. Le navigateur assemble les extraits avec un temps de transition
et d'observation, sans exécuter de modèle neuronal et sans service vocal distant.
Les fichiers sont inclus dans le cache hors ligne. eSpeak reste le phonétiseur
et la voix de secours si la banque ne peut pas être chargée.

## Provenance et attribution

- Modèle : https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium
- Carte du modèle originale : [MODEL_CARD](MODEL_CARD).
- Dataset : *The SIWIS French Speech Synthesis Database, 2016*, Junichi Yamagishi,
  Pierre-Edouard Honnet, Philip Garner et Alexandros Lazaridis (2017),
  University of Edinburgh, https://doi.org/10.7488/ds/1705.
- Licence du dataset indiquée par la carte : CC BY 4.0,
  https://creativecommons.org/licenses/by/4.0/.
- Piper : https://github.com/OHF-Voice/piper1-gpl (GPL-3.0).

Les extraits sont produits par synthèse, rognés aux limites du son, normalisés
modérément, puis assemblés dans un WAV PCM mono 16 bits à 22 050 Hz. Les repères
consonne/voyelle viennent des durées du modèle, ajustées au rognage. Ces durées
prédites ne sont pas des mesures d'alignement validées par un phonéticien.
L'attribution accompagne la banque ; aucun soutien des auteurs n'est implicite.

## Régénération (outil de développement uniquement)

Avec Python 3.12, Node.js et un environnement Python séparé :

```sh
uv venv /tmp/lumi-voice-env
uv pip install --python /tmp/lumi-voice-env/bin/python 'piper-tts[alignment]==1.8.0'
# Télécharger le .onnx, le .onnx.json et MODEL_CARD depuis le dossier du modèle.
/tmp/lumi-voice-env/bin/python scripts/generate-key-voice.py --model /chemin/fr_FR-siwis-medium.onnx
# Pour réparer les six explosives et /to/ en conservant les autres PCM :
/tmp/lumi-voice-env/bin/python scripts/generate-key-voice.py --model /chemin/fr_FR-siwis-medium.onnx --repair-existing
# Pour réparer uniquement /to/ dans une banque existante :
/tmp/lumi-voice-env/bin/python scripts/generate-key-voice.py --model /chemin/fr_FR-siwis-medium.onnx --repair-key to
# Après une régénération, réappliquer les dix coupes archivées :
/tmp/lumi-voice-env/bin/python scripts/generate-key-voice.py --apply-reviewed-consonants
npm test
npm run build
```

Le modèle et Python ne sont pas nécessaires pour construire ou utiliser Lumi.
Le manifeste conserve les empreintes du modèle et de l'audio ainsi que les
réglages de génération. Le générateur déduit l'inventaire du référentiel LPC
réel, refuse les sons sans correspondance et exige un alignement exploitable.

## Validation

Les tests vérifient la couverture du référentiel, les données audio, les bornes
des extraits, le montage, les repères de bouche et le repli vers eSpeak.
Une écoute humaine reste nécessaire, notamment pour les consonnes isolées,
les nasales, /ɥ/, /ɲ/ et /ŋ/. L'amélioration perçue du timbre et l'exactitude
pédagogique ne se déduisent pas de ces contrôles techniques.

Le contrôle du 25 octobre est documenté dans [le rapport acoustique](../docs/voice-audit-2026-10-25.md).
Le serveur local expose `/voice-review.html` pour comparer les sept corrections
aux anciens sons et écouter l'ensemble des 329 unités. Cette page de travail
et les anciens sons sont exclus du build Netlify.

La correction 0.4.4 extrait /pa/ d’une phrase porteuse avec 100 ms de fermeture
conservée avant la borne initiale du modèle. Son repère de voyelle est estimé
sur la montée d’énergie ; cette exception est tracée dans le manifeste. Les
328 autres unités sont inchangées. L’ancien /pa/ est disponible dans la page
locale de comparaison. Voir [le détail et ses limites](../docs/connected-speech.md).

La correction 0.4.5 remplace uniquement le /y/ isolé (« usine »). Le modèle
synthétise /ʒə dˈi ˈy ./ avec `length_scale=2.0`, puis extrait la voyelle avec 60 ms
d’avance sur le début prédit et 25 ms retirées en fin, avec des fondus de 3 ms.
Le début prédit était tardif et la fin contenait une transition gênante. L’ancien extrait
présentait une attaque parasite (reconnue /v i/ par le contrôle indépendant).
La nouvelle coupe reste une proposition à vérifier à l’écoute ; la reconnaissance
de voyelles très courtes ne suffit pas à valider leur timbre. Les 328 autres sons
restent identiques, contrôlés par empreinte PCM. L’ancien son, le nouveau et la
phrase porteuse sont accessibles en première carte sur `/voice-review.html`.
Pour reproduire uniquement cette correction :

```sh
/tmp/lumi-voice-env/bin/python scripts/generate-key-voice.py --model /chemin/fr_FR-siwis-medium.onnx --repair-key y
```

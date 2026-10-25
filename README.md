# Lumi — Atelier LPC

Lumi est un prototype d’atelier pour explorer la **Langue française Parlée Complétée (LPC)** : saisir une phrase, consulter ou corriger ses phonèmes, puis visualiser une séquence de clés avec un avatar.

Le projet tient actuellement dans un seul fichier HTML, avec ses styles, son JavaScript, ses dessins SVG et son lexique embarqué. Le fichier peut être ouvert seul pour le mode autonome. Le déploiement Netlify utilise Node.js et des fonctions de phonétisation côté serveur.

## Démarrage

Pour coder des **phrases libres**, utiliser le serveur local avec Python 3 et eSpeak NG.

Sur Ubuntu, installer le moteur si nécessaire :

```bash
sudo apt install espeak-ng
```

Puis, depuis la racine du dépôt :

```bash
python3 server.py
```

Ouvrir [Lumi dans le navigateur](http://127.0.0.1:8000). Le serveur écoute uniquement sur la machine locale. Pour changer de port : `python3 server.py --port 8001`.

Il est aussi possible d’ouvrir directement **[Lumi-LPC-V0.html](Lumi-LPC-V0.html)** dans un navigateur récent. Ce mode autonome se limite aux exemples, au lexique embarqué et à la saisie phonétique manuelle.

## Déploiement sur Netlify

Le site et la phonétisation sont hébergés ensemble sur Netlify. Aucune base Supabase ni clé d’API n’est nécessaire. Le moteur eSpeak NG est exécuté dans les fonctions Node.js via le paquet `ephone`, avec les données françaises.

1. Pousser les fichiers du projet sur le dépôt GitHub `stanislas-brossette/Lumi-LPC`.
2. Dans Netlify, choisir **Add new project → Import an existing project**, puis sélectionner ce dépôt.
3. Vérifier les réglages détectés depuis `netlify.toml` : commande `npm run build`, dossier publié `dist`, fonctions `netlify/functions`, Node.js 22.
4. Déployer et ouvrir l’URL HTTPS fournie par Netlify.
5. Tester une phrase absente des exemples et vérifier que le bandeau affiche « eSpeak NG · serveur ». `/api/health` doit renvoyer un JSON avec `engine`.

Un simple dépôt du dossier `dist` par glisser-déposer ne suffit pas : les fonctions doivent aussi être déployées. L’utilisation des fonctions est soumise aux quotas et à la facturation du compte Netlify.

Pour vérifier les fonctions et générer le site en local :

```bash
npm ci
npm test
npm run build
```

Les tests appellent les fonctions avec de vraies requêtes et vérifient que les transcriptions françaises sont acceptées par le moteur LPC. Le déploiement doit ensuite être vérifié sur Netlify.

## Fonctionnalités

- Saisie de phrases jusqu’à 300 caractères.
- Conversion en phonèmes à partir d’exemples et d’un lexique embarqués ; les mots inconnus sont signalés.
- Édition manuelle des phonèmes et choix de l’interprétation du schwa `/ə/`.
- Conversion des phonèmes en configurations de main et positions LPC.
- Lecture de la séquence, navigation pas à pas, vitesse réglable et boucle.
- Avatar schématique avec mode miroir et repères de position.
- Référentiel des huit configurations de main et des cinq positions.
- Conservation du dernier texte et des réglages dans le navigateur, avec une commande de réinitialisation dans l’aide.

## Utilisation

1. Choisir un exemple ou saisir une phrase, puis préparer sa prononciation.
2. Vérifier les phonèmes et les corriger si nécessaire dans l’éditeur.
3. Lancer la lecture ou sélectionner une clé dans la séquence pour l’examiner.

En mode autonome, les liaisons ne sont pas calculées automatiquement. Pour un mot absent du lexique, saisir sa transcription phonétique dans l’éditeur. Le symbole `|` permet de forcer une séparation ; les symboles non pris en charge bloquent la lecture et sont signalés.

## Phonétisation de texte libre

L’interface prévoit une connexion à une API sur la même origine :

| Route | Usage attendu par l’interface |
| --- | --- |
| `GET /api/health` | Détecter un moteur disponible via une réponse JSON contenant `engine`. |
| `POST /api/phonemize` | Envoyer `{"text":"Bonjour"}` et recevoir un JSON contenant `ipa` et `engine`. |

**Deux backends sont fournis : `server.py` pour une utilisation locale, et `netlify/functions/` pour Netlify.** Le serveur Python appelle eSpeak NG installé sur la machine ; les fonctions Netlify utilisent son port JavaScript avec la voix française. Les phrases libres, y compris les mots absents du lexique embarqué, les nombres et la ponctuation, sont traitées par ce moteur. La limite reste de 300 caractères par saisie. Si aucun serveur n’est détecté, l’application utilise son mode autonome.

## Limites du prototype

- La bouche n’est pas animée et la lecture n’est pas synchronisée avec une voix.
- Les formes de main sont fixes ; les déplacements, contacts et transitions sont simplifiés.
- Les transcriptions automatiques peuvent nécessiter des corrections, notamment pour les liaisons et les noms propres. Des mots étrangers peuvent produire des sons hors du système français : le lecteur les signale et demande une correction manuelle.
- Le prototype n’est pas un outil validé d’apprentissage autonome et ne remplace pas l’accompagnement d’un codeur LPC.

## Données et stockage

Le fichier embarque ses ressources visuelles et son lexique, sans bibliothèque ni police chargée depuis un tiers. Le texte et les réglages sont enregistrés dans le `localStorage` du navigateur. L’aide contient un bouton pour effacer ces données.

Lorsqu’une API de phonétisation est disponible, le texte lui est envoyé. Sur le site public, Netlify reçoit donc le texte et le traite avec eSpeak NG. Avec le serveur Python local, le traitement reste sur la machine. Le code de Lumi ne conserve pas les phrases et ne les écrit pas dans ses journaux ; l’hébergeur applique ses propres politiques de traitement et de journalisation.

## Organisation et développement

```text
.
├── Lumi-LPC-V0.html   # Interface, moteur de règles, dessins et lexique
├── server.py          # Serveur HTTP local et API eSpeak NG
├── netlify/functions/ # API de phonétisation pour le site public
├── netlify.toml       # Configuration du déploiement
├── scripts/build.mjs  # Génération du dossier public dist/
├── package.json       # Dépendance ephone et commandes npm
├── tests/             # Tests d’intégration
└── README.md
```

Les modifications se font directement dans le fichier HTML. Les tests d’intégration utilisent Python 3, eSpeak NG et Node.js pour vérifier l’API et la compatibilité des transcriptions avec le moteur LPC :

```bash
python3 -m unittest discover -s tests -v
```

La génération du site et le déploiement Netlify sont configurés dans `package.json` et `netlify.toml`.

Pour une vérification manuelle, essayer un exemple, un mot hors lexique, une transcription manuelle et un symbole inconnu, puis contrôler la lecture, les réglages et la restauration après rechargement.

## Références

- [ALPC — Les clés du code LPC](https://alpc.asso.fr/les-cles-du-code-lpc/)
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng)
- [TextCueS / AutoCuedSpeech](https://auto-cuedspeech.org/textcues.html)

Lumi est un prototype indépendant, sans affiliation à l’ALPC. Il n’intègre pas le moteur TextCueS / Auto-CS / SPPAS et ne bénéficie pas de sa validation.

Le backend Netlify utilise [ephone](https://github.com/sjmik/ephone-js), un port d’eSpeak NG sous GPL-3.0-or-later. Le paquet est installé côté serveur avec sa licence et ses données de langues ; il n’est pas chargé dans le navigateur.

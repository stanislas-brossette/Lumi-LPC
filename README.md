# Lumi — Atelier LPC

Lumi est un prototype d’atelier pour explorer la **Langue française Parlée Complétée (LPC)** : saisir une phrase, consulter ou corriger ses phonèmes, puis visualiser une séquence de clés avec un avatar.

Le projet tient actuellement dans un seul fichier HTML, avec ses styles, son JavaScript, ses dessins SVG et son lexique embarqué. Le fichier peut être ouvert seul pour le mode autonome. Le déploiement Netlify utilise Node.js et des fonctions de phonétisation côté serveur.

## Démarrage

Pour coder des **phrases libres**, utiliser le serveur local avec Python 3 et eSpeak NG.

Sur Ubuntu, installer le moteur si nécessaire :

```bash
sudo apt install espeak-ng
```

Avec Node.js 24 ou plus récent et Python 3, préparer les ressources vocales une première fois (et après une mise à jour des dépendances), puis lancer le serveur :

```bash
npm ci
npm run build
python3 server.py
```

Ouvrir [Lumi dans le navigateur](http://127.0.0.1:8000). Le serveur écoute uniquement sur la machine locale. Après une mise à jour du code ou l’ajout de modules, relancer `npm run build`, arrêter le serveur avec Ctrl+C puis relancer `python3 server.py` : un ancien processus conserve ses anciennes routes même si le HTML change. Pour changer de port : `python3 server.py --port 8001`.

Il est aussi possible d’ouvrir directement **[Lumi-LPC-V0.html](Lumi-LPC-V0.html)** dans un navigateur récent. Ce mode autonome se limite aux exemples, au lexique embarqué et à la saisie phonétique manuelle.

## Déploiement sur Netlify

Site public : **[lumi-lpc.netlify.app](https://lumi-lpc.netlify.app/)**.

Le premier déploiement a été vérifié le 25 octobre 2026 : accès public sans authentification, moteur eSpeak NG disponible et génération de clés pour une phrase libre.

**Économie de crédits : les builds Netlify sont arrêtés après cette publication.** Les pushs GitHub ne mettent donc pas automatiquement le site à jour. Regrouper les changements et les tester localement avant toute publication. Pour une prochaine mise en ligne, réactiver les builds dans les réglages Netlify, déclencher un seul déploiement, puis les arrêter à nouveau. Le site existant reste accessible lorsque les builds sont arrêtés.

Le site et la phonétisation sont hébergés ensemble sur Netlify. Aucune base Supabase ni clé d’API n’est nécessaire. Le moteur eSpeak NG est exécuté dans les fonctions Node.js via le paquet `ephone`, avec les données françaises.

1. Pousser les fichiers du projet sur le dépôt GitHub `stanislas-brossette/Lumi-LPC`.
2. Dans Netlify, choisir **Add new project → Import an existing project**, puis sélectionner ce dépôt.
3. Vérifier les réglages détectés depuis `netlify.toml` : commande `npm run build`, dossier publié `dist`, fonctions `netlify/functions`, Node.js 24.
4. Déployer et ouvrir l’URL HTTPS fournie par Netlify.
5. Tester une phrase absente des exemples : avec la voix, le bandeau doit afficher « Piper · Siwis · voix locale ». Sans voix, le serveur eSpeak phonétise le texte. `/api/health` doit renvoyer un JSON avec `engine`.

Un simple dépôt du dossier `dist` par glisser-déposer ne suffit pas : les fonctions doivent aussi être déployées. L’utilisation des fonctions est soumise aux quotas et à la facturation du compte Netlify.

Pour vérifier les fonctions et générer le site en local :

```bash
npm ci
npm test
npm run build
```

Les tests appellent les fonctions avec de vraies requêtes et vérifient que les transcriptions françaises sont acceptées par le moteur LPC. Les tests du lecteur génèrent de vrais audios français et vérifient leurs horodatages, puis simulent la position audio pour contrôler pause/reprise, annulation, vitesse et boucle. Le rendu sonore et le calage perçu restent à vérifier sur les appareils visés. Le déploiement doit ensuite être vérifié sur Netlify.

## Installation sur smartphone (PWA)

Lumi est une application web installable. Depuis le site en ligne (HTTPS) :

- **Android (Chrome, Edge, Samsung Internet)** : bouton « Installer Lumi » dans le Guide, ou menu du navigateur → « Installer l’application ».
- **iPhone / iPad** : ouvrir le site dans Safari, Partager → « Sur l’écran d’accueil ».

L’application s’ouvre alors en plein écran avec son icône. Après une première visite, elle fonctionne **hors connexion, voix et phrases libres comprises** : la phonétisation est calculée dans le navigateur par Spellophone et les sons proviennent de la banque vocale incluse. Sans voix, le hors-ligne se limite au lexique embarqué, puisque `/api/phonemize` n’est pas joignable.

- `manifest.webmanifest` décrit l’application (nom, couleurs, icônes `icons/`, dont une icône *maskable* pour Android et `apple-touch-icon.png` pour iOS). Les PNG sont rendus depuis `icons/icon.svg` et `icons/maskable.svg`.
- `sw.js` est le service worker. Le build y injecte la liste des fichiers de voix, mis en cache dès l’installation ; la page et `speech-sync.mjs` sont servis réseau d’abord, cache en secours. Les appels `/api/` et les phrases ne sont jamais mis en cache.
- Le nom du cache contient la version de Lumi et celle de Spellophone (vérifié par les tests) : **augmenter `version` dans `package.json` à chaque publication** pour que les applications installées reçoivent les nouveaux fichiers de voix.
- Le service worker n’est enregistré qu’en HTTP(S) ; avec `server.py`, il est servi depuis `dist/` et nécessite donc `npm run build`.

## Fonctionnalités

- Saisie de phrases jusqu’à 300 caractères.
- Conversion en phonèmes à partir d’exemples et d’un lexique embarqués ; les mots inconnus sont signalés.
- Édition manuelle des phonèmes et choix de l’interprétation du schwa `/ə/`.
- Conversion des phonèmes en configurations de main et positions LPC.
- Lecteur réunissant, dans une même carte, la phrase écrite et sa prononciation clé par clé (mot et son en cours surlignés, sons déjà lus, barre de progression), l’avatar, la bande des clés et les commandes. Un clic sur un mot ou un son y mène. Avec la voix, chaque clé est rattachée au mot du texte d’où elle vient grâce aux événements de mots d’eSpeak ; sans voix, mots et prononciation ne sont associés que si leurs nombres concordent. Le lecteur tient sur un écran d’ordinateur portable (1280 × 800) comme sur un téléphone ; sur téléphone, « Préparer les clés » fait défiler jusqu’au lecteur.
- Lecture de la séquence avec voix française optionnelle, pause, navigation pas à pas, vitesse réglable et boucle. Lecture didactique à cadence régulière : chaque clé dispose de la même durée, avec transition animée, son associé, puis temps d’observation. Un clic sur une clé rejoue son son seul.
- Bouche animée : forme des lèvres pour chaque son, synchronisée avec la voix (ou avec la lecture visuelle seule).
- Avatar avec main droite vue de dos, transitions articulées et repères de position. Le mode miroir s’applique aussi aux illustrations du référentiel. Le repère dorsal est commun aux huit configurations : main redressée, pouce et index à gauche du dessin, auriculaire à droite. En position « ki » près de la bouche, l’index est au-dessus du majeur, avec les doigts repliés en dessous et le pouce replié masqué derrière la main.
- Clés répétées : quand deux clés successives ont la même configuration et la même position, la main « tape » la clé (elle recule vers le poignet en se rapprochant légèrement du spectateur, puis revient au contact au début du son). Ces clés sont marquées ↻ dans la séquence.
- Référentiel des huit configurations de main et des cinq positions.
- Conservation du dernier texte et des réglages dans le navigateur, avec une commande de réinitialisation dans l’aide.

## Utilisation

1. Choisir un exemple ou saisir une phrase, puis préparer sa prononciation.
2. Vérifier les phonèmes et les corriger si nécessaire dans l’éditeur, puis cliquer sur « Appliquer cette prononciation » pour préparer les clés et leurs sons. La saisie phonétique peut être utilisée seule, sans texte.
3. Laisser « Lire à voix haute » activé pour entendre la phrase avec le visuel, ou le désactiver pour observer les clés seules. La voix française Piper / Siwis et la voix de secours eSpeak sont incluses ; aucune voix système n’est nécessaire. La durée minimale est de 1,2 seconde par clé à ×1 (vitesse par défaut), donc 2,4 secondes à ×0,5. Si un extrait sonore est plus long, tous les créneaux de la phrase sont allongés de façon égale. Le ralenti ×0,25 laisse encore plus de temps.
4. Utiliser la pause pour suspendre la voix et le visuel. Changer la vitesse conserve la position de lecture et ralentit ensemble la voix et les clés. Un clic sur une clé ou les flèches rejoue uniquement son son ; le bouton Lire relance la séquence à partir de cette clé (ou du début si elle était terminée). La navigation vers une clé arrête la voix.

En mode autonome, les liaisons ne sont pas calculées automatiquement. Pour un mot absent du lexique, saisir sa transcription phonétique dans l’éditeur. Le symbole `|` permet de forcer une séparation ; les symboles non pris en charge bloquent la lecture et sont signalés.

## Phonétisation de texte libre

L’interface prévoit une connexion à une API sur la même origine :

| Route | Usage attendu par l’interface |
| --- | --- |
| `GET /api/health` | Détecter un moteur disponible via une réponse JSON contenant `engine`. |
| `POST /api/phonemize` | Envoyer `{"text":"Bonjour"}` et recevoir un JSON contenant `ipa` et `engine`. |

**Deux backends sont fournis : `server.py` pour une utilisation locale, et `netlify/functions/` pour Netlify.** Le serveur Python appelle eSpeak NG installé sur la machine ; les fonctions Netlify utilisent son port JavaScript avec la voix française. Les phrases libres, y compris les mots absents du lexique embarqué, les nombres et la ponctuation, sont traitées par ce moteur. La limite reste de 300 caractères par saisie. Si aucun serveur n’est détecté, l’application utilise son mode autonome.

## Limites du prototype

- La bouche est animée de façon schématique : une forme de lèvres par son français (ouverture, arrondi, étirement, lèvres closes pour p/b/m, dents sur la lèvre pour f/v), calée sur les durées de phonèmes prédites par Piper pour chaque extrait (ou les événements eSpeak en secours). En pause ou en pas à pas, elle montre la voyelle de la clé (ou sa consonne seule). Ces formes ne remplacent pas la lecture labiale d’une vraie personne. La voix Piper / Siwis est synthétique. Chaque clé utilise un des 329 extraits préparés à partir de ses phonèmes (consonnes, voyelles et combinaisons consonne-voyelle), puis placé dans un créneau de durée égale avec du silence avant et après. Ce traitement est identique pour les phrases automatiques et les transcriptions manuelles. L’articulation est modérément ralentie (facteur de durée 1,1), sans l’allongement artificiel des sons de l’ancienne voix. Les repères de bouche proviennent des durées du modèle, ajustées au rognage des extraits. En cas d’échec de chargement de la banque, toute la séquence revient à eSpeak avec un message explicite. Les sons ne sont pas répétés pour remplir le créneau. Le rythme de phrase est volontairement abandonné pour faciliter l’observation. Ce calage technique ne valide pas les gestes ni leur valeur pédagogique. Le son et le rendu visuel peuvent subir la latence de l’appareil, notamment avec un casque Bluetooth.
- Une transcription phonétique manuelle est également audible : chaque clé est synthétisée directement depuis ses phonèmes, indépendamment du texte original, même vide. Tous les sons du référentiel LPC ont un extrait, dont /ɥ/. En secours eSpeak, /ɥ/ est approximé par un /y/ bref et cette limite est signalée. La qualité perceptive et la fidélité phonétique de la banque restent à valider humainement. Les symboles hors référentiel bloquent la préparation au lieu d’être ignorés.
- La main est articulée en SVG : flexion des doigts, ouverture du pouce, déplacement et orientation évoluent ensemble. Le point de contact est interpolé pour éviter les sauts de paume lors d’un changement de doigt de référence. La géométrie reste une projection 2D schématique, sans validation pédagogique des gestes.
- eSpeak NG écrit la semi-voyelle /ɥ/ comme un /y/ (`plyi` pour « pluie »). Les transcriptions automatiques sont corrigées : un /y/ suivi d’une voyelle dans le même mot devient /ɥ/ (pluie, nuit, huit, nuage), sauf après consonne + l/r devant une voyelle autre que /i/ (cruel, truand). Une transcription manuelle n’est pas modifiée.
- Les transcriptions automatiques peuvent nécessiter des corrections, notamment pour les liaisons et les noms propres. Des mots étrangers peuvent produire des sons hors du système français : le lecteur les signale et demande une correction manuelle.
- Le prototype n’est pas un outil validé d’apprentissage autonome et ne remplace pas l’accompagnement d’un codeur LPC.

## Données et stockage

Le fichier embarque ses ressources visuelles et son lexique, sans bibliothèque ni police chargée depuis un tiers. La lecture vocale assemble une banque française Piper / Siwis hébergée avec Lumi (environ 5,6 Mo d’audio PCM). Spellophone reste utilisé pour la phonétisation locale et la voix de secours eSpeak. L’assemblage de l’audio s’effectue dans le navigateur sans envoyer le texte à un fournisseur vocal. Quand la voix est activée, la préparation des clés utilise également ces phonèmes locaux. Aucun service vocal supplémentaire ni clé d’API ne sont ajoutés au projet.

Le texte et les réglages sont enregistrés dans le `localStorage` du navigateur. L’aide contient un bouton pour effacer ces données.

Lorsqu’une API de phonétisation est disponible, le texte lui est envoyé. Sur le site public, Netlify reçoit donc le texte et le traite avec eSpeak NG. Avec le serveur Python local, le traitement reste sur la machine. Le code de Lumi ne conserve pas les phrases et ne les écrit pas dans ses journaux ; l’hébergeur applique ses propres politiques de traitement et de journalisation.

## Organisation et développement

```text
.
├── Lumi-LPC-V0.html   # Interface, moteur de règles, dessins et lexique
├── speech-sync.mjs   # Banque vocale, synthèse de secours et horodatages des clés
├── voices/           # Banque Piper / Siwis, repères et attribution
├── manifest.webmanifest # Description de l’application installable
├── sw.js              # Service worker : cache hors ligne
├── icons/             # Icônes de l’application (sources SVG et PNG)
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

Les tests de la main contrôlent notamment l’orientation projetée de « ki » d’après la référence photographique fournie, les huit poses, les 64 transitions, les changements de destination en cours de mouvement, la pause/reprise et le mouvement réduit. Pour une vérification manuelle, essayer un exemple, un mot hors lexique, une transcription manuelle et un symbole inconnu, puis contrôler la lecture, les réglages et la restauration après rechargement.

## Références

- [ALPC — Les clés du code LPC](https://alpc.asso.fr/les-cles-du-code-lpc/)
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng)
- [TextCueS / AutoCuedSpeech](https://auto-cuedspeech.org/textcues.html)

Lumi est un prototype indépendant, sans affiliation à l’ALPC. Il n’intègre pas le moteur TextCueS / Auto-CS / SPPAS et ne bénéficie pas de sa validation.

Le backend Netlify utilise [ephone](https://github.com/sjmik/ephone-js), un port d’eSpeak NG sous GPL-3.0-or-later. Le paquet est installé côté serveur avec sa licence et ses données de langues ; il n’est pas chargé dans le navigateur.

La phonétisation locale et la voix de secours utilisent [Spellophone](https://github.com/Spelling-Creator/spellophone), un port WebAssembly d’eSpeak NG sous GPL-3.0-or-later. Le build copie son moteur, sa licence et les données nécessaires dans `dist/assets/voice/`. Le chargement initial récupère ces fichiers depuis le même serveur, sans CDN. Le fichier HTML ouvert directement reste utilisable pour le visuel seul.

La voix principale clé par clé utilise une banque générée avec Piper / Siwis. Le modèle neuronal et Python ne sont nécessaires que pour régénérer les extraits ; le build Netlify copie les fichiers déjà présents dans `voices/`. Voir [la provenance, les réglages et la procédure de génération](voices/README.md). La banque est incluse dans le cache hors ligne de la version 0.2.1.

Le contrôle de la voix et la correction des six consonnes explosives isolées sont décrits dans [le rapport du 25 octobre](docs/voice-audit-2026-10-25.md). Le serveur local propose `/voice-review.html` pour écouter et comparer les sons.

## Lecture naturelle (première version)

Le sélecteur **Lecture** ajoute « Phrase naturelle » au mode « Clé par clé ». Les mêmes extraits Piper / Siwis sont enchaînés sans les créneaux d’observation : aucun modèle ni dépendance supplémentaire. Les clés et la bouche suivent les durées et repères des extraits, avec une pause de 180 ms à la ponctuation ou après un `|` explicite. La pause, le ralenti, la boucle et les corrections phonétiques restent disponibles. Les raccords restent perceptibles ; ce montage n’apporte pas encore la prosodie d’une phrase synthétisée d’un seul tenant. eSpeak reste une voix de secours signalée si la banque est indisponible. Voir [le fonctionnement et les limites](docs/natural-reading.md).

## Explorer les sons

L’onglet **Les sons** présente les 35 phonèmes de base pris en charge par Lumi :
21 consonnes et semi-voyelles, 14 voyelles. Chaque fiche réunit l’écoute Siwis,
le visage et la clé, ainsi qu’un mot courant dont les lettres utiles sont
surlignées. La recherche accepte un symbole ou un mot ; un filtre distingue les
voyelles des consonnes. « Coder ce mot » ouvre sa transcription explicite dans
le simulateur. La simple consultation préserve la phrase en cours.

Le catalogue reprend l’inventaire LPC, sans ajouter le /ɑ/ ni traiter /ə/ comme
un son distinct : le choix du e prononcé reste dans le simulateur. Les variantes
régionales de « brun » et l’emprunt « parking » sont signalés. Les 329 unités de
la banque comprennent aussi les combinaisons consonne-voyelle ; elles restent
accessibles dans le simulateur et l’outil local de contrôle de voix.

Les modules du catalogue font partie du cache hors ligne de la version 0.4.0.
Le son nécessite le site ou le serveur local ; l’ouverture directe en `file://`
conserve le simulateur historique, mais ne charge pas cet explorateur en module.

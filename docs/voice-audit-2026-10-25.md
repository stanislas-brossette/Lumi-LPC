# Contrôle de la banque vocale — 25 octobre 2026

## Déclencheur et résultat

L'utilisateur signale que le /b/ de « bien » ressemble à /v/. Le phonétiseur
renvoie /bjɛ̃/, codé par Lumi en deux unités : /b/ puis /jɛ̃/. C'est donc la
consonne isolée, et non la syllabe /bɛ̃/, qui doit être examinée.

Le /b/ initial dure 310 ms et présente une enveloppe continue décroissante.
La nouvelle unité est extraite de /ʒə dˈi abˈa/ : elle dure 69 ms et conserve
la fermeture voisée suivie d'une attaque brève. Sa dernière fenêtre de 25 ms
a une énergie RMS environ quatre fois supérieure à la partie précédente.
Cela corrige le profil acoustique suspect ; l'identification perceptive de
/b/ doit encore être confirmée à l'écoute.

La même méthode est appliquée aux six explosives isolées /p b t d k g/.
Les 323 autres extraits sont identiques, échantillon par échantillon, à la
première banque. Les pauses didactiques et les clés LPC ne changent pas.

## Méthode et limites du contrôle global

Les 329 unités de la banque initiale ont été soumises séparément à un modèle
de reconnaissance phonétique indépendant :
`facebook/wav2vec2-xlsr-53-espeak-cv-ft`, révision
`2c733782da5604684829819a5eb744c193fe9398`.
L'inférence a lieu localement à 16 kHz, avec normalisation et marges identiques.
L'outil est conservé dans `scripts/audit-key-voice.py`.

La reconnaissance produit 278 différences de transcription sur les sons
isolés, y compris des confusions sur des sons de référence produits dans des
phrases normales. **Ce nombre n'est pas un nombre de sons incorrects** : le
modèle n'est pas suffisamment fiable sur des extraits si courts pour valider
ou rejeter automatiquement le corpus. Le /b/ initial est transcrit /ð/ :
cela concorde avec un son fricatif suspect, sans prouver spécifiquement /v/.

Une variante complète de génération/extraction en phrase porteuse a aussi été
testée. Elle améliore certains débuts de consonnes mais dégrade d'autres unités
selon ce contrôle ; elle n'a donc pas été retenue pour l'ensemble du corpus.
Seule la correction ciblée des explosives isolées est intégrée.

Les contrôles structurels couvrent la présence des 329 unités, leurs limites,
leur énergie, l'absence de saturation et la cohérence des repères temporels.
Le test de régression des explosives impose une durée inférieure à 150 ms
et une attaque émergeant de la fermeture. Ces conditions ne suffisent pas à
certifier le lieu d'articulation ni la valeur pédagogique d'un son.

Les nasales /ɛ̃ ɑ̃ ɔ̃ œ̃/, les glissantes /j w ɥ/ et les consonnes rares /ɲ ŋ/
restent notamment à vérifier à l'écoute. La présence d'un symbole dans le
vocabulaire d'entrée de Piper ne garantit pas sa bonne réalisation acoustique.
**Aucune validation humaine complète des 329 unités n'est revendiquée.**

## Vérification à l'écoute

Après `npm run build` et `python3 server.py`, ouvrir `/voice-review.html`.
La page compare les anciens et nouveaux sons, inclut le contraste /b/-/v/
et donne accès à toute la banque. Elle n'est pas incluse dans le site publié.

Comparer aussi « bien », « bientôt », « pied », « dieu », « clé » et « glace »
dans le lecteur. Ces mots comportent une explosive codée seule, avant un autre
son. Le /b/ de « bonjour », lui, appartient à /bɔ̃/ et n'est pas modifié.

## Traçabilité

- Ancien WAV : `bca646818e6d4fea8f739dc567aee28b07ad7dddf7fccb3ce72961e968173d67`.
- WAV corrigé : `1b1c92e6e0513246ed06622c113058e18ba5f82ae905c52ed243d737842f4477`.
- Les six anciennes explosives et /v/ sont conservés dans
  `tests/fixtures/voice-stops-before.wav`, avec leur manifeste et l'empreinte
  du corpus d'origine. Même provenance et attribution que la banque Siwis.
- Le manifeste actuel conserve la phrase source et les bornes d'extraction
  des unités réparées ainsi que l'empreinte de la banque avant réparation.
- Cache PWA porté à 0.2.1 pour renouveler les fichiers de voix déjà installés.

## Ajout : /to/ signalé comme « ste »

L'utilisateur signale que l'unité /to/ ressemble à « ste ». L'extrait isolé
initial durait 434 ms, dont 291 ms avant le repère de voyelle prédit par le
modèle. Il est remplacé par une extraction de /ʒə dˈi tˈo ./ : 171 ms au total,
avec un repère de voyelle à 101 ms. Cela réduit l'attaque anormalement longue.
Le même reconnaisseur indépendant transcrit l'ancien extrait /s t e/, ce qui
concorde avec le signalement. Il lit /ʒ d i t o/ dans la nouvelle phrase porteuse,
mais /t u5/ dans sa découpe isolée. Ce résultat ambigu ne certifie donc pas
l'identité de la voyelle : la conformité perceptive à /to/ doit encore être
confirmée par l'utilisateur.

Les 328 autres unités restent identiques échantillon par échantillon à la
banque précédente. L'ancien /to/ rejoint les fixtures de comparaison locales ;
`/voice-review.html` le présente en premier avec les boutons « Avant » et
« Voix actuelle ». `--repair-key to` permet une régénération ciblée. Les repères
et les empreintes sont mis à jour, ainsi que le cache PWA (0.3.1). Les deux
modes de lecture utilisent ce même extrait corrigé.

Nouveau WAV : `f19fe2d7cb807180ac21fc6cff12059470fe73cec1fe5f0b17a787b2acea2c0a`.

## Nouvelle passe : 21 consonnes et semi-voyelles

Déclencheurs utilisateur : /l/ perçu comme « tch », /z/ comme « f », /ʒ/ de
« jardin » comme « v », et /ŋ/ de « parking » jugé bizarre. Les 21 unités ont
été comparées à des productions en contexte ; l'essai a ensuite suivi la
suggestion de l'utilisateur : ajouter /ø/ (eu de « jeu »), puis retirer l'appui.

Deux contextes ont été essayés par son : /ʒə dˈi Cˈø ./ et /ʒə dˈi aCˈø ./.
La coupe retenue est conservatrice : elle s'arrête avant le segment accentué
précédant la voyelle du modèle, car attendre le début du seul identifiant /ø/
laissait parfois entendre une partie de la voyelle. L'alignement est une
prédiction de durée, pas une frontière acoustique certifiée.

Dix unités sont remplacées ; les 319 autres PCM restent identiques. Les
consonnes explosives déjà corrigées et /f v s ʁ/ sont conservées. /ɥ/ reste
inchangé, faute de variante Siwis suffisamment convaincante dans ce contrôle.
Les 294 combinaisons consonne-voyelle et les 14 voyelles ne changent pas.

| Son | Décision | Avant | Après |
| --- | --- | ---: | ---: |
| /p/ | Conservé | 104 ms | 104 ms |
| /d/ | Conservé | 104 ms | 104 ms |
| /ʒ/ | Remplacé | 263 ms | 109 ms |
| /k/ | Conservé | 127 ms | 127 ms |
| /v/ | Conservé | 169 ms | 169 ms |
| /z/ | Remplacé | 101 ms | 98 ms |
| /s/ | Conservé | 92 ms | 92 ms |
| /ʁ/ | Conservé | 93 ms | 93 ms |
| /b/ | Conservé | 69 ms | 69 ms |
| /n/ | Remplacé | 273 ms | 133 ms |
| /ɥ/ | Conservé | 146 ms | 146 ms |
| /m/ | Remplacé | 180 ms | 63 ms |
| /t/ | Conservé | 93 ms | 93 ms |
| /f/ | Conservé | 226 ms | 226 ms |
| /l/ | Remplacé | 266 ms | 63 ms |
| /ʃ/ | Remplacé | 211 ms | 156 ms |
| /ɲ/ | Remplacé | 261 ms | 89 ms |
| /w/ | Remplacé | 190 ms | 75 ms |
| /g/ | Conservé | 93 ms | 93 ms |
| /j/ | Remplacé | 355 ms | 43 ms |
| /ŋ/ | Remplacé | 283 ms | 189 ms |

/l z ʒ n m ʃ w/ utilisent la coupe après génération avec /ø/. /ɲ/ et /j/
utilisent une coupe en contexte /a/, plus exploitable que leur essai /ø/.
Le /ŋ/ de Siwis restait instable dans tous les contextes essayés. Son nouvel
extrait provient d'eSpeak NG : /ŋø/, coupé au début mesuré de /ø/ (sans voyelle
d'appui conservée). Le changement de moteur est signalé dans les deux modes
et la bibliothèque. Le seul extrait /ŋ/ change de timbre.

La reconnaissance indépendante retrouve notamment l'ancien /ʒ/ comme /f/ et
l'ancien /l/ comme /t uː s/. Cela soutient le besoin de contrôle sans prouver
les perceptions exactes. Les nouveaux extraits courts restent souvent non
reconnus ou confondus. **Ce n'est ni une certification de prononciation ni une
validation humaine. /ɥ/ et la nouvelle réalisation de /ŋ/ restent à écouter.**

`voices/consonant-audit.json` conserve les décisions des 21 sons, les résultats
automatiques avec leurs limites, les empreintes et les bornes des coupes.
Les anciens sons, les coupes retenues et leurs contextes sont archivés dans
la fixture locale, exclue du build Netlify. Pour écouter, ouvrir
`/voice-review.html` : « Avant », « Voix actuelle », « Phrase avec appui ».

La commande `generate-key-voice.py --apply-reviewed-consonants` réapplique les
coupes archivées exactement, sans nouvelle synthèse. Elle est à lancer après
une régénération du corpus pour conserver ces corrections. Les tests vérifient
les empreintes, l'identité des 319 autres unités et les bornes de coupe ; ils
ne remplacent pas l'écoute. Cache PWA 0.4.3 ; le chargement versionné évite la
réutilisation de l'ancienne banque pendant une mise à jour du service worker.

## Correction ciblée suivante : /pa/

Le /pa/ de « papa », signalé comme un /a/, est régénéré en contexte puis coupé
en conservant la fermeture avant le relâchement. La nouvelle borne ne suit
pas aveuglément l’alignement tardif du modèle. Les 328 autres unités restent
identiques. Détails, limites et reconnaissance indépendante :
[enchaînements et /pa/](connected-speech.md). L’ancien /pa/ est ajouté à l’archive
de comparaison ; les coupes de consonnes de la passe précédente sont inchangées.

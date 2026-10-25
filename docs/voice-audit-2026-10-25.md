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

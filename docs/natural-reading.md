# Lecture continue — première version

Le choix « Phrase naturelle » enchaîne les mêmes extraits Piper / Siwis que le
mode « Clé par clé », sans les créneaux réguliers d’observation. Le mode clé par
clé reste sélectionné par défaut.

## Audio et synchronisation

- Aucun moteur, modèle ni téléchargement supplémentaire. La banque incluse
  fonctionne dans le navigateur, hors ligne après mise en cache de Lumi.
- Chaque clé garde son extrait complet, avec un fondu de 4 ms sur les bords
  pour limiter les clics. Aucun chevauchement ne masque l’attaque des consonnes.
  Les gestes suivent les durées des extraits et la bouche leurs repères Siwis.
- Seule la ponctuation ou un `|` explicite ajoute une pause de 180 ms. Les
  frontières de mots ne créent pas de pause. À ×1, les sons gardent leur durée
  d’origine ; aucune cadence de 175 mots par minute n’est imposée.
- Pause, ralenti, boucle et reprise suivent l’horloge audio. Cliquer sur une clé
  rejoue son extrait, avec les mêmes repères de bouche.
- Les clés automatiques et les transcriptions manuelles utilisent la même banque.
  Le mode choisi est conservé avec les réglages. Changer de mode prépare de
  nouveau l’audio et écarte les résultats devenus obsolètes.
- Si la banque ne charge pas, toute la phrase revient à eSpeak avec un message
  explicite. Ce secours conserve son waveform complet et ses événements réels.
  Les transcriptions manuelles y sont vérifiées phonème par phonème.

## Limites et vérification

Le timbre est identique entre les deux modes (avec une exception signalée pour le son isolé /ŋ/, extrait d’eSpeak), mais les raccords entre extraits
restent perceptibles. Ce montage ne fournit pas la coarticulation ni la prosodie
d’une voix de phrase. Une vraie synthèse de phrase Siwis demanderait un moteur
et un modèle supplémentaires ; elle reste hors de cette première version.
La banque possède /ɥ/ ; seul le secours eSpeak l’approche par /y/ et le signale.
Le minutage des gestes reste schématique et demande une validation humaine et
pédagogique. Utiliser le ralenti pour mieux observer les gestes.

Les tests contrôlent la provenance des sons, les durées cumulées, les repères de
bouche, les pauses explicites, le secours et le pilotage audio. Ils ne certifient
pas la qualité perceptive de la voix. Aucun déploiement Netlify n’est effectué.

# Lecture continue — première version

Le choix « Phrase naturelle » conserve le rythme de la phrase eSpeak complète,
à 175 mots par minute à ×1. Le mode « Clé par clé » reste sélectionné par défaut
et garde sa banque Piper / Siwis et ses créneaux d’observation.

## Audio et synchronisation

- Aucun moteur, modèle ni téléchargement supplémentaire. Le moteur eSpeak déjà
  embarqué calcule la phrase dans le navigateur, y compris hors ligne après mise
  en cache de Lumi.
- Le WAV complet conserve exactement les échantillons synthétisés, sans montage
  ni silence ajouté. Les clés suivent les débuts de phonèmes fournis par eSpeak ;
  les repères de bouche suivent les mêmes événements. Les mouvements de main
  sont raccourcis lorsque les clés passent vite.
- La pause, le ralenti, la boucle et la reprise suivent toujours l’horloge audio.
  Cliquer sur une clé joue une découpe de la phrase ; de petits fondus limitent
  les clics de coupe, uniquement sur ces extraits.
- La transcription manuelle est synthétisée en un seul appel phonétique. Les
  espaces gardent les frontières de mots, `|` force une pause. Le nombre et
  l’ordre des phonèmes émis sont vérifiés avant de permettre la lecture.
- Le mode choisi est conservé avec les réglages. Changer de mode prépare de
  nouveau l’audio et écarte le résultat d’une préparation devenue obsolète.

## Limites

Le rythme est continu, le timbre reste synthétique et robotique. Le mode n’est
pas présenté comme une voix humaine. eSpeak approche /ɥ/ par un /y/ bref ; un
message le signale. Les extraits de clés gardent la coarticulation de leur
contexte et ne remplacent pas les sons didactiques isolés. Le minutage des gestes
reste schématique et demande une validation humaine et pédagogique. Les gestes
peuvent être difficiles à observer à ×1 : utiliser le ralenti.

Les tests vérifient le WAV inchangé, les repères réels, les transcriptions,
les pauses, le pilotage audio et les transitions rapides. Ils ne certifient pas
la qualité perceptive de la voix. Aucune publication Netlify n’est effectuée.

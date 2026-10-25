# Enchaînement entre mots et correction de /pa/

La phrase « il a réussi son examen » contenait déjà le /n/ de liaison dans
la sortie eSpeak : `il a ʁeysi sɔ̃n ɛgzamɛ̃|`. Le codeur traitait cependant
chaque espace comme une barrière au regroupement consonne-voyelle. Les sons
/l/ et /n/ étaient donc codés seuls, puis suivis de /a/ et /ɛ/ seuls.

La sortie devient `ila ʁeysi sɔ̃nɛgzamɛ̃|` : dix clés, dont /la/ et /nɛ/.
Le problème corrigé est le regroupement des sons déjà présents, sans création
d’une consonne supplémentaire. L’enchaînement d’une consonne toujours prononcée
et la liaison d’une consonne habituellement muette sont distingués par
[l’OQLF](https://vitrinelinguistique.oqlf.gouv.qc.ca/23541/la-prononciation/liaisons/la-liaison).

Les horodatages viennent toujours des événements eSpeak : la clé commence
sur sa consonne et la bouche passe à la voyelle sur son événement. Les mots
écrits restent distincts ; une clé traversant deux mots surligne les deux.
Les clés et l’audio utilisent cette règle en mode didactique et continu. La
saisie manuelle accepte aussi cet enchaînement ; `|` le bloque et force une
pause. L’automatique respecte les interruptions signalées par le moteur,
notamment ses marqueurs de h aspiré. Si la phonétisation omet une liaison ou
se trompe sur une pause, la correction manuelle reste nécessaire. Ce changement
ne prétend pas résoudre toute la grammaire des liaisons du français.

## /pa/ de papa

L’extrait isolé a été remplacé par une extraction de /ʒə dˈi pˈa ./.
La borne de début du modèle était trop tardive pour conserver la fermeture
et le relâchement du /p/. La nouvelle coupe conserve 100 ms avant cette borne ;
l’ouverture de bouche suit une montée d’énergie mesurée après la fermeture.
La période initiale de 60 ms a une énergie RMS inférieure à 12 % du RMS global.
Ce contrôle protège la fermeture ; il ne certifie pas la perception du /p/.

La reconnaissance indépendante ne donne pas de transcription exploitable pour
l’ancien extrait. Elle retrouve /p a/ dans le nouveau contexte mais /b a/ dans
la découpe isolée : cette ambiguïté ne constitue pas une validation humaine.
L’ancien /pa/ est archivé pour comparaison sur `/voice-review.html` ; les 328
autres extraits restent identiques. Les empreintes et le contrôle de conservation
sont dans `tests/fixtures/voice-pa-before.json` et les tests de banque vocale.
La version de cache est 0.4.4. Aucun déploiement n’est effectué par cette correction.

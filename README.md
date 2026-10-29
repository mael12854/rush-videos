# Rush — la plateforme vidéo sans pub

Site : https://rush-videos.vercel.app

Rush est une plateforme vidéo généraliste **sans aucune publicité** : accueil par catégories, lecteur avec barre de progression déplaçable, commentaires, abonnements, recherche, Shorts verticaux, publication de vidéos, plusieurs chaînes par compte, suppression de vidéos et de chaînes. Thème clair/sombre qui suit l'appareil.

## Installer comme une app (mobile)

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

L'app s'ouvre en plein écran, sans barre de navigateur, avec son icône et sa barre d'onglets en bas.

## Où sont les données ?

Tout le code est dans ce dépôt. Il n'y a **aucun serveur ni base de données externe** : les comptes, chaînes, vidéos et commentaires sont enregistrés dans le navigateur (IndexedDB) de chaque appareil.

Conséquence : une vidéo publiée sur un appareil n'est visible que sur cet appareil. Pour que tout le monde voie les mêmes vidéos, il faudra brancher un stockage partagé (base de données + stockage de fichiers).

Le compte du propriétaire (`mael.domenech@gmail.com`) est créé automatiquement au premier lancement. Le mot de passe n'est stocké que sous forme hachée (PBKDF2-SHA256).

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # sortie dans dist/
```

Stack : Vite + React + TypeScript, `idb` pour IndexedDB. Déploiement : Vercel (projet `rush-videos`, à chaque push sur `main`).

## Organisation

- `src/lib/` — stockage (`db.ts`), comptes (`auth.ts`), état global et actions (`store.tsx`), routage, formats.
- `src/components/ui.tsx` — carte vidéo, avatars, boutons, modale de confirmation.
- `src/screens/` — Accueil, Lecteur, Chaîne, Recherche, Abonnements, Publier, Mon compte, Shorts, Connexion.
- `public/` — manifeste PWA, service worker, icônes.
- `docs/design/` — maquettes de référence Claude Design (`Rush.dc.html`, `VideoCard.dc.html`, `support.js`), handoff et transcription.

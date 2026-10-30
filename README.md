# Rush — la plateforme vidéo sans pub

Site : https://rush-videos.vercel.app

Rush est une plateforme vidéo généraliste **sans aucune publicité** : accueil par catégories, lecteur avec barre de progression déplaçable, commentaires, abonnements, recherche, Shorts verticaux, publication de vidéos, plusieurs chaînes par compte, suppression de vidéos et de chaînes. Thème clair/sombre qui suit l'appareil.

## Installer comme une app (mobile)

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

L'app s'ouvre en plein écran, sans barre de navigateur, avec son icône et sa barre d'onglets en bas.

## Où sont les données ?

Tout le code est dans ce dépôt. Les données sont en ligne, chez Vercel, et partagées entre tous les appareils :

- **Base Postgres (Neon)** : comptes, chaînes, vidéos (titres, descriptions…), commentaires, abonnements, J'aime. Variable `DATABASE_URL`.
- **Vercel Blob** : fichiers vidéo, miniatures, icônes et bannières de chaînes. Variable `BLOB_READ_WRITE_TOKEN`.

Ces deux variables sont ajoutées automatiquement quand le stockage est relié au projet dans Vercel (onglet *Storage*). Les tables sont créées toutes seules au premier appel.

Le compte du propriétaire (`mael.domenech@gmail.com`) est créé au premier lancement, avec sa chaîne. Les mots de passe sont hachés (PBKDF2-SHA256), jamais stockés en clair.

**Ancienne version** : avant la mise en ligne, les chaînes étaient enregistrées dans le navigateur. En se connectant sur l'appareil concerné, « Mon compte » propose de les **mettre en ligne** (chaînes, icônes, bannières et vidéos).

## Développement

```bash
npm install
npm run dev      # http://localhost:5173 (API comprise)
npm run build    # sortie dans dist/
```

Stack : Vite + React + TypeScript. API : une fonction Vercel (`api/index.ts`). Sans `DATABASE_URL` ni Blob, `npm run dev` utilise une base Postgres locale (PGlite) et un dossier `.data/` : rien à installer. Déploiement : Vercel (projet `rush-videos`, à chaque push sur `main`).

## Organisation

- `api/index.ts` — serveur : comptes, sessions, chaînes, vidéos, commentaires, envois de fichiers.
- `src/lib/` — état global et appels à l'API (`store.tsx`), import de l'ancienne version (`legacy.ts`, `db.ts`), routage, formats.
- `src/components/ui.tsx` — carte vidéo, avatars, boutons, modale de confirmation.
- `src/screens/` — Accueil, Lecteur, Chaîne, Recherche, Abonnements, Publier, Mon compte, Shorts, Connexion.
- `public/` — manifeste PWA, service worker, icônes.
- `docs/design/` — maquettes de référence Claude Design (`Rush.dc.html`, `VideoCard.dc.html`, `support.js`), handoff et transcription.

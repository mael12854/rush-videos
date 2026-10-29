# Handoff : Rush — plateforme vidéo sans pub

**Nom du produit : Rush** (logo : carré arrondi corail avec triangle « play » + mot-symbole `rush` en minuscules)

## ⚠️ Règle n°1 : TOUT dans le repo GitHub `mael12854/rush-videos`

**Tout le projet doit être stocké dans le dépôt GitHub `mael12854/rush-videos`** (https://github.com/mael12854/rush-videos) :

- tout le code source (front, back, mobile si app) ;
- la configuration (build, déploiement, variables d'exemple `.env.example` — jamais les secrets réels) ;
- les migrations / schéma de base de données ;
- la documentation (ce README compris, à placer dans `docs/design/`) ;
- les fichiers de design de référence (`Rush.dc.html`, `VideoCard.dc.html`, `support.js`) dans `docs/design/` ;
- les assets (logo, icônes, polices si auto-hébergées).

Rien ne doit vivre en dehors de ce repo (pas de code dans un autre dépôt, pas de fichiers uniquement en local). Commits réguliers, branche par défaut `main`. Les vidéos uploadées par les utilisateurs vont dans un stockage objet (S3/R2…), mais **le code et la configuration de ce stockage** sont dans le repo.

## Overview
Rush est une plateforme vidéo généraliste **sans aucune publicité** (ni avant, ni pendant, ni après la vidéo). Fonctions : fil d'accueil avec catégories, lecteur avec barre de progression déplaçable, commentaires, abonnements, recherche, Shorts verticaux, publication de vidéo, **plusieurs chaînes par compte**, suppression de vidéos / de chaînes. Cible : site desktop + mobile (responsive), puis éventuellement app.

## About the Design Files
Les fichiers de ce paquet sont des **références de design en HTML** — des prototypes montrant l'apparence et le comportement voulus, pas du code de production à copier. La tâche est de **recréer ces designs** dans une vraie stack. Aucune stack n'existe encore : choisir la plus adaptée (recommandé : Next.js + TypeScript, Postgres, stockage objet pour les vidéos, transcodage HLS). Le prototype s'ouvre dans un navigateur (`Rush.dc.html`, avec `support.js` et `VideoCard.dc.html` à côté).

## Fidelity
**High-fidelity.** Couleurs, typo, espacements, rayons et interactions sont finaux. Les vignettes sont des fonds dégradés de substitution : à remplacer par les vraies miniatures des vidéos. Données (vidéos, chaînes, commentaires) fictives.

## Layout global
- **Desktop (≥ 760 px)** : header sticky 64 px (fond `--head` + `backdrop-filter: blur(14px)`) ; sidebar gauche 236 px sticky (hauteur `100vh - 64px`) ; contenu `padding: 8px 28px 64px`.
- **Mobile (< 760 px)** : largeur max 440 px, pas de sidebar ; header avec boutons « Chercher » + thème ; **barre d'onglets en bas** sticky 64 px, 5 colonnes : Accueil · Shorts · **+** (pastille accent → Publier) · Abonnements · Vous. Contenu `padding: 4px 16px 40px`.

### Header (desktop)
- Logo : carré 30×30, radius 9, fond `--accent`, triangle `--onaccent` ; texte `rush` 22px/700, letter-spacing −0.04em. Zone logo 212 px de large.
- Recherche centrée : max 580 px, hauteur 42, radius 999, fond `--surface2`, padding gauche 20 ; bouton « Chercher » 32 px, fond `--hover`, 13px/600. Entrée → écran Recherche.
- Droite : bouton thème (texte « Clair »/« Sombre », couleur `--muted` → `--text` au survol) ; bouton « Publier » (38 px, radius 999, fond accent, 700) ; avatar 38 px rond « MO » → Mon compte.

### Sidebar
- Items 42 px, radius 12, padding 0 14, 600. Actif : fond `--surface2`, texte `--text` ; inactif : `--muted`.
- Sections : [Accueil, Shorts, Abonnements] · « VOUS » [Mon compte, Publier une vidéo] · « ABONNEMENTS » (liste des chaînes suivies, avatar 22 px).
- Titres de section : 11px/600, uppercase, letter-spacing 0.1em, `--muted`.
- En bas : encart `--surface`, radius 14 : « Zéro pub. » (700) + « Ni avant, ni pendant, ni après la vidéo. » (12.5px, muted).

## Screens

### 1. Accueil
- Rangée de chips catégories scrollable : Tout, Musique, Gaming, Cuisine, Science, Sport, Tech, Humour, Voyage. Chip 34 px, radius 999, 13.5px/600. Actif : fond `--inv` / texte `--oninv` ; sinon `--surface2`.
- Grille vidéos `repeat(auto-fill, minmax(270px,1fr))`, gap 36px vertical / 20px horizontal. 8 premières vidéos, puis étagère Shorts (seulement sur « Tout »), puis le reste.
- **Carte vidéo** : vignette 16:9 radius 14 (léger scale 1.015 au survol) + durée en bas à droite (fond `rgba(8,8,10,.78)`, JetBrains Mono 11.5px/600, radius 6) ; dessous : avatar 36 px + titre 15px/600 lh 1.32 + « Chaîne · 1,1 M vues · il y a 3 jours » 13px muted.
- **Étagère Shorts** : titre « Shorts » 20px/700 + « moins d'une minute » 13px muted ; cartes 190 px (150 mobile), ratio 9:16, radius 16.
- Catégorie vide : « Rien dans cette catégorie pour l'instant. »

### 2. Lecteur (Watch)
- Grille `minmax(0,1fr) 380px` si largeur > 1180 px, sinon 1 colonne. Max 1500 px.
- **Player** 16:9, radius 16. Clic = lecture/pause. Bouton play central 76 px blanc quand en pause. Bas : dégradé noir, **barre de progression déplaçable** :
  - zone cliquable 18 px de haut, `touch-action: none` ;
  - piste 4 px (6 px pendant le glissement), `rgba(255,255,255,.22)`, partie lue `--accent` ;
  - **pastille ronde 16 px accent** à la position courante ;
  - clic n'importe où = saut à ce moment ; pointer down + glisser = scrub continu (pointer events sur `window` jusqu'au relâchement). Le clic sur la barre ne doit pas déclencher play/pause.
  - Libellés : « Lecture/Pause » + « 1:23 / 14:32 » (JetBrains Mono).
- Titre 22px/700, letter-spacing −0.02em.
- Ligne chaîne : avatar 42 + nom 15px/700 + « 412 k abonnés » ; bouton S'abonner (fond `--inv`) / Abonné (fond `--surface2`). Actions à droite : J'aime (toggle, actif = fond `--inv`), Partager, Enregistrer, et **« Supprimer cette vidéo »** (texte rouge `oklch(0.68 0.19 25)`) **uniquement si la vidéo appartient à l'utilisateur**.
- Description : bloc `--surface` radius 14, « vues · date » en gras, texte replié (1ʳᵉ ligne) / déplié au clic (« Plus » / « Moins »), chapitres.
- Commentaires : « N commentaires » 18px/700 ; champ pilule `--surface` + bouton « Envoyer » (accent si texte non vide, sinon grisé). Entrée = poster. Nouveau commentaire ajouté en haut.
- Colonne « À suivre » : vignette 168 px + titre 14px/600 + chaîne + méta ; vidéos de la même chaîne en premier.

### 3. Page de chaîne
- Bannière ratio 6:1 (min 110 px), radius 18. Avatar 96 px, nom 30px/700, « X abonnés · N vidéos », description.
- Chaîne d'un autre : bouton S'abonner. **Chaîne de l'utilisateur** : boutons « Supprimer les vidéos » et « Supprimer ma chaîne » (rouge) à la place.
- Onglets : Vidéos / Shorts / À propos (soulignement 2 px `--text` sur l'actif). États vides : « Aucune vidéo pour l'instant. », « Pas encore de Shorts sur cette chaîne. »

### 4. Recherche
- Recherche sur titre + nom de chaîne + catégorie (insensible à la casse). Sur mobile, champ en haut de l'écran.
- « N vidéos pour « requête » » ; résultats chaînes (carte `--surface` radius 16, avatar 72, bouton S'abonner) puis vidéos en ligne (vignette 240–360 px + titre 17px/600 + méta + chaîne + extrait).
- Sans requête : « Idées de recherche » (chips). Aucun résultat : « Aucun résultat. Essaie un autre mot. »

### 5. Abonnements
- Rangée d'avatars 64 px des chaînes suivies, puis « Dernières vidéos » (grille). Vide : « Tu n'es abonné(e) à aucune chaîne pour l'instant. »

### 6. Publier une vidéo
- Étape 1 : zone de dépôt pointillée radius 20 « Glisse ta vidéo ici » / « MP4, MOV ou WebM · jusqu'à 4 Go » / bouton « Choisir un fichier ».
- Étape 2 (formulaire, 2 colonnes auto-fit min 260) : **choix de la chaîne** (pilules avec avatar, une seule sélectionnée — attention : ne pas mettre ces boutons dans un `<label>`, sinon tous les clics vont au premier), Titre, Description, Visibilité (Public / Non répertoriée / Privée). À droite : aperçu, barre d'envoi (« Envoi… 42 % » → « Vidéo prête »), bouton Publier actif seulement si envoi à 100 % ET titre non vide ET chaîne valide. Mention « Aucune pub ne sera ajoutée à ta vidéo. »
- Étape 3 : « C'est en ligne. » / « Ta vidéo est publiée sur <chaîne>. » + « Voir la vidéo » / « En publier une autre ».

### 7. Mon compte (profil)
- Avatar 84 « MO », « Mon compte », stats : chaînes · vidéos · abonnements · vues récentes.
- **Mes chaînes** : grille de cartes (avatar 52, nom, « N vidéos · X abonnés ») → page de la chaîne ; carte pointillée « Nom de la nouvelle chaîne » + « Créer une chaîne » (Entrée aussi). **Un compte peut avoir autant de chaînes que voulu.**
- Historique (grille), Vidéos aimées (vide : « Les vidéos que tu aimes apparaîtront ici. »).

### 8. Shorts
- Lecteur vertical 9:16, hauteur `100vh - 100px` (desktop, radius 20) / `100vh - 140px` (mobile, radius 0).
- Bas : nom de chaîne + avatar 30 + bouton S'abonner blanc, titre. Droite : boutons ronds 52 px J'aime (actif = accent) + compteur, Partager.
- Navigation : flèches ↑/↓ à droite (desktop) + touches clavier ↑/↓ ; boutons « Précédent / Suivant » sur mobile ; compteur « 1 / 6 ». Boucle.

## Suppressions (toutes avec confirmation)
Modale : overlay `rgba(0,0,0,.55)`, carte `--surface` max 400 px radius 20, titre 19px/700, texte muted, boutons « Annuler » / « Supprimer » (fond `oklch(0.62 0.2 25)`, texte blanc). Clic hors carte = annuler.
- **Supprimer cette vidéo** → retire la vidéo (et de l'historique / des aimées), retour à Mon compte.
- **Supprimer les vidéos** → toutes les vidéos de la chaîne.
- **Supprimer ma chaîne** → chaîne + toutes ses vidéos ; si c'était la chaîne sélectionnée pour publier, basculer sur la première chaîne restante.
- Côté back : vérifier que l'utilisateur est propriétaire ; supprimer aussi les fichiers vidéo du stockage.

## Thème
- **Par défaut, suivre le réglage de l'appareil** (`prefers-color-scheme`), avec écoute des changements en direct.
- Le bouton du header force clair/sombre (persister ce choix, ex. localStorage / profil).

## State / données
- Utilisateur : `id`, chaînes possédées (1→N), abonnements, vidéos aimées, historique, préférence de thème.
- Chaîne : `id, ownerId, name, initials/avatar, banner, description, subscribersCount`.
- Vidéo : `id, channelId, title, description, category, duration, views, createdAt, visibility, thumbnail, fileUrl (HLS)`.
- Short : comme vidéo, format vertical < 60 s.
- Commentaire : `id, videoId, userId, text, createdAt, likes`.
- Upload : upload résumable avec progression réelle, puis transcodage.

## Design Tokens
Polices : **Instrument Sans** (400/500/600/700) pour l'UI, **JetBrains Mono** (400/500) pour durées / timecodes. Base 14px, antialiased.

Sombre :
- `--bg #0c0d0f` · `--head rgba(12,13,15,.85)` · `--surface #15161a` · `--surface2 #1d1f24` · `--hover #272930` · `--line #22242a`
- `--text #f2f2f3` · `--muted #8f929b` · `--accent oklch(0.74 0.16 32)` (corail) · `--onaccent #160805` · `--inv #f2f2f3` · `--oninv #0c0d0f`

Clair :
- `--bg #f7f7f6` · `--head rgba(247,247,246,.88)` · `--surface #ffffff` · `--surface2 #ececea` · `--hover #e1e1de` · `--line #e3e3e0`
- `--text #151619` · `--muted #5f6168` · `--accent oklch(0.66 0.17 32)` · `--onaccent #160805` · `--inv #151619` · `--oninv #f7f7f6`

Danger : texte `oklch(0.68 0.19 25)`, bouton `oklch(0.62 0.2 25)`.
Avatars : `oklch(0.8 0.11 <teinte de la chaîne>)`, initiales `#0e0f11` 700.

Rayons : 6 (badges), 9–10, 12 (inputs / nav), 14 (cartes vidéo, description), 16, 18, 20 (modales, player Shorts), 999 (boutons, chips).
Hauteurs de contrôles : 30, 34, 36, 38, 40, 42, 44. Gaps fréquents : 8, 10, 12, 14, 18, 20, 22, 28, 36.

## Assets
Aucune image réelle : vignettes, bannières et avatars sont des substituts (dégradés / initiales). Le logo est fait en CSS (à exporter en SVG). Polices : Google Fonts.

## Files
- `Rush.dc.html` — prototype complet (tous les écrans, logique, données d'exemple).
- `VideoCard.dc.html` — carte vidéo réutilisée.
- `support.js` — runtime nécessaire pour ouvrir le prototype dans un navigateur.

→ À committer dans `mael12854/rush-videos` sous `docs/design/`.

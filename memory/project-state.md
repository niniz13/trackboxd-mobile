---
name: project-state
description: État d'avancement de l'intégration API trackboxd-mobile ↔ trackboxd (Next.js)
metadata:
  type: project
---

L'app mobile Expo (trackboxd-mobile) consomme l'API Next.js du projet ../trackboxd via `constants/api.ts` (Bearer token JWT stocké dans SecureStore).

**Screens connectés à l'API réelle :**
- Auth (login, register, Google, logout) — `contexts/AuthContext.tsx`
- Feed — `app/(tabs)/index.tsx` — `/api/feed?mode=...`
- Discover — `app/(tabs)/discover.tsx` — `/api/spotify/search|trending|new-releases`
- Profile (journal + stats) — `app/(tabs)/profile.tsx` — `/api/feed?mode=mine`
- Activity — `app/(tabs)/activity.tsx` — `/api/activity`
- Album detail — `app/album/[id].tsx` — `/api/spotify/album/[spotifyId]` + `/api/feed?albumId=...`
- Log (création de review) — `app/log.tsx` — `/api/spotify/search` + `POST /api/reviews`

**Plus de dépendances aux données mock (constants/data) dans les écrans app/.**
TBAvatar et TBCover sont des composants orphelins (plus importés) qui dépendent encore de constants/data — ils peuvent être nettoyés ou supprimés plus tard.

**Format des IDs Spotify :** les albums ont un ID préfixé `sp_xxx` dans l'app mobile. L'écran album strip ce préfixe avant d'appeler `/api/spotify/album/[id]`.

**Why:** Continuer l'intégration initiée partiellement — auth + feed + discover étaient déjà connectés.
**How to apply:** Si de nouveaux écrans sont ajoutés, toujours utiliser `apiJson` de `constants/api.ts` avec le Bearer token auto-attaché.

## Nouvelles fonctionnalités ajoutées depuis le design (juin 2026)

- **Profil — streak hebdomadaire** : badge flamme 🔥 + "X sem." à côté du handle. Calculé dans `/api/user/profile` GET (backend).
- **Profil — abonnés/abonnements** : compteurs affichés inline à droite du nom/avatar. Données dans `/api/user/profile`.
- **Profil — "Mis en avant"** : jusqu'à 5 albums épinglés sur le profil. Picker bottom-sheet (FlatList 4 colonnes). Sauvegarde via `PUT /api/user/highlights`. Données retournées par `/api/user/profile`.
- **Profil — onglet Favoris** : grid 3 colonnes de tous les albums likés (reviews.filter(r => r.liked)).
- **Profil — ordre des onglets** : Journal · Favoris · Listes · Stats (avant : Diary · Stats · Listes).
- **Profil — Stats** : cartes Albums / Cette année / Note moy. ajoutées en haut de l'onglet Stats.
- **TBIcon** : icône `flame` ajoutée.

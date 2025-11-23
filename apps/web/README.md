# Navaud's Noel wishlists

Mobile-first Christmas wishlist app with simple PIN login (fixed family list), Firestore persistence, and anonymous reservations.

## Stack
- Next.js (App Router) + React 19
- Tailwind CSS v4
- Firebase Auth (email link) + Firestore
- pnpm workspace monorepo (`apps/web`)

## Setup
1) Install dependencies: `pnpm install`
2) Copy env template: `cp apps/web/.env.local.example apps/web/.env.local` and fill Firebase keys.
3) Run dev server: `pnpm dev` (serves `apps/web` on http://localhost:3000).
4) Lint: `pnpm lint`

## Firebase
- Firestore rules: `firebase deploy --only firestore:rules`
- Firestore indexes: `firebase deploy --only firestore:indexes`
- Hosting (Next.js with frameworks backend): `firebase deploy --only hosting`

## Data model
- `users/{userId}`: `email`, `displayName`, `createdAt`
- `wishlistItems/{itemId}`: `userId`, `title`, `description?`, `link?`, `imageUrl?`, `position?`, `reservedBy?`, `createdAt`

Reservations, noms et PIN:
- Login par sélection d'un prénom dans la liste fixe (Jean Louis, Crista, Pilou, Paul, Jules, JJ, Laurie, Marion) + code PIN.
- Au premier login pour un prénom donné, le PIN est créé et stocké en clair dans Firestore; ensuite il sert à valider la connexion. Le PIN peut être changé depuis le tableau de bord.
- Les items peuvent être réservés anonymement; le propriétaire ne voit jamais qui réserve.
- Les réservants peuvent libérer leur propre réservation; propriétaires ne peuvent pas toucher `reservedBy`.

## Auth flow (PIN)
1) Sur `/`, sélectionner un prénom dans la liste et saisir un PIN (création si première fois).
2) La session est mémorisée en localStorage pour revenir sans ressaisir immédiatement.
3) Dans le tableau de bord, possibilité de changer le PIN (visible en clair dans Firestore).

## Monorepo commands (root)
- `pnpm dev` – start the web app
- `pnpm build` – Next.js production build
- `pnpm lint` – run ESLint

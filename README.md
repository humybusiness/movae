# Movaé

**La pause active créée par des kinés pour les journées devant l’écran.**

Movaé est une PWA desktop-first pour télétravailleurs : un site vitrine premium sur `/`
et une application complète sur `/app`, avec un moteur d’analyse local qui recommande
la bonne micro-pause au bon moment. 100 % front-end : pas de backend, pas de compte,
pas de données qui quittent le navigateur.

> Movaé accompagne les pauses actives et l’hygiène de mouvement au travail.
> L’application ne remplace pas un avis médical.

---

## Démarrage

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # vérification TypeScript + build production dans dist/
npm run preview   # sert le build de production en local
npm run icons     # régénère les PNG (icônes PWA + og-image) sans dépendance
```

## Structure

```
public/               favicon.svg, og-image.(png|svg), robots.txt, icons/ (PWA)
scripts/              generate-icons.mjs (encodeur PNG maison, zéro dépendance)
src/
├── main.tsx, App.tsx      routage : "/" = landing, "/app" = application
├── styles/globals.css     thème Tailwind v4 « Calme Actif » + animations
├── lib/
│   ├── constants.ts       APP_URL, email de contact, disclaimer légal
│   ├── installPrompt.ts   gestion beforeinstallprompt + fallback
│   ├── notify.ts          notifications navigateur
│   └── time.ts            utilitaires dates/durées
├── landing/               site vitrine (sections, mockup CSS/SVG, données sourcées)
└── app/                   application Movaé
    ├── MovaeApp.tsx       shell : navigation, tick moteur, rappels, toasts
    ├── types.ts           types partagés (zones, état, thèmes)
    ├── engine/engine.ts   ★ moteur d’analyse (sollicitation, reco, Indice)
    ├── state/store.tsx    reducer + persistance localStorage (clé movae:v1)
    ├── data/              22 exercices, 6 programmes, 18 récompenses, 5 thèmes
    ├── components/        BreakPlayer, FigureVisual (SVG animé), IndexVisual…
    └── views/             Dashboard, Exercices, Programmes, Progression,
                           Récompenses, Réglages
```

## Le moteur intelligent (src/app/engine/engine.ts)

- Chaque **zone du corps** (yeux, nuque, épaules, dos, poignets, hanches, jambes,
  énergie) accumule une *sollicitation estimée* (0–100) pendant le travail, à un
  rythme modulé par le **style de travail déclaré** (clavier / visio / mixte /
  lecture) et le **moment de la journée** (creux post-déjeuner, fatigue visuelle
  du soir).
- L’**inactivité** (5 min sans clavier/souris, onglet visible) et les absences
  déclarées font *décroître* les tensions ; une longue absence clôt la journée.
- La **recommandation** croise pression corporelle et temps écoulé depuis la
  dernière pause → 5 niveaux d’urgence, choix de l’exercice ciblant les zones les
  plus sollicitées, avec rotation anti-répétition et bonus de discrétion en mode
  visio. Règle **20-20-20** gérée séparément pour les yeux.
- L’**Indice Movaé** (0–100) = 45 % régularité + 20 % couverture des zones +
  20 % constance (série) + 15 % équilibre (temps passé « en retard » de pause).

Tout est heuristique, local et transparent — aucun capteur, aucune caméra,
aucune prétention médicale.

## Comptes & connexion Google (optionnel)

Movaé fonctionne **sans compte** par défaut (données locales). Pour activer la
**connexion Google / e-mail** et la **synchronisation cloud** (progression qui suit
l’utilisateur d’un appareil à l’autre), il faut un projet **Firebase** gratuit —
c’est la seule étape que le code ne peut pas faire à votre place, car elle est liée
à votre compte Google.

### Mise en place (~5 min)

1. **Créer le projet** : https://console.firebase.google.com → *Ajouter un projet*.
2. **Activer l’authentification** : menu *Authentication* → *Get started* →
   onglet *Sign-in method* → activez **Google** et (optionnel) **E-mail/Mot de passe**.
3. **Créer la base** : menu *Firestore Database* → *Create database* → mode
   *production* → région Europe (`eur3`). Puis onglet *Rules*, collez :
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /movae/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. **Récupérer la config** : ⚙️ *Paramètres du projet* → *Vos applications* →
   icône Web `</>` → enregistrez l’app → copiez les valeurs `firebaseConfig`.
5. **Renseigner les variables** :
   - En local : copiez `.env.example` en `.env` et remplissez les `VITE_FIREBASE_*`.
   - Sur **Vercel** : *Settings → Environment Variables* → ajoutez les 6 variables
     (`VITE_FIREBASE_API_KEY`, `…AUTH_DOMAIN`, `…PROJECT_ID`, `…STORAGE_BUCKET`,
     `…MESSAGING_SENDER_ID`, `…APP_ID`) → *Redeploy*.
6. **Autoriser le domaine** : Firebase → *Authentication* → *Settings* →
   *Authorized domains* → ajoutez votre domaine Vercel (`movae-xxxx.vercel.app`
   et votre domaine final s’il existe). Sans ça, le popup Google renvoie
   `auth/unauthorized-domain`.

Tant que ces variables ne sont pas définies, l’écran de connexion n’apparaît pas :
l’app reste en mode local. Une fois définies, la connexion s’active toute seule,
avec un bouton **« Continuer sans compte »** pour rester en local.

## Modifier l’URL de l’app / les contenus

- **URL de l’app** : `src/lib/constants.ts` → `APP_URL` (par défaut `/app`).
- **Email de contact / démo** : même fichier → `CONTACT_EMAIL`.
- **Textes de la landing** : `src/landing/data.ts` (stats, fonctionnalités, FAQ,
  sources) et les sections dans `src/landing/sections/`.
- **Exercices / programmes / récompenses / thèmes** : `src/app/data/`.

## Tester le bouton « Télécharger Movaé »

1. `npm run build && npm run preview` (le service worker n’est actif qu’en build).
2. Ouvrir dans **Chrome ou Edge** : après quelques secondes, le navigateur émet
   `beforeinstallprompt` → le bouton déclenche la vraie installation.
3. Dans **Firefox / Safari**, l’événement n’existe pas → le bouton ouvre la
   modale d’instructions (comportement attendu, pas un bug).
4. Une fois installée, l’app s’ouvre sur `/app` en fenêtre autonome.

## Déploiement (Vercel)

- Framework : **Vite** — build `npm run build`, output `dist/`.
- `vercel.json` fournit la réécriture SPA (`/* → /index.html`) et un
  `Cache-Control: no-cache` sur `sw.js`.
- Aucun backend, aucune variable d’environnement.

## Limites connues (V1, assumées et documentées dans l’app)

- **Rappels** : les notifications ne se déclenchent que si Movaé est ouvert
  (onglet ou fenêtre installée, même en arrière-plan). Fenêtre fermée = pas de
  rappel. Une vraie planification hors-ligne demanderait un backend + Push API.
- **Prompt d’installation** : uniquement Chrome/Edge/Android ; iOS et Firefox
  passent par la modale d’instructions.
- **Suivi d’activité** : heuristique locale (journée déclarée + activité dans
  l’onglet). Movaé ne peut pas — et ne veut pas — observer les autres fenêtres.
- **og-image** : `og-image.png` est généré par script (motif sans texte) ;
  remplacez-le par une vraie capture marketing 1200×630 quand vous en aurez une.

## Prochaines améliorations recommandées

1. Import du fichier JSON exporté (la sortie existe, l’entrée pas encore).
2. Web Push + petit backend opt-in pour des rappels app fermée.
3. Version entreprise : agrégats anonymisés, déploiement multi-postes.
4. Sons discrets optionnels dans le lecteur de pause.
5. Tests unitaires du moteur (`engine.ts` est pur → facile à tester avec Vitest).
6. i18n (l’architecture des textes dans `data/` s’y prête).

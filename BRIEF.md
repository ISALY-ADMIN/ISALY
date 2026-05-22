# BRIEF COMPLET — ISALY
## Plateforme de colocation intelligente

---

## 1. VISION DU PROJET

ISALY est une plateforme web (et mobile-responsive) française de colocation qui combine :
- **Un système de matching façon Tinder** pour trouver des colocataires compatibles
- **Une gestion de bail complète façon Notion** pour les personnes déjà en colocation

Le nom du projet est **ISALY**. Le logo s'écrit `ISALY.` avec un point final de couleur mint.

### Deux types d'utilisateurs
1. **Locataire** — cherche une colocation adaptée à son profil + gestion de son bail
2. **Loueur** — veut trouver des locataires compatibles + gérer son bien

### Problèmes résolus
- Recherche de coloc trop fragmentée sur plusieurs sites
- Dossiers de location complexes et peu sécurisés
- Pas de compatibilité vérifiée avant la rencontre

---

## 2. STACK TECHNIQUE

```
Frontend  : Next.js 14 (App Router) + TypeScript
Styling   : Tailwind CSS
Base de données : Supabase (PostgreSQL)
Auth      : Supabase Auth (Google OAuth + email/password)
Temps réel : Supabase Realtime (messagerie)
Stockage fichiers : Supabase Storage (documents dossier)
Paiements : Stripe
Déploiement : Vercel
```

---

## 3. CHARTE GRAPHIQUE

### Couleurs
```css
--mint: #4ECBA0          /* Couleur principale */
--mint-light: #E8F9F3    /* Backgrounds légers */
--mint-dark: #2AA87C     /* Hover, accents forts */
--charcoal: #1A1A1A      /* Texte principal */
--gray: #6B7280          /* Texte secondaire */
--gray-light: #F5F5F5    /* Backgrounds */
--gray-border: #E5E7EB   /* Bordures */
--sidebar-bg: #111827    /* Fond sidebar app */
--danger: #EF4444
--warning: #F59E0B
--white: #FFFFFF
--app-bg: #F7F8FA        /* Background général de l'app */
```

### Typographie
- **Titres** : `DM Serif Display` (Google Fonts) — serif élégant
- **Corps** : `DM Sans` (Google Fonts) — sans-serif moderne
- Import : `https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap`

### Bordures & ombres
```css
--radius: 14px
--radius-sm: 9px
--shadow: 0 2px 12px rgba(0,0,0,.07)
--shadow-lg: 0 8px 36px rgba(0,0,0,.13)
```

### Boutons
- **Primaire** : background mint, texte blanc, border-radius 50px
- **Ghost** : transparent, border 1.5px gray-border, hover border mint

---

## 4. STRUCTURE DE L'APPLICATION

### 4.1 Pages publiques (non connecté)

#### `/` — Landing Page
- Navbar sticky : logo ISALY. + boutons Connexion / Commencer
- Hero section : titre "Trouve ta coloc parfaite." avec "parfaite" en italique mint + sous-titre + 2 CTA
- Section statistiques fond charcoal : 14k+ colocataires, 94% satisfaction, 3 min, 0€
- Section features (6 cards) : Matching intelligent, Dossier sécurisé, Gestion du bail, Messagerie, Assurance dossier, Mise en avant
- Section pricing fond charcoal : 2 plans (Essentiel gratuit / Sécurisé 3% loyer)

#### `/auth/login` — Connexion
- Card centrée sur fond gradient mint clair
- Bouton "Continuer avec Google" (OAuth)
- Séparateur "ou par email"
- Formulaire email + password
- Lien vers inscription

#### `/auth/register` — Inscription
- Même style que login
- Champs : prénom, nom, email, password
- Après inscription → redirige vers onboarding

#### `/onboarding` — Questionnaire (5 étapes)
Collecte les données pour l'algorithme de matching :

**Étape 1** — Rôle : Locataire ou Loueur (choix cards avec emoji)
**Étape 2** — Horaires : Lève-tôt / Couche-tard / Variable / Flexible
**Étape 3** — Ambiance : Calme / Festif / Studieux / Détendu
**Étape 4** — Passions (multi-sélection) : Musique, Cinéma, Sport, Cuisine, Art, Lecture, Voyages, Gaming
**Étape 5** — Budget (slider) : 300€ à 1500€/mois

Barre de progression avec dots en haut. Boutons Retour / Continuer.
Après complétion → redirige vers `/app/swipe`

---

### 4.2 Application (connecté) — Layout avec sidebar

**Layout général :**
- **Sidebar fixe gauche** (232px) fond `#111827`
- **Zone principale droite** avec topbar sticky (54px) + contenu scrollable

**Sidebar contenu :**
```
Logo ISALY.

— Principal —
🔥 Trouver
💬 Messages  [badge nombre non lus]

— Mon espace —
📁 Mon dossier
👤 Mon profil
📢 Mon annonce

— Compte —
💳 Paiement
🚪 Déconnexion

— Bottom —
Avatar + Nom + Rôle de l'utilisateur connecté
```

**Topbar :**
- Titre de la page active (à gauche)
- Bouton notifications (avec dot mint si non lues)
- Bouton chatbot IA 🤖
- Avatar utilisateur (cliquable → profil)

---

#### `/app/swipe` — Trouver (Matching)

**Layout 2 colonnes :**
- **Gauche** : carte de profil + boutons d'action
- **Droite** (380px) : liste des matchs récents

**Barre de filtres** en haut : Tous / Couche-tard / Lève-tôt / Animaux ok / Non-fumeur / CDI

**Carte de profil (340px max) :**
- Photo/emoji en haut (210px)
- Nom, âge, job, ville, loyer
- Badge score de compatibilité (% en mint)
- Tags lifestyle (pills)
- Biographie courte
- Bouton "💬 Écrire à [Prénom]" qui ouvre la messagerie

**Boutons d'action sous la carte :**
- ✕ Passer (rouge) — 52px
- ⭐ Super like (indigo) — 52px
- ♥ J'adore (mint) — 62px

**Animations swipe :**
- Swipe gauche : carte part à gauche avec rotation -18deg, opacity 0
- Swipe droit : carte part à droite avec rotation +18deg, opacity 0
- Animation cubic-bezier(.34,1.56,.64,1) pour l'apparition

**Pop-up match :**
Quand deux utilisateurs se likent mutuellement → overlay sombre + card animée (popIn) avec :
- Emoji 🎉
- "C'est un match !"
- Boutons : "Envoyer un message" / "Continuer"

**Colonne droite — Matchs récents :**
Liste des profils matchés avec avatar coloré, nom, job, score %
Clic → ouvre la conversation

---

#### `/app/messages` — Messagerie

**Layout 2 colonnes :**
- **Gauche** (280px) : liste des conversations + barre de recherche
- **Droite** : zone de chat

**Liste conversations :**
- Avatar coloré + initiales
- Nom + aperçu dernier message
- Heure/date
- Fond mint-light si conversation active

**Zone de chat :**
- Header : avatar + nom + statut "En ligne"
- Messages : bulles grises (reçus) / bulles mint (envoyés)
- Border-radius 17px, coin bas aplati selon sender
- Input + bouton envoi (rond, mint)
- **Temps réel via Supabase Realtime**

---

#### `/app/dossier` — Mon Dossier

**En-tête :** titre + sous-titre + bouton "📤 Partager"
**Barre de progression** : % de complétion du dossier

**4 cards documents (grille 2x2) :**

1. **📋 Identité** — Nom, date naissance, pièce d'identité (status: complet/en cours/absent)
2. **💰 Revenus** — Revenus mensuels, type contrat, fiches de paie uploadées
3. **🏠 Logement actuel** — Quittances loyer, attestation assurance + zone upload drag & drop
4. **🏦 Garant** — Infos garant (optionnel)

Chaque card a un badge status :
- ✓ Complet → fond vert clair `#D1FAE5` texte `#065F46`
- ⏳ En cours → fond jaune `#FEF3C7` texte `#92400E`
- ✗ Absent → fond rouge `#FEE2E2` texte `#991B1B`

**Section Bail en cours (si bail actif) :**
- Adresse + date début
- 4 stats cards : Loyer/mois, Durée bail, Prochain loyer, Nombre colocataires
- Stat "Prochain loyer" en mint
- Boutons : Voir le bail / Paiements / État des lieux

**Upload fichiers :** Supabase Storage — PDF, images acceptés

---

#### `/app/profil` — Mon Profil

- Card hero : grand avatar (initiales colorées) + nom + ville/job/âge + % complétion
- **Section Informations** : Nom, email, téléphone, budget max, zone de recherche
- **Section Style de vie** : Tags lifestyle avec pills mint + bouton "Modifier mes préférences" (→ onboarding)
- **Section Paramètres** : Notifications (toggle), Profil visible (toggle), Déconnexion

---

#### `/app/annonce` — Mon Annonce (pour les loueurs)

Formulaire de dépôt d'annonce :
- Titre de l'annonce
- Loyer mensuel CC + Charges (2 colonnes)
- Ville + Quartier (2 colonnes)
- Surface m² + Nombre de chambres (2 colonnes)
- Description (textarea)
- Upload photos (grille 4 colonnes, max 8)
- **Section boost** (fond mint-light) :
  - Standard — Gratuit
  - Mis en avant — 9,99€/mois
  - Prioritaire — 24,99€/mois
- Bouton "Publier l'annonce →" → redirige vers paiement si boost choisi

---

#### `/app/paiement` — Paiement (Stripe)

**3 plans sélectionnables :**
1. 🛡️ Assurance dossier — 3% du loyer/mois
2. 🚀 Annonce mise en avant — 9,99€/mois
3. ⭐ Annonce prioritaire — 24,99€/mois

Plan sélectionné : border mint + fond mint-light

**Formulaire carte bancaire :**
- Titulaire, numéro carte, expiration, CVV
- Badge "stripe" violet + mention "Paiement sécurisé"
- Bouton "Payer maintenant 🔒"
- **Intégration Stripe Checkout ou Stripe Elements**

---

## 5. ALGORITHME DE MATCHING

### Principe
Score de compatibilité calculé entre deux profils (0-100%).

### Critères et poids
```
Horaires de vie    : 25%  (lève-tôt/couche-tard → incompatible si opposés)
Ambiance souhaitée : 20%  (calme/festif → incompatible si opposés)
Budget             : 20%  (écart < 100€ = max, écart > 400€ = 0)
Passions communes  : 20%  (nb passions communes / max passions * 100)
Zone géographique  : 15%  (même ville = max, même arrondissement = bonus)
```

### Logique Tinder
- Un utilisateur like un profil → enregistré en DB
- Si l'autre like aussi → **match** créé, notification envoyée aux deux
- Les profils déjà vus (likés ou passés) ne réapparaissent plus
- Feed trié par score décroissant

---

## 6. SCHÉMA BASE DE DONNÉES (Supabase/PostgreSQL)

```sql
-- Utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('locataire', 'loueur')),
  city TEXT,
  budget_max INTEGER,
  schedule TEXT CHECK (schedule IN ('leve-tot', 'couche-tard', 'variable', 'flexible')),
  vibe TEXT CHECK (vibe IN ('calme', 'festif', 'studieux', 'detendu')),
  passions TEXT[],
  bio TEXT,
  phone TEXT,
  profile_complete INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annonces
CREATE TABLE listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  title TEXT,
  description TEXT,
  city TEXT,
  neighborhood TEXT,
  rent INTEGER,
  charges INTEGER,
  surface INTEGER,
  rooms_available INTEGER,
  photos TEXT[],
  boost_type TEXT CHECK (boost_type IN ('standard', 'featured', 'priority')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipes
CREATE TABLE swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES profiles(id),
  swiped_id UUID REFERENCES profiles(id),
  direction TEXT CHECK (direction IN ('left', 'right', 'super')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matchs
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id),
  user2_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dossier
CREATE TABLE dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE,
  identity_doc_url TEXT,
  identity_verified BOOLEAN DEFAULT false,
  income_monthly INTEGER,
  contract_type TEXT,
  payslips_urls TEXT[],
  rent_receipts_urls TEXT[],
  insurance_url TEXT,
  guarantor_name TEXT,
  guarantor_doc_url TEXT,
  completion_percent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bail
CREATE TABLE leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  address TEXT,
  city TEXT,
  monthly_rent INTEGER,
  start_date DATE,
  end_date DATE,
  nb_roommates INTEGER DEFAULT 1,
  lease_doc_url TEXT,
  status TEXT CHECK (status IN ('active', 'ended', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paiements
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  stripe_payment_intent_id TEXT,
  amount INTEGER,
  plan_type TEXT CHECK (plan_type IN ('assurance', 'featured', 'priority')),
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
Activer RLS sur toutes les tables. Règles :
- `profiles` : lecture publique, écriture uniquement par le propriétaire
- `messages` : lecture/écriture uniquement par les participants de la conversation
- `swipes` : écriture uniquement par le swiper
- `dossiers` : lecture/écriture uniquement par le propriétaire
- `leases` : lecture par tenant ET owner

---

## 7. CHATBOT IA INTÉGRÉ

Chatbot flottant (bouton 🤖 en bas à droite, 50px rond, fond mint) présent sur toutes les pages de l'app.

**Comportement :**
- Clic sur le bouton → panel 330px s'ouvre (slide up)
- Header fond charcoal : "Assistant ISALY" + "IA · répond en quelques secondes"
- Messages : bulles grises (bot) / bulles mint (user)
- Animation de chargement (3 points qui rebondissent)

**Appel API :**
```javascript
// Utiliser l'API Anthropic claude-sonnet-4-20250514
// System prompt :
"Tu es l'assistant virtuel d'ISALY, plateforme française de colocation. 
Tu aides à : trouver une colocation (matching Tinder), gérer le dossier et le bail, 
comprendre les offres (assurance dossier 3% du loyer, mise en avant 9,99€/mois ou 24,99€/mois), 
répondre aux questions sur la législation du bail en France. 
Réponds en français, de façon concise et chaleureuse. Maximum 3 phrases."
```

---

## 8. AUTHENTIFICATION (Supabase Auth)

### Google OAuth
- Configurer Google OAuth dans Supabase Dashboard
- Callback URL : `/auth/callback`
- Après connexion → vérifier si profil existe → si non → onboarding

### Email/Password
- Inscription avec confirmation email
- Réinitialisation mot de passe par email

### Middleware Next.js
Protéger toutes les routes `/app/*` — rediriger vers `/auth/login` si non connecté.
Rediriger vers `/onboarding` si connecté mais onboarding non complété.

---

## 9. FONCTIONNALITÉS TEMPS RÉEL (Supabase Realtime)

```javascript
// Écouter les nouveaux messages dans une conversation
const channel = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Ajouter le message au state
  })
  .subscribe()
```

Aussi pour les notifications de nouveaux matchs.

---

## 10. INTÉGRATION STRIPE

### Plans
```javascript
const PLANS = {
  assurance: {
    name: 'Assurance dossier',
    price: 'percentage', // 3% du loyer
    description: 'Dossier certifié + gestion bail'
  },
  featured: {
    name: 'Annonce mise en avant',
    price: 999, // centimes = 9,99€
    interval: 'month'
  },
  priority: {
    name: 'Annonce prioritaire',
    price: 2499, // centimes = 24,99€
    interval: 'month'
  }
}
```

### Webhook Stripe
Route `/api/webhooks/stripe` pour écouter les événements :
- `payment_intent.succeeded` → activer le plan en DB
- `invoice.payment_failed` → désactiver le plan

---

## 11. VARIABLES D'ENVIRONNEMENT NÉCESSAIRES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Anthropic (chatbot)
ANTHROPIC_API_KEY=

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
```

---

## 12. STRUCTURE DES DOSSIERS

```
isaly/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # Landing
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts
│   │   └── onboarding/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # Layout avec sidebar
│   │   ├── swipe/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── dossier/page.tsx
│   │   ├── profil/page.tsx
│   │   ├── annonce/page.tsx
│   │   └── paiement/page.tsx
│   └── api/
│       ├── match/route.ts        # Algorithme de matching
│       ├── swipe/route.ts
│       ├── messages/route.ts
│       ├── webhooks/
│       │   └── stripe/route.ts
│       └── chat/route.ts         # Chatbot IA
├── components/
│   ├── ui/                       # Boutons, inputs, badges...
│   ├── sidebar/
│   ├── swipe/
│   │   ├── SwipeCard.tsx
│   │   ├── SwipeActions.tsx
│   │   └── MatchList.tsx
│   ├── messages/
│   │   ├── ConversationList.tsx
│   │   └── ChatArea.tsx
│   ├── dossier/
│   ├── chatbot/
│   │   └── ChatbotWidget.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Topbar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stripe.ts
│   ├── matching.ts               # Algorithme de scoring
│   └── utils.ts
├── types/
│   └── database.ts               # Types TypeScript générés depuis Supabase
├── middleware.ts                  # Protection routes
└── .env.local
```

---

## 13. ORDRE DE CONSTRUCTION RECOMMANDÉ

1. Initialiser le projet Next.js + Tailwind + TypeScript
2. Configurer Supabase (créer projet, exécuter le SQL du schéma, activer RLS)
3. Mettre en place l'authentification (Google OAuth + email)
4. Créer le layout de l'app (sidebar + topbar)
5. Page Landing (/)
6. Onboarding (/onboarding)
7. Page Swipe avec algorithme de matching (/app/swipe)
8. Messagerie temps réel (/app/messages)
9. Dossier + upload fichiers (/app/dossier)
10. Profil (/app/profil)
11. Annonce (/app/annonce)
12. Paiement Stripe (/app/paiement)
13. Chatbot IA
14. Déploiement Vercel

---

## 14. COMMANDE DE DÉMARRAGE POUR CLAUDE CODE

Une fois ce brief lu, voici ce que tu dois faire :

```
1. Crée un projet Next.js 14 avec TypeScript et Tailwind CSS
2. Installe les dépendances : @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js @anthropic-ai/sdk
3. Construis l'intégralité de l'application en suivant ce brief
4. Utilise les couleurs et typographies exactes définies dans la section 3
5. Reproduis fidèlement toutes les pages décrites dans la section 4
6. Implémente l'algorithme de matching de la section 5
7. Exécute le schéma SQL de la section 6 dans Supabase
8. Mets en place l'auth Supabase (section 8)
9. Configure Stripe (section 10)
10. Crée un fichier .env.local.example avec toutes les variables de la section 11
```

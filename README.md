<div align="center">
  <img src="public/favicon.svg" alt="tautan.site Logo" width="100" height="100" />

  # tautan.site
  **Autonomous AI-Powered WhatsApp Commerce & Micro-Catalogue Storefront for Indonesian SMBs**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-3.1_Flash--Lite-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Fonnte](https://img.shields.io/badge/WhatsApp-Fonnte_Gateway-25D366?style=flat&logo=whatsapp)](https://fonnte.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

</div>

<br />

**tautan.site** is a modern, open-source multi-tenant platform designed for Indonesian small-and-medium businesses (SMBs), independent online sellers, and creator-merchants. It unites a social link-in-bio profile with an interactive micro-catalogue storefront, direct WhatsApp checkout with **0% transaction fees**, a professional fintech-grade merchant dashboard, and an **Autonomous 24/7 WhatsApp AI Agent Copilot** powered by **Google Gemini** and **Fonnte** to automatically answer buyer inquiries, draft orders, and verify bank transfer payments in real time.

---

## Table of Contents

- [Key Features](#-key-features)
- [Autonomous WhatsApp AI Copilot](#-autonomous-whatsapp-ai-copilot)
- [Architecture & Technology Stack](#-architecture--technology-stack)
- [System Requirements](#-system-requirements)
- [Local Installation & Setup](#-local-installation--setup)
- [Project Directory Structure](#-project-directory-structure)
- [Security Hardening & Resilience](#-security-hardening--resilience)
- [Deployment Guide](#-deployment-guide)
- [Contributing](#-contributing)
- [License](#-license)

---

## Key Features

- **Instant Storefront & Onboarding (`tautan.site/:slug`):** Launch a personalized, high-conversion storefront in seconds with custom brand avatar, bio, and social links.
- **Autonomous WhatsApp AI Sales Agent:** 24/7 AI Copilot powered by Google Gemini handles buyer chat conversations, checks catalog inventory, recommends products, creates order drafts, and verifies payment receipts directly inside WhatsApp.
- **Direct WhatsApp Checkout (0% Fees):** No third-party payment gateway cuts. The frictionless shopping cart formats orders into clean, ready-to-send WhatsApp messages directly to the seller's active WhatsApp number.
- **Automated Payment & Proof Verification:** Buyers can upload or send transfer receipt screenshots via WhatsApp. The AI autonomously matches the payment, tags seller notes, and flips the order status from `PENDING_WA` to `PAID` instantly.
- **Fluid Multi-Step Cart & Morphing Drawer:** Interactive shopping cart with smooth spring physics when advancing from product selection to delivery information and confirmation.
- **Fintech-Style Financial Dashboard (`/dashboard`):** Real-time tracking of settled gross revenue, pending WhatsApp pipeline, average order value (AOV), and conversion rates with interactive revenue trajectory charts.
- **Comprehensive Order Lifecycle Control (`/orders`):** Full visibility into orders with AI management tags (`managed_by_ai`), payment proof inspection, tracking number inputs, and 1-tap WhatsApp buyer actions.
- **Product & Variant Inventory Management (`/katalog`):** Complete catalog CRUD supporting categories, stock counters, variant groups (e.g. Size, Color), price deltas, and custom **AI Context Notes** for guiding the AI agent.
- **Customer CRM & Insights (`/pelanggan`):** Automatically aggregates customer records, order counts, lifetime spending (LTV), and last order dates with instant WhatsApp contact actions.
- **Buyer Reviews & Social Proof (`/ulasan`):** Integrated post-checkout buyer rating and review collection system displayed within the merchant dashboard.
- **Sales & Financial Reports (`/laporan`):** In-depth breakdown of verified revenue, WhatsApp conversion pipelines, and payment settlement records.
- **cPanel, Vercel & Static Hosting Ready:** Ultra-lightweight static frontend bundle paired with edge/serverless webhook endpoints for WhatsApp automation.

---

## Autonomous WhatsApp AI Copilot

The platform features an autonomous AI commerce copilot located at `api/whatsapp.ts` that connects the merchant's store directly to WhatsApp via the [Fonnte](https://fonnte.com) gateway:

### How It Works

```text
[ Buyer on WhatsApp ]
       │
       ▼ (Sends text or payment proof photo)
[ Fonnte Gateway ]
       │
       ▼ HTTP POST Webhook
[ /api/whatsapp (Vercel Serverless) ]
       │
       ├── 1. In-Memory & Database Deduplication Guard (Prevents retry loops)
       ├── 2. Parallel Context Retrieval (Store, Active Products, Orders, Chat History)
       ├── 3. Google Gemini REST API (with Autonomous Function Calling)
       │       ├── Tool: check_stock (Verify inventory & variants)
       │       ├── Tool: create_order_draft (Drafts new order into Supabase)
       │       └── Tool: confirm_buyer_payment (Verifies transfer proof -> Sets PAID)
       ├── 4. Log Session to PostgreSQL (ai_chat_sessions)
       │
       ▼ Outbound Reply via https://api.fonnte.com/send
[ Buyer Receives Immediate WhatsApp Response ]
```

### Configurable AI Store Settings (`/settings`)
Merchants have full autonomous control over their AI Copilot:
- **Toggle AI Copilot:** Turn autonomous WhatsApp customer assistance on/off with one switch.
- **Fonnte Device Token:** Connect any WhatsApp number via QR scan at fonnte.com.
- **Brand Persona & Tone:** Define how the AI greets and talks with buyers (e.g., warm Balinese hospitality, formal boutique, or casual streetwear).
- **Custom Operational Instructions:** Provide specific store rules, promo codes, delivery policies, or FAQs.
- **Payment & Bank Instructions:** Set BCA, Mandiri, BRI, or QRIS instructions dispatched automatically when orders are finalized.
- **Model Selection:** Choose between `gemini-3.1-flash-lite`, `gemini-3.8-flash`, or custom models.
- **Product AI Context:** Add custom selling notes to individual catalog items that the AI references during customer questions.

---

## Architecture & Technology Stack

**tautan.site** is built for maximum speed, responsiveness, and zero-maintenance reliability:

- **Frontend Core:** [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) Single Page Application (SPA).
- **Type Safety:** [TypeScript 5.7](https://www.typescriptlang.org/) for robust end-to-end interface contracts.
- **AI Engine:** [Google Gemini API](https://ai.google.dev/) (`gemini-3.1-flash-lite`) with function calling tools and conversation history memory.
- **WhatsApp Gateway:** [Fonnte API](https://fonnte.com/) for bidirectional message dispatch and media webhook reception.
- **Styling & Design System:** [Tailwind CSS v3.4](https://tailwindcss.com/) with an editorial warm cream canvas palette, serif typography hierarchy, and accessible contrast ratios.
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) with persistent local storage hydration for cart and authentication sessions.
- **Micro-Animations & Physics:** [Motion](https://motion.dev/) (Framer Motion v13) for fluid spring physics, dynamic modal height transitions, and interactive UI feedback.
- **Routing:** [React Router v7](https://reactrouter.com/) for fast client-side navigation.
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL 15, Supabase Auth with automated JWT refresh, and Row Level Security).
- **Serverless Automation:** Vercel Serverless Functions (`api/whatsapp.ts`) for processing asynchronous WhatsApp webhooks.

---

## System Requirements

Before running the project locally, ensure you have:

- [Node.js](https://nodejs.org/) v18.0.0 or higher (or [Bun](https://bun.sh/) / [pnpm](https://pnpm.io/))
- npm v9+ or equivalent package manager
- A [Supabase](https://supabase.com/) project (free tier is fully sufficient)
- A [Google AI Studio Gemini API Key](https://aistudio.google.com/) (for AI Copilot features)
- A [Fonnte](https://fonnte.com/) account and device token (optional for WhatsApp testing)

---

## Local Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/haidirwf/tautantoko.git tautan-site
cd tautan-site
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Duplicate the template environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini AI Configuration
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-3.1-flash-lite

# Fonnte WhatsApp Gateway Configuration
FONNTE_TOKEN=your-fonnte-token-here
```

### 4. Database Setup (Supabase)

1. Open your Supabase Project Dashboard.
2. Navigate to the **SQL Editor**.
3. Copy and run the contents of [`supabase/schema.sql`](supabase/schema.sql) to set up tables (`stores`, `products`, `orders`, `categories`, `store_links`, `reviews`, `ai_chat_sessions`) and Row Level Security (RLS) policies.

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 6. Build for Production

```bash
npm run build
```

The production-ready static assets will be compiled into the `dist/` directory.

---

## Project Directory Structure

```text
tautan.site/
├── api/
│   └── whatsapp.ts           # Autonomous WhatsApp AI Webhook & Fonnte Dispatcher
├── public/
│   ├── .htaccess             # Apache rewrite rules for SPA client routing on cPanel
│   └── vite.svg              # Brand icon
├── scripts/
│   ├── seed_mock_account.mjs # Database seeder script
│   └── verify_seeded_data.mjs# Data verification test utility
├── src/
│   ├── components/
│   │   ├── auth/             # Login, Signup, & Auth modal dialogs
│   │   ├── common/           # Shared components (Navbar, Badge, TopProgressBar)
│   │   ├── dashboard/        # Merchant analytics, RevenueChart, OrderEditModal
│   │   ├── storefront/       # Public store components (ProductCard, CartDrawer)
│   │   └── ui/               # Base UI primitives (Button, Modal, Toaster)
│   ├── lib/
│   │   ├── gemini.ts         # Autonomous AI Processing Engine & Function Calling logic
│   │   ├── supabase.ts       # Supabase client, data access layer & mock fallback
│   │   └── utils.ts          # Currency formatter, order code generator, WhatsApp formatter
│   ├── pages/
│   │   ├── AuthPage.tsx      # Sign-in & Sign-up page
│   │   ├── CatalogPage.tsx   # Product & variant management
│   │   ├── CustomersPage.tsx # Customer directory & lifetime value CRM
│   │   ├── DashboardPage.tsx # Financial summary & revenue charts
│   │   ├── LandingPage.tsx   # Platform landing & feature showcase
│   │   ├── OnboardingPage.tsx# New store setup wizard
│   │   ├── OrdersPage.tsx    # Order pipeline & status management
│   │   ├── ReportsPage.tsx   # Detailed financial & conversion reports
│   │   ├── ReviewsPage.tsx   # Buyer rating & review management
│   │   ├── SettingsPage.tsx  # Store profile, Fonnte & AI Persona settings
│   │   └── StorefrontPage.tsx# Public link-in-bio & micro-catalogue
│   ├── store/
│   │   ├── useAuthStore.ts   # Merchant auth state & session persistence
│   │   ├── useCartStore.ts   # Buyer cart, item quantities, and checkout state
│   │   └── useToastStore.ts  # Notification toast system
│   ├── types/
│   │   └── index.ts          # Core TypeScript data schemas & order statuses
│   ├── App.tsx               # Route declarations & layout shell
│   ├── index.css             # Tailwind design tokens & font imports
│   └── main.tsx              # Application entrypoint
├── supabase/
│   └── schema.sql            # PostgreSQL schema, indexes, and RLS policies
├── vercel.json               # Serverless API routing specification
├── .cpanel.yml               # Automated cPanel deployment specification
├── .env.example              # Environment variables template
├── LICENSE                   # MIT License
├── PRD.md                    # Product Requirements Document
├── SECURITY.md               # Security & vulnerability reporting policy
├── tailwind.config.js        # Design tokens & color configuration
├── tsconfig.json             # TypeScript compiler settings
└── vite.config.ts            # Vite bundler plugins & path aliases
```

---

## Security Hardening & Resilience

**tautan.site** implements multi-layered security and operational resilience:

- **Dual-Layer Webhook Deduplication:** Combines an in-memory sliding cache (15-minute TTL) with database-level verification in `ai_chat_sessions` to eliminate duplicate message processing and prevent Fonnte 15-retry loops.
- **Concurrent In-Flight Lock:** Fast 45-second debounce ensures that duplicate webhook requests arriving simultaneously across different serverless instances cannot trigger double replies.
- **Group Isolation & Anti-Looping:** Webhook handlers immediately drop group messages (`@g.us`) and device self-echos to prevent infinite bot ping-pong loops.
- **Guaranteed HTTP 200 Acknowledgment:** The webhook endpoint consistently returns HTTP 200 status codes for unhandled non-message events, status reports, and errors to prevent external retry floods.
- **Row Level Security (RLS):** All Supabase database tables enforce strict RLS policies. Merchants can only read and mutate their own store records, catalog items, and financial data.
- **Phone Number Normalization:** Standardizes Indonesian numbers across formats (`08...`, `8...`, `628...`) to ensure seamless order lookups and communication consistency.

---

## Deployment Guide

### Deploying to Vercel (Recommended for Full AI Automation)

1. Connect your repository to Vercel.
2. Ensure the build configuration is set to:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, for administrative webhook writes)
   - `VITE_GEMINI_API_KEY`
   - `VITE_GEMINI_MODEL` (e.g. `gemini-3.1-flash-lite`)
   - `FONNTE_TOKEN`
4. Set your Webhook URL in the Fonnte Device Settings to:
   `https://your-domain.vercel.app/api/whatsapp`
5. Turn **Auto Read** to **On** in your Fonnte dashboard.

### Deploying to cPanel (Shared Hosting for Frontend)

1. Run `npm run build` locally or through CI/CD.
2. Upload the contents of the `dist/` directory directly to your `public_html/` (or subdomain folder).
3. The included `public/.htaccess` automatically ensures that client-side SPA routes (e.g. `/dashboard`, `/:slug`) resolve properly through `index.html`.

---

## Contributing

Contributions are welcome! If you want to contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m 'feat: add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Please check [SECURITY.md](SECURITY.md) for vulnerability reporting guidelines.

---

## License

This project is licensed under the **[MIT License](LICENSE)**.

```text
Copyright (c) 2026 tautan.site contributors
```

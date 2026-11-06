# Product Requirements Document (PRD)

**Product**: Multi-Tenant Link-in-Bio & Micro-Catalogue Storefront Platform with Autonomous WhatsApp AI Commerce Agent & Merchant Financial Dashboard  
**Version**: 2.0.0 (Autonomous AI Commerce Edition)  
**Document Status**: Approved / Live & Maintained  
**Target Market**: Indonesian SMBs, Creator-Merchants, & Independent Online Sellers  

---

## 1. Executive Summary

### Problem Statement
Indonesian small-and-medium businesses (SMBs) and independent online sellers face significant hurdles in digital commerce:
1. **Payment Gateway Disconnect**: Automated payment gateways impose transaction percentage cuts and add checkout friction for Indonesian consumers who prefer direct WhatsApp interactions, bank transfers, or QRIS.
2. **24/7 Manual Messaging Overhead**: Sellers spend hours answering repetitive inquiries regarding product specs, stock levels, sizing, bank account numbers, and manual payment verification. Delayed responses directly result in abandoned carts.
3. **Disorganized Order Tracking**: Manual WhatsApp deals lack centralized inventory synchronization, standardized customer records, and financial analytics.

### Proposed Solution
**tautan.site** is an all-in-one multi-tenant commerce platform combining:
1. **Interactive Link-in-Bio Micro-Catalogue Storefront**: Mobile-first digital storefront (`tautan.site/:slug`) with category filtering, variant pricing, and direct WhatsApp checkout with **0% transaction fees**.
2. **Autonomous WhatsApp AI Agent Copilot (`/api/whatsapp`)**: Integrated with **Google Gemini** and **Fonnte WhatsApp Gateway**, the autonomous agent answers buyer questions 24/7, checks catalog availability, automatically creates order drafts, and detects/verifies bank transfer receipts from uploaded images.
3. **Fintech-Grade Merchant Financial Dashboard (`/dashboard`)**: Provides high-end financial metrics (Settled Revenue, Pending Pipeline, AOV, Conversion Rates, and Trajectory Charts) offering enterprise payment gateway clarity while maintaining frictionless WhatsApp commerce.

Built with **React 19 + Vite SPA** and **Vercel Serverless Functions**, backed by **Supabase PostgreSQL** for data persistence and Row Level Security.

### Success Criteria & Key Performance Indicators (KPIs)
1. **AI Response Latency**: Autonomous WhatsApp replies delivered in under 4 seconds.
2. **AI Payment Verification Accuracy**: >= 98% accuracy in matching order codes and payment amounts from customer transfer slips and screenshots.
3. **Checkout to WhatsApp Transition**: Under 45 seconds for a buyer to browse, pick options, enter shipping details, and open WhatsApp.
4. **Deduplication & Webhook Stability**: 0 duplicate bot responses during network retries or concurrent webhook deliveries.
5. **Dashboard Revenue Precision**: 100% mathematical integrity across Settled Revenue, Pending Pipeline, and Conversion calculations.
6. **Lighthouse Performance**: >= 95 Mobile Performance score with First Contentful Paint (FCP) <= 1.0s.

---

## 2. User Experience & Functionality

### User Personas
* **Persona A: Independent Online Merchant ("Seller")**: Sells fashion, packaged foods, handicrafts, or beauty products. Wants an automated AI sales copilot on WhatsApp to handle customer inquiries and verify transfers while retaining control over orders and financial insights on a clean dashboard.
* **Persona B: Mobile Social Buyer ("Buyer")**: Discovers the seller through Instagram, TikTok, or WhatsApp. Desires instant answers about products, easy ordering, and fast confirmation without waiting for human customer service.

---

### User Stories & Acceptance Criteria

#### 2.1 Autonomous WhatsApp AI Sales Agent & Customer Copilot
* **Story**: *As a seller, I want an autonomous AI agent to manage my store's WhatsApp 24/7 so that customer inquiries, stock questions, orders, and transfer receipts are handled immediately without human delay.*
* **Acceptance Criteria**:
  - **Context-Aware Dialogue**: The AI understands the merchant's catalog, product variants, price deltas, and unique product notes (`ai_context`).
  - **Persona & Tone Customization**: Merchants can configure the AI's greeting, character persona (e.g. friendly Balinese hospitality, formal boutique, or casual streetwear), and operational instructions from `/settings`.
  - **Autonomous Tool Calling**:
    - `check_stock`: Queries inventory levels and active variant options in real time.
    - `create_order_draft`: Generates an official order code (e.g., `ORD-XXXXXX`), calculates subtotals, saves buyer shipping info to Supabase, and outputs bank transfer details.
    - `confirm_buyer_payment`: Analyzes customer confirmation messages or uploaded transfer receipt photos, verifies the transaction, attaches internal audit notes, and updates order status from `PENDING_WA` to `PAID`.
  - **Conversation Memory**: Maintains sliding conversation context using `ai_chat_sessions` in Supabase PostgreSQL.

#### 2.2 Storefront Browsing & Link-in-Bio Presentation
* **Story**: *As a buyer visiting a merchant's store, I want to browse social links and filter products by category in an elegant, editorial interface.*
* **Acceptance Criteria**:
  - Warm cream canvas palette (`#faf9f5`), serif headline typography, and warm coral CTAs.
  - Continuous-scroll layout displaying brand avatar, bio, external links (Shopee, Tokopedia, Instagram), category filter tabs, and product cards with IDR pricing.
  - Fluid shopping cart drawer with spring physics animations.

#### 2.3 Direct WhatsApp Checkout (0% Fees)
* **Story**: *As a buyer, I want to review my cart, enter delivery information, and dispatch my order directly to the seller's WhatsApp.*
* **Acceptance Criteria**:
  - Collects Buyer Full Name, WhatsApp Number, Shipping Address, and Order Notes.
  - Automatically sanitizes Indonesian phone numbers (`08...` -> `628...`).
  - Generates structured order code and creates an initial record in Supabase with status `PENDING_WA`.
  - Formats clean WhatsApp markdown message with order items, subtotal, and buyer address, triggering direct redirect to `https://wa.me/{seller_phone}`.

#### 2.4 Merchant Order Management (`/orders`)
* **Story**: *As a seller, I want to view and manage orders whether placed via storefront checkout or drafted autonomously by the AI copilot.*
* **Acceptance Criteria**:
  - Order status lifecycle: `PENDING_WA` -> `PAID` -> `PROCESSING` -> `SHIPPED` -> `COMPLETED` / `CANCELLED`.
  - Orders handled by the AI are badged with `managed_by_ai` and show AI summary notes.
  - Ability to view attached payment receipt images (`payment_proof_url`) verified by AI or manually.
  - Order modal allows adjusting agreed shipping fee, courier name, tracking number (`tracking_number`), and payment method tag.
  - 1-tap "Chat Pembeli via WhatsApp" action button on every order row.

#### 2.5 Fintech-Style Financial & Analytics Dashboard (`/dashboard`)
* **Story**: *As a seller, I want my dashboard to display professional financial statistics—Total Earnings, Pending Pipeline, AOV, and Sales Trajectory—with the visual clarity of an enterprise payment gateway.*
* **Acceptance Criteria**:
  - **Total Pendapatan Terverifikasi (Settled Revenue)**: Sum of `total_amount` for orders with status `PAID`, `PROCESSING`, `SHIPPED`, or `COMPLETED`.
  - **Potensi Pendapatan / Pipeline (Pending Revenue)**: Sum of `subtotal` for orders still in `PENDING_WA`.
  - **Tingkat Konversi WhatsApp (Conversion Rate)**: `[Paid Orders / Total Checkouts] * 100`.
  - **Rata-rata Nilai Pesanan (AOV)**: `Settled Revenue / Paid Orders Count`.
  - **Interactive Revenue Charts**: Weekly and monthly revenue trajectory visualizations.

---

## 3. UI / UX Design System Specification

### 3.1 Design Philosophy & Surface Modes
* **Core Brand Atmosphere**: Tinted warm cream canvas paired with dark navy product surfaces, punctuated by warm coral CTAs.
* **Three Alternating Surface Modes**:
  1. **Canvas (`#faf9f5`)**: Default page floor. Warm, paper-like cream, deliberately non-pure-white.
  2. **Feature / Catalog Cards (`#efe9de`)**: Content card backgrounds, slightly deeper cream.
  3. **Dark Navy Surfaces (`#181715`)**: Dashboard panels, financial stat cards, order summary highlights, and footer.

### 3.2 Color Tokens
| Token | Hex Value | Application in Storefront & Dashboard |
|---|---|---|
| **Primary (Coral)** | `#cc785c` | Main CTA buttons, active highlights |
| **Primary Active** | `#a9583e` | Hover / pressed state for coral buttons |
| **Canvas** | `#faf9f5` | Main storefront floor, modal backdrop, input backgrounds |
| **Surface Card** | `#efe9de` | Product catalog cards, link-in-bio buttons, feature tiles |
| **Surface Dark** | `#181715` | Merchant dashboard cards, financial summary cards, order table headers |
| **Hairline Border** | `#e6dfd8` | Subtle 1px borders on cream cards and inputs |
| **Ink (Headlines)** | `#141413` | Headings, brand names, product titles |
| **Body Text** | `#3d3d3a` | Descriptions, running text |
| **Muted** | `#6c6a64` | Subtitles, category labels, timestamps |
| **Success** | `#5db872` | `PAID` / `COMPLETED` order status badge |
| **Warning / Amber** | `#e8a55a` | `PENDING_WA` order status badge |
| **Accent Teal** | `#5db8a6` | `PROCESSING` / `SHIPPED` status badge |
| **Error** | `#c64545` | `CANCELLED` status badge, validation errors |

### 3.3 Strict UI Guidelines
- **No Dot Pills**: Status badges and pills must not include blinking or solid decorative bullet dots (e.g. `[● Toko Aktif]`).
- **No Sparkle / AI Pill Badges**: Headers must not include decorative pill badges with sparkle icons (`<Sparkle />`, `✨`, `✦`) or AI marketing tags.

---

## 4. Technical Architecture & Data Schema

### 4.1 System Architecture

```text
+---------------------------------------------------------------------------------------+
|                                    Client Browser                                     |
|  - React 19 + Vite SPA (Client-Side HTML5 Routing)                                    |
|  - Tailwind CSS + UI Component System (Editorial Cream Design)                        |
|  - Zustand Store (Cart, Authentication, Toast Notifications)                          |
+-------------------------------------------+-------------------------------------------+
                     |                                           |
       HTTPS / Static Asset Requests                    Direct Supabase REST / Auth
                     |                                           |
+--------------------v----------------------+   +----------------v----------------------+
|       Web Hosting (cPanel / Vercel)       |   |            Supabase Backend           |
|  - Static Document Root (`dist/`)         |   |  - Supabase Auth (Email OTP / Pass)   |
|  - `.htaccess` Client Routing Rewrite     |   |  - PostgreSQL Database (with RLS)     |
+-------------------------------------------+   |  - Supabase Storage (Images / Proofs) |
                     │                          +----------------v----------------------+
                     │                                           ▲
                     │ Inbound Webhook                           │ Query / Mutate
                     ▼                                           │
+----------------------------------------------------------------+----------------------+
|                     Autonomous AI Copilot Engine (api/whatsapp.ts)                    |
|  - Fonnte Inbound Webhook Listener (POST /api/whatsapp)                               |
|  - Multi-tier Deduplication (Sliding In-Memory Cache + PostgreSQL History Verification)|
|  - Google Gemini REST API (gemini-3.1-flash-lite) with Function Calling Tools         |
|  - Tool Executors: create_order_draft, confirm_buyer_payment, check_stock              |
|  - Outbound Fonnte Message Dispatcher (POST https://api.fonnte.com/send)              |
+---------------------------------------------------------------------------------------+
```

### 4.2 Database Schema (Supabase PostgreSQL)

```sql
-- Stores / Tenants
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  whatsapp_number TEXT NOT NULL,
  fonnte_token TEXT DEFAULT '',
  ai_enabled BOOLEAN DEFAULT false,
  ai_model TEXT DEFAULT 'gemini-3.1-flash-lite',
  ai_persona TEXT DEFAULT 'Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.',
  ai_instructions TEXT DEFAULT 'Bantu pembeli menjawab pertanyaan seputar katalog, cek stok, rekap pesanan, dan verifikasi pembayaran transfer.',
  ai_payment_info TEXT DEFAULT 'BCA: 1234567890 a/n Toko',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products & Variants
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price INT NOT NULL,
  stock INT DEFAULT 10,
  image_url TEXT DEFAULT '',
  ai_context TEXT DEFAULT '', -- Custom selling instructions for the AI agent
  is_digital BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price_delta INT DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- Orders Ledger
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  order_code TEXT UNIQUE NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  order_notes TEXT DEFAULT '',
  subtotal INT NOT NULL,
  shipping_fee INT DEFAULT 0,
  total_amount INT NOT NULL,
  payment_method TEXT DEFAULT 'MANUAL_TRANSFER',
  status TEXT DEFAULT 'PENDING_WA', -- 'PENDING_WA', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'
  courier_name TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  seller_internal_note TEXT DEFAULT '',
  managed_by_ai BOOLEAN DEFAULT false,
  ai_summary TEXT DEFAULT '',
  payment_proof_url TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  items_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Conversation Sessions Context
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  buyer_phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Webhook Resilience & Deduplication Architecture
To prevent duplicate response floods caused by Fonnte's 15-minute retry mechanism:
1. **In-Memory Sliding Cache**: Caches unique message IDs (`inboxid`/`id`), sender timestamps (`ts:{sender}:{timestamp}`), and message digests with a 15-minute TTL.
2. **In-Flight Concurrent Guard**: 45-second lock on identical incoming content prevents simultaneous lambda cold-starts from generating double responses.
3. **Database-Level Verification**: Checks `ai_chat_sessions` to verify if the incoming text or photo has already received an AI model response within the past 10 minutes.
4. **Group & Echo Filtering**: Immediately returns HTTP 200 and ignores group chats (`@g.us`) and messages originating from the store's own WhatsApp number.
5. **Guaranteed HTTP 200 Delivery**: Always sends HTTP 200 OK headers to Fonnte regardless of internal status to acknowledge receipt and prevent external retry triggers.

---

## 5. Security & Compliance
- **Strict Row Level Security**: Merchants can only read, update, or delete records belonging to their authenticated `user_id`.
- **Public Checkout Insert Sandbox**: Public customers can only insert order records and chat sessions; they cannot inspect or mutate other customer data.
- **Sanitized Phone Normalization**: Strips non-digit characters and normalizes numbers to international format (`628...`).
- **Prompt Injection Defense**: Catalog data, order snippets, and customer inputs are structured cleanly into system instructions and tool arguments to prevent prompt leaks.

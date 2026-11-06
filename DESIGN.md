# tautan.site — Design System Reference (`DESIGNREF.md`)
> **Artisanal Linen & Terracotta Editorial meets Modern High-Utility SaaS.**
> Clean, warm, minimalist storefront & merchant operations engine with crisp typography, delicate hairlines, and tactile micro-interactions.

---

## 1. Design Philosophy & Core Metaphor

tautan.site marries the organic, tactile warmth of an artisanal Japanese linen stationery notebook with the razor-sharp precision of high-performance software. It eschews generic cold grey enterprise templates in favor of a warm, human, yet meticulously crafted aesthetic.

### Core Tenets
1. **Warm Canvas Foundation**: Built on unbleached linen and ivory tones (`#faf9f5`), avoiding clinical pure-white glare.
2. **Terracotta Signature Accent**: A distinctive warm terracotta clay accent (`#cc785c`) used deliberately for key actions and focal points.
3. **Delicate Hairline Geometry**: Structural depth is achieved using subtle 1px hairline borders (`#e6dfd8` / `#e8e2d9`) rather than heavy dropshadows.
4. **Editorial Typography**: Tight letter spacing (`-0.035em` display tracking) with sharp sans-serif headlines (`Inter`) anchored by utilitarian data monospace (`JetBrains Mono`).
5. **Zero AI/Template Slop**: Strictly no decorative sparkle badges (`✨`) and no flashing dot pills (`[● Toko Aktif]`). Every element serves an authentic user purpose.

---

## 2. Color Palette & Design Tokens

### 2.1 Surface & Canvas Tokens

| Token Name | CSS Variable | HEX Value | Role & Usage |
| :--- | :--- | :--- | :--- |
| `canvas` | `--canvas` | `#faf9f5` | Global body background, warm ivory linen canvas |
| `surface-card` | `--surface-card` | `#ffffff` | Primary container background, modals, cards, floating surfaces |
| `surface-soft` | `--surface-soft` | `#faf8f5` | Subtle nested panels, table headers, hovered button states |
| `surface-dark` | `--surface-dark` | `#181715` | Deep charcoal dark sections, mobile navigation, dark cards |
| `surface-dark-elevated` | `--surface-dark-elevated` | `#252320` | Raised dark surfaces, dark buttons, dark dropdown menus |
| `surface-dark-soft` | `--surface-dark-soft` | `#1f1e1b` | Secondary dark backgrounds, dark table row accents |

### 2.2 Brand & Primary Tokens (Terracotta Accent)

| Token Name | CSS Variable | HEX Value | Role & Usage |
| :--- | :--- | :--- | :--- |
| `primary` | `--primary` | `#cc785c` | Main CTA button, active links, logo emblem, key brand accents |
| `primary-active` | `--primary-active` | `#a9583e` | Hover/active state for primary interactive elements |
| `primary-disabled` | `--primary-disabled` | `#e6dfd8` | Disabled state background for primary actions |
| `primary-subtle` | — | `#fae7e0` | Light terracotta tint for badge containers and icon backdrops |

### 2.3 Typography & Ink Tokens

| Token Name | CSS Variable | HEX Value | Role & Usage |
| :--- | :--- | :--- | :--- |
| `ink` | `--ink` | `#141413` | Primary headings, prominent labels, display typography |
| `ink-strong` | — | `#252523` | High-contrast body copy and table cells |
| `ink-body` | — | `#3d3d3a` | Default body paragraphs, description copy |
| `muted` | `--muted` | `#6c6a64` | Secondary text, field helpers, timestamps, subtle labels |
| `muted-soft` | — | `#8e8b82` | Low-emphasis metadata, breadcrumbs, placeholder text |
| `on-dark` | — | `#faf9f5` | Pure headline text on dark containers |
| `on-dark-soft` | — | `#a09d96` | Subordinate copy and secondary text on dark containers |

### 2.4 Border & Hairline Tokens

| Token Name | CSS Variable | HEX Value | Role & Usage |
| :--- | :--- | :--- | :--- |
| `hairline` | `--hairline` | `#e6dfd8` | Standard component border, card divider, input perimeter |
| `hairline-soft` | — | `#ebe6df` | Subtle table row dividers, nested box borders |
| `border-dark` | — | `#2b2824` | 1px border for dark cards and elevated dark controls |

### 2.5 Semantic Status Tokens

| Status Token | HEX Value | Background Tint | Border Tint | Role & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `status-success` | `#1e612f` / `#5db872` | `#edf7ee` | `#2e7d32`/20 | Paid orders, completed steps, positive trends |
| `status-amber` | `#8c4327` / `#e8a55a` | `#faf4ed` | `#cc785c`/25 | Pending WhatsApp orders, alert warnings, neutral trends |
| `status-error` | `#c64545` | `#fdf2f2` | `#c64545`/20 | Order cancellations, form errors, destructive actions |
| `status-teal` | `#5db8a6` | `#eef8f6` | `#5db8a6`/25 | Informational notifications, highlight metrics |
| `status-blue` | `#1d4ed8` | `#eff6ff` | `#2563eb`/20 | In-process orders, packaging stage |
| `status-violet` | `#6d28d9` | `#f5f3ff` | `#7c3aed`/20 | Shipped items, courier tracking states |

---

## 3. Typography Hierarchy

The typographic system relies on **Inter** for clean readability across all screen sizes and **JetBrains Mono** for pricing, timestamps, order codes, and system metrics.

### 3.1 Font Family Declarations
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-serif: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

### 3.2 Typography Scale & Tracking Spec

| Level | Size (Desktop / Mobile) | Weight | Tracking | Font Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `48px - 60px` / `34px - 40px` | 800 | `-0.035em` | Sans (Inter) | Landing Hero headline, primary title |
| **Heading H2** | `30px - 36px` / `24px - 28px` | 700 | `-0.03em` | Sans (Inter) | Bento Section titles, page headers |
| **Heading H3** | `20px - 24px` / `18px - 20px` | 700 | `-0.025em` | Sans (Inter) | Card titles, modal headers, group labels |
| **Subheading** | `15px - 16px` | 500 / 600 | `-0.015em` | Sans (Inter) | Component section captions, navigation links |
| **Body (Default)** | `14px` / `13px` | 400 | `normal` | Sans (Inter) | General descriptions, paragraph text, modal body |
| **Body Small** | `12px` / `11px` | 400 / 500 | `normal` | Sans (Inter) | Input helpers, table captions, secondary notes |
| **Data Mono** | `11px` - `13px` | 500 | `+0.05em` | Mono (JetBrains) | Order codes (`#ORD-9021`), Price tags, Currency (`Rp`) |
| **Overline Tag** | `10px` / `11px` | 600 | `+0.06em` | Mono / Sans | Category labels, field labels (`UPPERCASE`) |

---

## 4. Spacing, Radii & Elevation

### 4.1 Border Radius Tokens

| Token | Value | Tailwind Class | Application |
| :--- | :--- | :--- | :--- |
| `xs` | `4px` | `rounded-xs` | Badges, small tags, indicator chips |
| `sm` | `6px` | `rounded-sm` | Small buttons (`size="sm"`), compact dropdown items |
| `md` | `8px` | `rounded-md` | Default buttons, input fields, select menus |
| `lg` | `12px` | `rounded-lg` | Standard cards, thumbnail containers, popovers |
| `xl` | `16px` | `rounded-xl` | Metric cards, product showcases, segmented toggles |
| `2xl` | `24px` | `rounded-2xl` | Modal dialogs, bento boxes, elevated container panels |
| `full` | `9999px` | `rounded-full` | Avatars, pill buttons, toast icons, close buttons |

### 4.2 Elevation & Shadow Layers

- **`shadow-2xs`**: `0 1px 2px 0 rgba(0, 0, 0, 0.03)` — Default flat cards, badges, small table containers.
- **`shadow-xs`**: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)` — Hoverable items, interactive chips.
- **`shadow-sm`**: `0 2px 6px -1px rgba(0, 0, 0, 0.06)` — Primary CTA buttons, sticky headers.
- **`shadow-md`**: `0 8px 20px -4px rgba(0, 0, 0, 0.08)` — Dropdowns, popovers, product card hover state.
- **`shadow-xl`**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` — Cart drawer, toast stack.
- **`Floating Modal Shadow`**: `shadow-[0_25px_65px_-12px_rgba(0,0,0,0.38),0_0_0_1px_rgba(0,0,0,0.06)]` — Spring-animated dialogs.

---

## 5. Layout Architecture & Viewport Archetypes

### 5.1 Public Landing Page Architecture
- **Max Width**: `max-w-7xl` (`1280px`) with fluid responsive horizontal padding (`px-4 sm:px-6 lg:px-8`).
- **Hero Section**: Single-screen ergonomic balance, featuring left value proposition & slug claim box paired with right perpetual-float interactive storefront preview card.
- **Bento Grid**: Asymmetric layout (`md:grid-cols-3` or `md:grid-cols-12`) with rounded-2xl cards and directional entry reveals (`bento-left` from left, `bento-right` from right).
- **Sequential Stepper**: Horizontal flow on desktop connected by expanding hairline progress lines (`scaleX: 0 -> 1`).

### 5.2 Merchant Dashboard Architecture
- **Structure**: Two-column split layout (`min-h-screen bg-[#faf8f5] flex flex-col lg:flex-row`).
- **Sidebar**: Fixed/sticky navigation on desktop (`w-64 border-r border-[#e8e2d9] bg-white`), featuring:
  - Header with brand avatar + store status overview
  - Nav item list with terracotta accent on active item (`bg-[#efe9de] text-[#141413] border border-[#e8e2d9]`)
  - Bottom sticky session actions with direct "Lihat Toko" external link and logout button.
- **Top Edge Progress Bar**: 3px luminous gradient line (`animate-top-loader`) during API transitions.

### 5.3 Public Storefront Link-in-Bio
- **Centered Canvas**: Mobile-first centered container (`max-w-md sm:max-w-xl mx-auto px-4 py-8`).
- **Store Identity**: Round avatar (`size-24 rounded-full border-2 border-hairline`), store title (`text-2xl font-bold`), bio/tagline, and quick share action.
- **Micro-Catalogue Grid**: 2-column on mobile, 3-column on tablet/desktop with instant variant drawer and floating checkout drawer badge.

---

## 6. Core Component Library Specifications

### 6.1 Buttons (`Button`)

```tsx
<Button variant="primary" size="md">Buka Toko Sekarang</Button>
```

#### Variants
1. **`primary`**: `bg-primary text-white hover:bg-primary-active active:bg-primary-active/90 shadow-sm`
2. **`secondary`**: `bg-surface-card text-ink hover:bg-surface-soft active:bg-hairline border border-hairline`
3. **`dark`**: `bg-surface-dark-elevated text-on-dark hover:bg-[#322f2b] active:bg-surface-dark border border-[#38342f]`
4. **`outline`**: `bg-transparent text-ink border border-hairline hover:bg-surface-card`
5. **`ghost`**: `bg-transparent text-ink hover:bg-surface-card/60`
6. **`danger`**: `bg-status-error/10 text-status-error hover:bg-status-error/20 border border-status-error/20`

#### Sizes
- `sm`: `h-8 px-3 text-xs rounded-sm gap-1.5`
- `md`: `h-10 px-4 py-2 text-sm rounded-md gap-2`
- `lg`: `h-12 px-6 text-base rounded-md gap-2.5`
- `icon`: `size-10 rounded-md`

---

### 6.2 Cards (`Card`)

```tsx
<Card variant="cream">
  <CardHeader>
    <CardTitle>Ringkasan Penjualan</CardTitle>
    <CardDescription>Performa 30 hari terakhir</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

- **`cream`**: `bg-white border border-[#e8e2d9] text-ink shadow-2xs rounded-lg`
- **`dark`**: `bg-surface-dark border border-[#2b2824] text-on-dark shadow-md rounded-lg`
- **`canvas`**: `bg-canvas border border-[#e8e2d9] text-ink rounded-lg`

---

### 6.3 Status Badges (`Badge`)

```tsx
<Badge status="PENDING_WA" />
<Badge status="PAID" />
```

Standardized styling: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium tracking-tight whitespace-nowrap shadow-2xs`:

| Status Key | Label | Badge Background & Text | Associated Icon |
| :--- | :--- | :--- | :--- |
| `PENDING_WA` | Menunggu WA | `bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25` | `MessageCircle` |
| `PAID` | Sudah Bayar | `bg-[#edf7ee] text-[#1e612f] border border-[#2e7d32]/20` | `Check` |
| `PROCESSING` | Diproses | `bg-[#eff6ff] text-[#1d4ed8] border border-[#2563eb]/20` | `Package` |
| `SHIPPED` | Dikirim | `bg-[#f5f3ff] text-[#6d28d9] border border-[#7c3aed]/20` | `Truck` |
| `COMPLETED` | Selesai | `bg-[#edf7ee] text-[#1e612f] border border-[#2e7d32]/20` | `CheckCheck` |
| `CANCELLED` | Dibatalkan | `bg-[#f5f5f4] text-[#78716c] border border-[#78716c]/20` | `XCircle` |

---

### 6.4 Modals & Spring Dialogs (`Modal`)

- **Backdrop**: `fixed inset-0 bg-black/60 backdrop-blur-xs z-0 cursor-pointer`
- **Dialog Box**: `relative w-full rounded-2xl border max-h-[85vh] flex flex-col z-10 overflow-hidden shadow-[0_25px_65px_-12px_rgba(0,0,0,0.38)]`
- **Animation Specs**: Spring curve with `damping: 30`, `stiffness: 300`, `scale: 0.96 -> 1.0`, `y: 8 -> 0`.
- **Anatomy**:
  - Sticky Title Header with subtle border separator and circular close action (`X`).
  - Single scrollable body (`overflow-y-auto overscroll-contain`).
  - Pinned sticky bottom footer (`bg-white/95 backdrop-blur-xs border-t border-inherit`).

---

### 6.5 Top Progress Bar Loader (`TopProgressBar`)

- **Location**: `fixed top-0 left-0 right-0 h-[3px] z-[99999] pointer-events-none`
- **Gradient**: `bg-gradient-to-r from-transparent via-[#cc785c] to-[#e59278] shadow-[0_0_12px_rgba(204,120,92,0.9)]`
- **Leading Head**: White blur point `w-6 h-[5px] bg-white/90 blur-[0.5px] rounded-full`
- **Animation**: `top-loader-sweep 1.25s cubic-bezier(0.4, 0, 0.2, 1) infinite`

---

### 6.6 Notification Toasts (`Toaster`)

- **Container**: `fixed top-4 right-4 sm:top-5 sm:right-5 z-[99999] flex flex-col gap-2.5 max-w-sm`
- **Card**: `rounded-2xl bg-white border border-[#e8e2d9] shadow-xl shadow-stone-900/5 relative overflow-hidden flex items-start gap-3 p-4`
- **Accent Indicator**: 4px left-edge bar (`emerald-600` for success, `rose-600` for error, `#cc785c` for info).

---

### 6.7 Form Controls & Inputs

- **Input Base**: `h-10 px-3.5 py-2 text-sm rounded-md bg-white border border-[#e8e2d9] text-ink focus:outline-none focus:ring-2 focus:ring-[#cc785c]/30 focus:border-[#cc785c] transition-all`
- **Label Styling**: `text-xs font-mono uppercase tracking-wider text-muted font-medium`
- **Error State**: `border-rose-400 focus:border-rose-500 focus:ring-rose-500/20`
- **Input Prefix / Suffix**: `bg-[#faf8f5] text-muted border-r border-[#e8e2d9] px-3 font-mono text-xs flex items-center`

---

## 7. Motion & Micro-Interactions

### 7.1 GSAP Timelines
- **Page Entrance**: Snappy `power2.out` cascade across headline, subcopy, CTA, and visual previews (`duration: 0.4s - 0.45s`).
- **Continuous Floating**: Perpetual subtle floating card using `ease: 'sine.inOut'`, `y: -8px`, `duration: 2.2s`, `repeat: -1, yoyo: true`.
- **ScrollTrigger Bento**: Asymmetrical slide-in reveals triggered at `top 86%` of viewport.

### 7.2 Micro-Interactions (Framer Motion / Motion)
- **Interactive Buttons**: `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- **Product Card Hover**: `whileHover={{ y: -4 }}` with image scale `group-hover:scale-105 duration-500`.
- **Quantity Toggles**: Instant micro-bounce on item addition/subtraction.

---

## 8. Mandatory UI Rules & Prohibited Patterns

### 8.1 Strictly Prohibited: Dot Pill Status
- **BAN**: Do NOT create status pills with pulsing/blinking dots (e.g. `[● Toko Aktif]`, `[● Online]`).
- **ALTERNATIVE**: Use clean badges with semantic borders, crisp icons (e.g. `<Check className="size-3" />`), and solid typography.

### 8.2 Strictly Prohibited: Sparkle / AI Pill Badges
- **BAN**: Do NOT add decorative headline pill badges containing sparkle/star icons (`<Sparkle />`, `<Sparkles />`, `✦`, `✨`) and marketing fluff like `[✨ Platform Link-in-Bio Terpadu]`.
- **ALTERNATIVE**: Let clean headlines, bold value propositions, and clean product previews establish authority.

### 8.3 Mobile Checkout Ergonomics
- Never trap user focus in multi-layered scroll containers.
- Form inputs must automatically avoid keyboard occlusion.
- WhatsApp message formatting must be cleanly organized with emojis, bold headers, and exact totals.

<div align="center">
  <img src="public/favicon.svg" alt="tautanAI Logo" width="100" height="100" />

  # tautanAI
  **Autonomous AI-Powered WhatsApp Commerce & Micro-Catalogue Storefront for Indonesian SMBs**
  *From Idea to Impact: Creating Intelligent Web Solutions for a Smarter Bali*

[![Bali DigiFest 2026](https://img.shields.io/badge/Bali_DigiFest_2026-AI_Web_Innovation_Challenge-FF6B35?style=flat&logo=target)](https://github.com/haidirwf/TautanAI)
[![Version](https://img.shields.io/badge/version-v1.0--submission-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-3.1_Flash--Lite-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Fonnte](https://img.shields.io/badge/WhatsApp-Fonnte_Gateway-25D366?style=flat&logo=whatsapp)](https://fonnte.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

</div>

<br />

---

## Description

**tautanAI** adalah platform *link-in-bio micro-commerce* multi-tenant modern yang dirancang khusus untuk memberdayakan pelaku UMKM, pedagang mandiri, dan wirausaha lokal (khususnya sentra kriya, kuliner, dan ekonomi kreatif di Bali). Platform ini menggabungkan profil media sosial interaktif, etalase mikro instan (*micro-catalogue*) dengan **0% biaya transaksi platform**, dashboard finansial merchant berstandar fintech, serta **Autonomous WhatsApp AI Copilot (24/7)** bertenaga **Google Gemini** dan **Fonnte** untuk melayani tanya-jawab stok, menyusun draf pesanan, memverifikasi foto bukti transfer via *Multimodal Vision OCR*, hingga menghimpun rating kepuasan pelanggan secara otomatis.

---

## Problem & Target User

### Problem & Background
Bagi pelaku UMKM di Indonesia, khususnya di Bali, WhatsApp merupakan kanal penjualan paling alami dengan tingkat konversi tertinggi. Namun, tingginya interaksi ini membawa tiga permasalahan struktural:
1. **Kehilangan Pembeli Akibat Respons Lambat (*Drop-off Rate*):** Penjual (kedai kopi, pengrajin perak Celuk, butik tenun Endek, toko oleh-oleh) sering sibuk melayani pembeli fisik atau toko tutup di malam hari. Pesan WhatsApp yang tidak segera dibalas membuat calon pembeli kabur ke kompetitor.
2. **Beban Administrasi Manual yang Melelahkan:** Waktu berjam-jam per hari terbuang hanya untuk menjawab pertanyaan varian yang sama, menghitung total belanja, menyalin alamat kirim satu per satu, dan mencocokkan mutasi bank secara manual saat pembeli mengirim foto struk transfer.
3. **Komisi Marketplace Menggerus Margin:** Marketplace konvensional mengenakan potongan biaya layanan (*take rate*) sekitar 8%–15% per transaksi, sementara membangun website e-commerce mandiri membutuhkan biaya dan keahlian teknis yang sulit dijangkau pedagang kecil.

### Target User
- **Pemilik UMKM & Pedagang Mandiri:** Sentra kriya (perak Celuk, ukiran kayu Ubud), fesyen etnik (tenun Endek, batik lokal), kedai kuliner/F&B, dan toko oleh-oleh khas Bali yang tidak memiliki admin khusus 24 jam.
- **Kreator Konten & Social Seller:** Wirausahawan independen yang mengandalkan promosi visual di Instagram/TikTok dan membutuhkan katalog belanja instan via tautan bio tanpa komisi potongan pihak ketiga.

---

## Key Features

- **Etalase Mikro Instan (`/:slug`):** Halaman toko publik *mobile-first* berkecepatan tinggi dengan identitas merek, tautan sosial, filter kategori, pemilihan varian bertingkat (ukuran, warna, penyesuaian harga), dan drawer keranjang interaktif.
- **Direct WhatsApp Checkout (0% Fee):** Konversi keranjang belanja menjadi format pesan WhatsApp terstruktur ke nomor penjual tanpa potongan biaya komisi per transaksi (seluruh pembayaran 100% langsung ke rekening/QRIS penjual).
- **Autonomous WhatsApp AI Sales Agent:** Asisten AI 24/7 bertenaga Google Gemini (`gemini-3.1-flash-lite`, `gemini-3.8-flash`) yang mampu menjawab pertanyaan katalog, mengecek inventaris stok, merekomendasikan produk, dan menerbitkan draf pesanan resmi (`create_order_draft`) ke database.
- **Multimodal Vision OCR Bukti Transfer:** Pembeli cukup mengirim foto/tangkapan layar struk transfer bank atau QRIS di WhatsApp. AI Vision mengekstrak nama bank, nama pengirim, nomor rekening, dan nominal transfer, lalu otomatis mengubah status pesanan menjadi `PAID` (Lunas).
- **Pengumpul Ulasan Otomatis (*Post-Payment CS*):** Setelah pembayaran terverifikasi, AI secara otomatis menanyakan kepuasan pembeli (1–5 bintang) di chat WhatsApp dan mencatat ulasannya langsung ke database toko via *function calling*.
- **Smart Multi-Store Routing (1 Nomor WA untuk Banyak Toko):** Algoritma pintar pendeteksi toko berdasarkan kode draf pesanan (`#ORD-...`), nama produk, riwayat transaksi pembeli, atau direktori pilihan otomatis saat chat ambigu.
- **Fintech Merchant Dashboard (`/dashboard`):** Pelacakan omzet riil (*settled gross revenue*), antrean transaksi (*pending pipeline*), *Average Order Value (AOV)*, *conversion rate*, serta grafik visual trajectory tren harian/mingguan/bulanan.
- **Manajemen Siklus Pesanan (`/dashboard/orders`):** Kontrol siklus transaksi (`PENDING_WA`, `PAID`, `PROCESSING`, `SHIPPED`, `COMPLETED`), input nomor resi pelacakan kurir, serta inspeksi rincian bukti transfer pembeli.
- **Katalog dengan AI Context Notes (`/dashboard/catalog`):** Manajemen produk dan inventaris dengan kolom instruksi khusus untuk membekali AI pemahaman mendalam tentang produk (bahan, panduan ukuran, keunikan kriya lokal).
- **Kustomisasi Profil & Persona AI (`/dashboard/settings`):** Penyesuaian nama toko, nomor WhatsApp, nomor rekening tujuan, gaya persona bahasa AI (keramahan lokal Bali, kasual, atau formal), dan pemilihan model Gemini.

---

## Tech Stack

- **Frontend Core:** [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) Single Page Application (SPA).
- **Bahasa & Type Safety:** [TypeScript 5.7](https://www.typescriptlang.org/) dengan *strict mode* untuk keandalan kontrak antarmuka data.
- **AI Engine:** [Google Gemini API](https://ai.google.dev/) (`gemini-3.1-flash-lite` default, `gemini-3.8-flash`, `gemini-flash-latest`) dengan *REST v1beta*, *Autonomous Function Calling*, dan *Multimodal Vision OCR*.
- **WhatsApp Gateway:** [Fonnte API](https://fonnte.com/) untuk *inbound webhook reception* dan *outbound automated message dispatch*.
- **Styling & Design System:** [Tailwind CSS v3.4](https://tailwindcss.com/) dengan palet *warm cream canvas*, hierarki tipografi editorial, dan rasio kontras visual tinggi.
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) dengan persistensi local storage untuk keranjang belanja dan sesi autentikasi.
- **Animasi & Physics:** [Motion](https://motion.dev/) (Framer Motion v13) dan [GSAP 3](https://gsap.com/) ScrollTrigger untuk transisi halaman dan drawer belanja dinamis.
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL 15, Supabase Auth dengan Google OAuth & Email/Password, Storage bucket, dan Row Level Security).
- **Serverless Automation:** Vercel Serverless Functions (`api/whatsapp.ts`) untuk pemrosesan webhook WhatsApp secara asinkron.
- **Hosting & Deployment:** [Vercel](https://vercel.com/) (Frontend & Serverless Functions) serta kompatibel dengan shared hosting cPanel Apache via `public/.htaccess`.

---

## AI Implementation

Implementasi kecerdasan buatan pada tautanAI berfokus pada **solusi nyata dan dampak terukur** (*material integration*):

- **Model AI:** Google Gemini `gemini-3.1-flash-lite` (default produksi) melalui Generative Language REST API v1beta. Dipilih karena latensi rendah (<1.5 detik), efisiensi komputasi, dan kemampuan pemahaman instruksi bahasa Indonesia yang sangat alami.
- **Autonomous Function Calling Loop:** AI secara otonom memanggil tool eksekusi database Supabase:
  - `check_stock`: Memeriksa stok varian barang secara langsung.
  - `create_order_draft`: Menerbitkan nota pesanan resmi baru ke database (`PENDING_WA`).
  - `confirm_buyer_payment`: Memverifikasi struk transfer via Vision OCR dan mengubah status menjadi `PAID`.
  - `update_order_status`: Memperbarui status pesanan (misal pembatalan atau perubahan alur).
  - `submit_customer_review`: Menyimpan rating kepuasan (1–5 bintang) dan ulasan pembeli ke database.
- **Multimodal Vision OCR:** File gambar struk transfer (Base64) dianalisis langsung oleh Gemini tanpa API OCR pihak ketiga berbayar tambahan. Sistem mengekstrak nama bank/e-wallet, nomor rekening, nama pengirim, dan nominal transfer secara otomatis.
- **Domain Knowledge Injection (AI Context Notes):** Setiap produk dapat memiliki catatan khusus yang diinjeksi ke dalam prompt sistem AI, sehingga AI mampu menjelaskan filosofi kain tenun, bahan kriya perak, atau resep kuliner khas Bali dengan akurasi tinggi layaknya karyawan berpengalaman.

---

## Architecture / Data Flow

```text
[ Pembeli di WhatsApp ]
       │
       ▼ (Kirim pesan teks atau foto struk transfer)
[ Fonnte WhatsApp Gateway ]
       │
       ▼ HTTP POST Webhook
[ /api/whatsapp (Vercel Serverless) ]
       │
       ├── 1. Dual-Layer Deduplication Guard (Cache Memori 15 Menit + Database Log)
       ├── 2. Smart Multi-Store Routing (Deteksi Toko via Order Code / Context)
       ├── 3. Context Retrieval (Data Toko, Katalog Aktif, Riwayat Chat, & Order Pending)
       ├── 4. Google Gemini REST API (v1beta)
       │       ├── Multimodal Vision OCR (Menganalisis Struk Bukti Bayar)
       │       └── Autonomous Function Calling:
       │             ├── create_order_draft  ──► [ Supabase PostgreSQL (orders) ]
       │             ├── confirm_buyer_payment ─► [ Supabase PostgreSQL (status: PAID) ]
       │             └── submit_customer_review ─► [ Supabase PostgreSQL (reviews) ]
       ├── 5. Pencatatan Sesi Percakapan (ai_chat_sessions)
       │
       ▼ Kirim Balasan via https://api.fonnte.com/send
[ Pembeli Menerima Balasan Instan di WhatsApp ]
       │
       ▼ Sinkronisasi Real-Time
[ Dashboard Finansial Merchant (/dashboard) ] (Omzet Terverifikasi & Status Pesanan)
```

---

## Installation / Run Instructions

### 1. Clone Repositori
```bash
git clone https://github.com/haidirwf/TautanAI.git
cd TautanAI
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin berkas template environment:
```bash
cp .env.example .env
```
Isi variabel yang dibutuhkan pada berkas `.env`:
```env
# Supabase Database & Auth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Opsional untuk webhook admin bypass

# Google Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-3.1-flash-lite

# Fonnte WhatsApp Gateway
FONNTE_TOKEN=your-fonnte-token-here
```

### 4. Setup Database (Supabase)
1. Buka dashboard project Supabase Anda.
2. Masuk ke menu **SQL Editor**.
3. Jalankan isi berkas [`supabase/schema.sql`](supabase/schema.sql) untuk membuat tabel (`stores`, `products`, `orders`, `categories`, `store_links`, `reviews`, `ai_chat_sessions`) beserta kebijakan *Row Level Security (RLS)*.

### 5. Jalankan Local Development Server
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

### 6. Build Produksi
```bash
npm run build
```
Berkas bundel statis produksi siap rilis akan terkompilasi di direktori `dist/`.

---

## Deployment URL

- **URL Aplikasi / MVP Utama:** [https://tautan-ai.vercel.app/](https://tautan-ai.vercel.app/)
- **Etalase Demo Publik:** [https://tautan-ai.vercel.app/demo](https://tautan-ai.vercel.app/demo)
- **Repository GitHub:** [https://github.com/haidirwf/TautanAI](https://github.com/haidirwf/TautanAI)

---

## Demo Account

Untuk memudahkan pengujian oleh dewan juri tanpa perlu melakukan registrasi dari awal, kami telah menyediakan akun demo terverifikasi:

- **Halaman Login:** [https://tautan-ai.vercel.app/login](https://tautan-ai.vercel.app/login)
- **Email:** `demo@tautan.site`
- **Password:** `demo123456password`
- **Fitur Quick Demo:** Di halaman login tersedia tombol **"Gunakan Kredensial Demo"** untuk mengisi akun uji coba secara otomatis dalam satu klik.
- **Pengujian Etalase Pembeli (Tanpa Login):** Juri dapat langsung menguji alur pemilihan produk, varian, dan keranjang belanja WhatsApp dengan membuka tautan etalase toko di [https://tautan-ai.vercel.app/demo](https://tautan-ai.vercel.app/demo).

---

## Known Limitations

- **Konektivitas Gateway Pihak Ketiga:** Kecepatan respons balasan WhatsApp sangat bergantung pada uptime dan stabilitas *webhook dispatch* dari penyedia gateway pihak ketiga (Fonnte).
- **Kualitas Citra Foto Struk Transfer:** Akurasi pembacaan *Vision OCR* dipengaruhi oleh pencahayaan dan resolusi gambar struk. Foto struk yang terpotong parah, buram, atau sobek memerlukan konfirmasi/pengecekan manual oleh penjual.
- **Pencatatan Ongkos Kirim:** Pada versi MVP saat ini, perhitungan ongkos kirim ekspedisi masih diselesaikan secara konsultatif langsung antara pembeli dan AI di chat WhatsApp sebelum integrasi API kurir otomatis.

---

## Third-party Resources / Credits

- **Google Gemini API:** Mesin utama model kecerdasan buatan percakapan natural dan analisis citra visual (Google AI Studio).
- **Fonnte Gateway:** Layanan integrasi API WhatsApp untuk pengiriman dan penerimaan pesan webhook.
- **Supabase:** Penyedia layanan infrastruktur *Backend-as-a-Service* (PostgreSQL 15, Storage Bucket, Auth, dan RLS).
- **Unsplash:** Penyedia aset fotografi katalog contoh untuk demonstrasi toko (lisensi komersial bebas).
- **AI Coding Assistant:** Pengembangan, pengujian arsitektur, dan optimasi prompt dibantu oleh Google Gemini 3.8 Flash melalui Antigravity CLI (`agy`).

---

## Team Members

Kompetisi **AI Web Innovation Challenge — Bali DigiFest 2026** (Kategori SMK):

- **Nama Tim:** Bekasi dan Sekitarnya juga Solo Raya
- **Asal Instansi:** SMK IDN Solo, Kab. Karanganyar, Jawa Tengah
- **Ketua Tim:** Muhammad Haidar Rauf Prayogo (Fullstack Web Developer & AI Engineering) — WhatsApp: `082173662010` | Email: `raufidnn@gmail.com`
- **Anggota Tim:** Faiz Faishal Nugroho (Frontend Developer & UI/UX Specialist)

---

## Security Hardening & Resilience

- **Dual-Layer Webhook Deduplication:** Penggabungan cache memori geser 15 menit dengan verifikasi database pada tabel `ai_chat_sessions` untuk mengeleminasi pemrosesan pesan duplikat dari retry Fonnte.
- **In-Flight Lock (45 Detik):** Mencegah balasan ganda saat beberapa serverless instance menerima payload bersamaan.
- **Group Isolation & Anti-Looping:** Pengabaian pesan grup WhatsApp (`@g.us`) dan pencegahan bot merespons pesannya sendiri (*device echo*).
- **Jaminan HTTP 200 Acknowledgment:** Webhook selalu mengembalikan status HTTP 200 agar gateway Fonnte tidak mengirimkan pengulangan pesan (*spam retry loops*).
- **Row Level Security (RLS):** Seluruh data toko, pesanan, dan keuangan diisolasi berdasarkan identitas pengguna merchant.

---

## License

Proyek ini dilisensikan di bawah **[MIT License](LICENSE)**.

```text
Copyright (c) 2026 tautanAI contributors
Bali DigiFest 2026 - AI Web Innovation Challenge
```

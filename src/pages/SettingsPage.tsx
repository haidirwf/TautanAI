import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/supabase'
import { Check, Store, Phone, Globe, FileText, Bot, Key, CreditCard, MessageSquare, Sliders, Copy, Link2, Trash2, Plus, ExternalLink } from 'lucide-react'
import { toast } from '@/store/useToastStore'
import type { StoreLink } from '@/types'

export function SettingsPage() {
  const { user } = useAuthStore()
  const storeId = user?.storeId || ''
  const [currentStoreId, setCurrentStoreId] = useState(user?.storeId || '')
  const [storeName, setStoreName] = useState(user?.name || '')
  const [slug, setSlug] = useState(user?.storeSlug || '')
  const [whatsapp, setWhatsapp] = useState('')
  const [tagline, setTagline] = useState('')

  // Link-in-Bio States
  const [links, setLinks] = useState<StoreLink[]>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)

  // AI & Fonnte Configuration States
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiPersona, setAiPersona] = useState('Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.')
  const [aiInstructions, setAiInstructions] = useState('Bantu pembeli mengecek ketersediaan produk, jelaskan detail dan varian barang, hitung total pesanan, dan pandu pembayaran transfer atau QRIS.')
  const [aiPaymentInfo, setAiPaymentInfo] = useState('BCA: 1234567890 a/n Toko | QRIS tersedia')
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite')
  const [fonnteToken, setFonnteToken] = useState('')

  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadStore() {
      let store = null
      if (user?.id) {
        store = await api.getStoreByUserId(user.id)
      }
      if (!store && user?.storeSlug) {
        store = await api.getStoreBySlug(user.storeSlug)
      }
      if (store) {
        setCurrentStoreId(store.id)
        setStoreName(store.name || '')
        setSlug(store.slug || '')
        setWhatsapp(store.whatsapp_number || '')
        setTagline(store.tagline || '')
        if (store.ai_enabled !== undefined) setAiEnabled(store.ai_enabled)
        if (store.ai_persona) setAiPersona(store.ai_persona)
        if (store.ai_instructions) setAiInstructions(store.ai_instructions)
        if (store.ai_payment_info) setAiPaymentInfo(store.ai_payment_info)
        if (store.ai_model) setAiModel(store.ai_model)
        if (store.fonnte_token) setFonnteToken(store.fonnte_token)

        const storeLinks = await api.getStoreLinks(store.id)
        setLinks(storeLinks)
      }
    }
    loadStore()
  }, [user?.id, user?.storeSlug])

  const handleAddLink = async () => {
    const targetStoreId = currentStoreId || storeId
    if (!targetStoreId || !newLinkTitle.trim() || !newLinkUrl.trim()) return

    let formattedUrl = newLinkUrl.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setIsAddingLink(true)
    try {
      const created = await api.createStoreLink(targetStoreId, newLinkTitle.trim(), formattedUrl)
      if (created) {
        setLinks((prev) => [...prev, created])
        setNewLinkTitle('')
        setNewLinkUrl('')
        toast.success('Tautan Ditambahkan', 'Tautan etalase bio berhasil disimpan.')
      }
    } catch (err) {
      toast.error('Gagal Menambah Tautan', 'Periksa koneksi Anda dan coba lagi.')
    } finally {
      setIsAddingLink(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    setDeletingLinkId(linkId)
    try {
      const ok = await api.deleteStoreLink(linkId)
      if (ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId))
        toast.success('Tautan Dihapus', 'Tautan telah dihapus dari etalase.')
      }
    } catch (err) {
      toast.error('Gagal Menghapus Tautan', 'Terjadi kesalahan saat menghapus tautan.')
    } finally {
      setDeletingLinkId(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const targetStoreId = currentStoreId || storeId
    try {
      await api.updateStore(targetStoreId, {
        name: storeName.trim(),
        slug: slug.trim(),
        whatsapp_number: whatsapp.trim(),
        tagline: tagline.trim(),
        ai_enabled: aiEnabled,
        ai_persona: aiPersona.trim(),
        ai_instructions: aiInstructions.trim(),
        ai_payment_info: aiPaymentInfo.trim(),
        ai_model: aiModel.trim(),
        fonnte_token: fonnteToken.trim(),
      })
      if (user) {
        useAuthStore.setState({
          user: {
            ...user,
            name: storeName.trim(),
            storeSlug: slug.trim(),
            storeId: targetStoreId,
          },
        })
      }
      setSaved(true)
      toast.success('Pengaturan Disimpan', 'Konfigurasi toko dan AI WhatsApp Agent berhasil diperbarui.')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Failed to update store settings', err)
      toast.error('Gagal Menyimpan Pengaturan', 'Terjadi kesalahan saat menyimpan konfigurasi toko.')
    } finally {
      setIsSaving(false)
    }
  }

  const webhookUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'https://tautan-ai.vercel.app/api/whatsapp'
        : `${window.location.origin}/api/whatsapp`)
    : 'https://tautan-ai.vercel.app/api/whatsapp'

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Tautan Disalin', 'Webhook URL berhasil disalin ke clipboard.')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 max-w-3xl">
        {/* Clean Header */}
        <div className="pb-4 border-b border-[#e8e2d9]">
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#141413] tracking-tight">
            Pengaturan Toko & AI Agent
          </h1>
          <p className="text-xs sm:text-sm text-[#706c64] mt-0.5">
            Kelola profil toko, etalase tautan, serta konfigurasi agen penjualan WhatsApp bertenaga Google Gemini.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Card 1: Profil Toko */}
          <div className="flex flex-col gap-5 p-6 sm:p-7 rounded-2xl border border-[#e8e2d9] bg-white shadow-2xs">
            <h2 className="text-sm font-bold text-[#141413] tracking-tight">Profil & Informasi Kontak</h2>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Store className="size-3.5 text-[#706c64]" />
                <span>Nama Toko</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Globe className="size-3.5 text-[#706c64]" />
                <span>Tautan URL Toko</span>
              </label>
              <div className="flex items-center rounded-lg bg-white border border-[#e8e2d9] px-3 focus-within:border-[#cc785c] focus-within:ring-1 focus-within:ring-[#cc785c] shadow-2xs">
                <span className="text-xs text-[#8c867b] font-mono select-none">tautan.site/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full h-10 bg-transparent text-sm text-[#141413] focus:outline-none pl-0.5 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Phone className="size-3.5 text-[#706c64]" />
                <span>Nomor WhatsApp Toko</span>
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-sm text-[#141413] font-mono focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
              />
              <span className="text-[11px] text-[#8c867b] mt-1.5 block">
                Format: 08... atau 628... Digunakan untuk pengiriman pesanan dan sinkronisasi bot WhatsApp.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <FileText className="size-3.5 text-[#706c64]" />
                <span>Deskripsi / Bio Toko</span>
              </label>
              <textarea
                rows={2}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-3 rounded-lg bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Card: Tautan Bio & Media Sosial */}
          <div className="flex flex-col gap-5 p-6 sm:p-7 rounded-2xl border border-[#e8e2d9] bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d9]">
              <div>
                <h2 className="text-sm font-bold text-[#141413] tracking-tight flex items-center gap-2">
                  <Link2 className="size-4 text-[#cc785c]" />
                  <span>Tautan Bio & Media Sosial (Link-in-Bio)</span>
                </h2>
                <p className="text-xs text-[#706c64] mt-0.5">
                  Tampilkan tombol tautan eksternal (Instagram, Shopee, TikTok, Website) di bagian atas etalase storefront toko.
                </p>
              </div>
            </div>

            {/* Existing Links List */}
            <div className="flex flex-col gap-2">
              {links.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[#e8e2d9] text-center bg-[#faf8f5]">
                  <p className="text-xs text-[#8c867b]">Belum ada tautan bio tambahan. Tambahkan tautan media sosial toko Anda di bawah.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#e8e2d9] bg-[#faf8f5] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="size-8 rounded-lg bg-white border border-[#e8e2d9] flex items-center justify-center text-[#706c64] shrink-0">
                          <Link2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#141413] truncate">{link.title}</div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#8c867b] hover:text-[#cc785c] flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{link.url}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link.id)}
                        disabled={deletingLinkId === link.id}
                        className="p-2 text-[#8c867b] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus tautan"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Link Inputs */}
            <div className="pt-3 border-t border-[#e8e2d9]">
              <span className="text-xs font-semibold text-[#141413] block mb-2">Tambah Tautan Baru</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-[#706c64] block mb-1">Nama / Label</label>
                  <input
                    type="text"
                    placeholder="Contoh: Instagram Toko"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-[#706c64] block mb-1">URL / Link Web</label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/namatoko"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={isAddingLink || !newLinkTitle.trim() || !newLinkUrl.trim()}
                    className="w-full h-9 px-3 rounded-lg bg-[#141413] text-white hover:bg-black disabled:opacity-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span>{isAddingLink ? 'Menambah...' : 'Tambah'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI WhatsApp Sales Agent (Gemini + Fonnte) */}
          <div className="flex flex-col gap-5 p-6 sm:p-7 rounded-2xl border border-[#e8e2d9] bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d9]">
              <div>
                <h2 className="text-sm font-bold text-[#141413] tracking-tight">
                  AI WhatsApp Sales Agent (Google Gemini)
                </h2>
                <p className="text-xs text-[#706c64] mt-0.5">
                  Asisten pintar otonom yang melayani pemesanan, tanya-jawab stok, dan pembaruan status transaksi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#e8e2d9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#cc785c]"></div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Key className="size-3.5 text-[#706c64]" />
                <span>Fonnte Device Token</span>
              </label>
              <input
                type="password"
                placeholder="Masukkan token dari fonnte.com"
                value={fonnteToken}
                onChange={(e) => setFonnteToken(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-sm font-mono text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
              />
              <span className="text-[11px] text-[#8c867b] mt-1.5 block">
                Dapatkan token perangkat gratis dengan scan WhatsApp toko Anda di dashboard <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-[#cc785c] underline">fonnte.com</a>.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Globe className="size-3.5 text-[#706c64]" />
                <span>Webhook URL Toko (Salin ke Pengaturan Fonnte)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full h-10 px-3.5 rounded-lg bg-[#faf8f5] border border-[#e8e2d9] text-xs font-mono text-[#706c64] select-all"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="h-10 px-3 rounded-lg border border-[#e8e2d9] bg-white hover:bg-[#faf8f5] text-xs font-medium text-[#141413] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <Copy className="size-3.5" />
                  <span>Salin</span>
                </button>
              </div>
              <span className="text-[11px] text-[#8c867b] mt-1.5 block">
                Tempel URL ini pada kolom Webhook URL di pengaturan perangkat Fonnte Anda.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                  <Sliders className="size-3.5 text-[#706c64]" />
                  <span>Model Gemini AI</span>
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs cursor-pointer font-mono"
                >
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Direkomendasikan - Sangat Cepat & Stabil)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Model Flagship Cerdas)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest (Auto Model Terbaru)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                  <CreditCard className="size-3.5 text-[#706c64]" />
                  <span>Panduan Pembayaran & Rekening</span>
                </label>
                <input
                  type="text"
                  placeholder="BCA: 1234567890 a/n Toko | QRIS tersedia"
                  value={aiPaymentInfo}
                  onChange={(e) => setAiPaymentInfo(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-xs sm:text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <Bot className="size-3.5 text-[#706c64]" />
                <span>Persona & Gaya Tutur AI</span>
              </label>
              <input
                type="text"
                placeholder="Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali."
                value={aiPersona}
                onChange={(e) => setAiPersona(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs"
              />
              <span className="text-[11px] text-[#8c867b] mt-1.5 block">
                Atur gaya bahasa percakapan AI saat merespons pelanggan (bahasa Indonesia kasual, formal, atau santun khas Bali).
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#141413] flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="size-3.5 text-[#706c64]" />
                <span>Instruksi Transaksi Khusus AI</span>
              </label>
              <textarea
                rows={3}
                placeholder="Bantu pembeli mengecek ketersediaan produk, jelaskan detail dan varian barang, hitung total pesanan, dan pandu pembayaran transfer atau QRIS."
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="w-full p-3 rounded-lg bg-white border border-[#e8e2d9] text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c] shadow-2xs resize-none"
              />
              <span className="text-[11px] text-[#8c867b] mt-1.5 block">
                Panduan yang wajib dipatuhi AI saat menanggapi pertanyaan stok, rekap pesanan, dan konfirmasi transfer pembeli.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saved ? (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Check className="size-4" />
                <span>Pengaturan berhasil disimpan!</span>
              </span>
            ) : <span />}

            <Button type="submit" disabled={isSaving} className="bg-[#cc785c] hover:bg-[#a9583e] text-white">
              {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}



import React from 'react'
import { Share2, Check, ExternalLink, Bot } from 'lucide-react'
import type { Store, StoreLink } from '@/types'

interface StoreHeaderProps {
  store: Store
  links?: StoreLink[]
}

export function StoreHeader({ store, links }: StoreHeaderProps) {
  const [copied, setCopied] = React.useState(false)

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <header className="flex flex-col items-center text-center pt-8 pb-6 px-4 max-w-lg mx-auto">
      {/* Store Avatar */}
      <div className="relative mb-4 group">
        <div className="size-24 rounded-full overflow-hidden border-2 border-hairline shadow-sm bg-surface-card flex items-center justify-center">
          {store.avatar_url ? (
            <img
              src={store.avatar_url}
              alt={store.name}
              className="size-full object-cover"
            />
          ) : (
            <span className="font-sans text-2xl text-ink font-bold">
              {store.name.charAt(0)}
            </span>
          )}
        </div>
        <button
          onClick={handleShare}
          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-canvas border border-hairline shadow-xs text-muted hover:text-ink transition-colors"
          title="Bagikan Tautan Toko"
        >
          {copied ? <Check className="size-3.5 text-status-success" /> : <Share2 className="size-3.5" />}
        </button>
      </div>

      {/* Store Name & Tagline */}
      <h1 className="font-sans text-2xl sm:text-3xl font-bold text-ink tracking-tight">
        {store.name}
      </h1>
      {store.tagline && (
        <p className="text-sm text-muted mt-2 max-w-sm leading-relaxed">
          {store.tagline}
        </p>
      )}

      {/* Autonomous WhatsApp Support Badge (Non-Dot-Pill, Non-Sparkle) */}
      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#faf4ed] text-[#8c4327] border border-[#cc785c]/25 text-[11px] font-semibold">
        <Bot className="size-3 text-[#cc785c]" />
        <span>Asisten WhatsApp 24/7 Aktif</span>
      </div>

      {/* Link-in-Bio Buttons */}
      {links && links.length > 0 && (
        <div className="w-full mt-5 flex flex-col gap-2 max-w-sm">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-surface-card hover:bg-[#e7dfd2] border border-hairline text-ink text-xs sm:text-sm font-medium transition-all shadow-2xs hover:scale-[1.01]"
            >
              <span className="truncate">{link.title}</span>
              <ExternalLink className="size-3.5 text-muted shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </header>
  )
}

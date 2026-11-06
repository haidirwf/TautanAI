import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  headerAddon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  surface?: 'cream' | 'dark' | 'canvas'
  showHeaderBorder?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  headerAddon,
  children,
  footer,
  maxWidth = 'md',
  surface = 'canvas',
  showHeaderBorder,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const maxWClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth]

  const surfaceClass = {
    canvas: 'bg-white text-[#141413] border-[#e8e2d9]',
    cream: 'bg-white text-[#141413] border-[#e8e2d9]',
    dark: 'bg-[#181715] text-[#faf9f5] border-[#2b2824]',
  }[surface]

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 sm:py-8 overflow-hidden pointer-events-auto">
          {/* Global Full-Viewport Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-0 cursor-pointer"
            onClick={onClose}
          />

          {/* Elevated Floating Modal Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className={cn(
              'relative w-full rounded-2xl border max-h-[85vh] max-h-[85dvh] flex flex-col z-10 overflow-hidden my-auto shadow-[0_25px_65px_-12px_rgba(0,0,0,0.38),0_0_0_1px_rgba(0,0,0,0.06)]',
              'transition-[max-width] duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]',
              surfaceClass,
              maxWClass
            )}
          >
            {/* Header */}
            {title || description ? (
              <div
                className={cn(
                  'flex items-start justify-between p-4 sm:p-5 pb-3.5 sm:pb-4 shrink-0 bg-inherit z-10',
                  showHeaderBorder !== false && 'border-b border-inherit'
                )}
              >
                <div>
                  {title && (
                    <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#141413]">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className={cn('text-xs mt-1', surface === 'dark' ? 'text-[#9bb0d1]' : 'text-muted')}>
                      {description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {headerAddon}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'p-1.5 rounded-full transition-colors cursor-pointer',
                      surface === 'dark'
                        ? 'hover:bg-[#1b2238] text-[#9bb0d1] hover:text-white'
                        : 'hover:bg-surface-card text-muted hover:text-ink'
                    )}
                    aria-label="Tutup"
                  >
                    <X className="size-4" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'p-1.5 rounded-full transition-colors cursor-pointer',
                    surface === 'dark'
                      ? 'hover:bg-[#1b2238] text-[#9bb0d1] hover:text-white'
                      : 'hover:bg-surface-card text-muted hover:text-ink'
                  )}
                  aria-label="Tutup"
                >
                  <X className="size-4" />
                </motion.button>
              </div>
            )}

            {/* Content Body (The single scrollable container) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>

            {/* Pinned Footer (Permanent bottom bar outside scroll container) */}
            {footer && (
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-inherit shrink-0 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-3 z-10">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

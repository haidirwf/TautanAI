import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured, clearAllDumpData } from '@/lib/supabase'

export interface User {
  id: string
  email: string
  name: string
  storeSlug: string
  storeId?: string
  whatsappNumber?: string
  tagline?: string
  isOnboarded?: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (email: string, password?: string, storeSlug?: string) => Promise<{ isOnboarded: boolean }>
  signup: (email: string, password?: string, storeSlug?: string, storeName?: string) => Promise<{ isOnboarded: boolean }>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
  updateUserStore: (store: { id: string; name: string; slug: string; whatsappNumber?: string; tagline?: string }) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      initialize: async () => {
        // If state has leftover dump user from mock testing, purge it immediately
        const currentUser = useAuthStore.getState().user
        if (currentUser?.id?.startsWith('usr-')) {
          clearAllDumpData()
          set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
        }

        if (!isSupabaseConfigured || !supabase) {
          set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
          return
        }

        const client = supabase

        const processUserSession = async (session: any) => {
          if (session?.user) {
            const authUser = session.user
            let store: any = null

            try {
              // Fetch associated store from database
              const { data: existingStore } = await client
                .from('stores')
                .select('id, name, slug, whatsapp_number, tagline, is_onboarded')
                .eq('user_id', authUser.id)
                .maybeSingle()
              store = existingStore

              // Auto-heal: if store record is missing, create it automatically
              if (!store) {
                const fallbackName =
                  authUser.user_metadata?.store_name ||
                  authUser.user_metadata?.full_name ||
                  authUser.user_metadata?.name ||
                  authUser.email?.split('@')[0] ||
                  'Merchant'
                const cleanSlugBase = (
                  authUser.user_metadata?.store_slug ||
                  authUser.email?.split('@')[0] ||
                  'toko'
                )
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '-')
                const fallbackSlug = `${cleanSlugBase}-${authUser.id.replace(/-/g, '').slice(0, 6)}`

                const { data: createdStore } = await client
                  .from('stores')
                  .insert([{
                    user_id: authUser.id,
                    name: fallbackName,
                    slug: fallbackSlug,
                    whatsapp_number: authUser.user_metadata?.whatsapp_number || '',
                    tagline: authUser.user_metadata?.tagline || '',
                    is_onboarded: false,
                  }])
                  .select('id, name, slug, whatsapp_number, tagline, is_onboarded')
                  .maybeSingle()

                if (createdStore) {
                  store = createdStore
                }
              }
            } catch (errStore) {
              console.warn('Store fetch/auto-heal warning during session init', errStore)
            }

            const name =
              store?.name ||
              authUser.user_metadata?.store_name ||
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split('@')[0] ||
              'Merchant'
            const storeSlug = store?.slug || authUser.user_metadata?.store_slug || ''
            const isOnboarded = Boolean(
              store?.is_onboarded ||
              (store?.slug && store?.whatsapp_number && store.whatsapp_number.length >= 8)
            )

            set({
              user: {
                id: authUser.id,
                email: authUser.email || '',
                name,
                storeSlug,
                storeId: store?.id,
                whatsappNumber: store?.whatsapp_number || '',
                tagline: store?.tagline || '',
                isOnboarded,
              },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            })
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
          }
        }

        set({ isLoading: true })
        try {
          const { data: { session }, error } = await client.auth.getSession()
          if (error) {
            console.warn('Error fetching Supabase session', error)
          }
          await processUserSession(session)

          // Listen for ongoing auth state changes (e.g. OAuth callback completion)
          client.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
              await processUserSession(session)
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
            }
          })
        } catch (err) {
          console.warn('Failed to initialize Supabase session', err)
          set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
        }
      },

      login: async (email: string, password?: string, storeSlug = '') => {
        set({ isLoading: true })
        try {
          if (!isSupabaseConfigured || !supabase) {
            throw new Error(
              'Supabase belum terkonfigurasi. Silakan masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada file .env terlebih dahulu.'
            )
          }

          if (!password) {
            throw new Error('Kata sandi wajib diisi untuk masuk.')
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error

          if (data.user) {
            let { data: store } = await supabase
              .from('stores')
              .select('id, name, slug, whatsapp_number, tagline, is_onboarded')
              .eq('user_id', data.user.id)
              .maybeSingle()

            // Auto-heal: if store record is missing, create it automatically
            if (!store) {
              const fallbackName = data.user.user_metadata?.store_name || email.split('@')[0] || 'Merchant'
              const cleanSlugBase = (data.user.user_metadata?.store_slug || storeSlug || email.split('@')[0] || 'toko')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
              const fallbackSlug = `${cleanSlugBase}-${data.user.id.replace(/-/g, '').slice(0, 6)}`

              const { data: createdStore } = await supabase
                .from('stores')
                .insert([{
                  user_id: data.user.id,
                  name: fallbackName,
                  slug: fallbackSlug,
                  whatsapp_number: data.user.user_metadata?.whatsapp_number || '',
                  tagline: data.user.user_metadata?.tagline || '',
                  is_onboarded: false,
                }])
                .select('id, name, slug, whatsapp_number, tagline, is_onboarded')
                .maybeSingle()

              if (createdStore) {
                store = createdStore
              }
            }

            const name = store?.name || data.user.user_metadata?.store_name || email.split('@')[0] || 'Merchant'
            const resolvedSlug = store?.slug || storeSlug || data.user.user_metadata?.store_slug || ''
            const isOnboarded = Boolean(
              store?.is_onboarded ||
              (store?.slug && store?.whatsapp_number && store.whatsapp_number.length >= 8)
            )

            set({
              user: {
                id: data.user.id,
                email: data.user.email || email,
                name,
                storeSlug: resolvedSlug,
                storeId: store?.id,
                whatsappNumber: store?.whatsapp_number || '',
                tagline: store?.tagline || '',
                isOnboarded,
              },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            })

            return { isOnboarded }
          }
          return { isOnboarded: false }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      signup: async (email: string, password?: string, storeSlug = '', storeName = '') => {
        set({ isLoading: true })
        try {
          if (!isSupabaseConfigured || !supabase) {
            throw new Error(
              'Supabase belum terkonfigurasi. Silakan masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada file .env terlebih dahulu.'
            )
          }

          if (!password) {
            throw new Error('Kata sandi wajib diisi.')
          }

          const slugVal = storeSlug || email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '')
          const nameVal = storeName || email.split('@')[0]

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                store_name: nameVal,
                store_slug: slugVal,
              },
            },
          })
          if (error) throw error

          if (data.user) {
            let store = null
            try {
              const res = await supabase
                .from('stores')
                .select('id, name, slug, whatsapp_number, tagline, is_onboarded')
                .eq('user_id', data.user.id)
                .maybeSingle()
              store = res.data
            } catch (e) {
              console.warn('Store fetch error on signup', e)
            }

            set({
              user: {
                id: data.user.id,
                email: data.user.email || email,
                name: store?.name || nameVal,
                storeSlug: store?.slug || slugVal,
                storeId: store?.id,
                whatsappNumber: store?.whatsapp_number || '',
                tagline: store?.tagline || '',
                isOnboarded: false,
              },
              isAuthenticated: Boolean(data.session),
              isLoading: false,
              isInitialized: true,
            })

            return { isOnboarded: false }
          }
          return { isOnboarded: false }
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      loginWithGoogle: async () => {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error(
            'Supabase belum terkonfigurasi. Silakan masukkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada file .env terlebih dahulu.'
          )
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
          },
        })
        if (error) throw error
        if (data?.url) {
          window.location.href = data.url
        }
      },

      updateUserStore: (store) => {
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          useAuthStore.setState({
            user: {
              ...currentUser,
              name: store.name,
              storeSlug: store.slug,
              storeId: store.id,
              whatsappNumber: store.whatsappNumber,
              tagline: store.tagline,
              isOnboarded: true,
            },
          })
        }
      },

      logout: async () => {
        // Immediately reset local state so UI components instantly reflect logged-out status
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        })
        clearAllDumpData()
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.auth.signOut()
          } catch (e) {
            console.warn('Supabase sign out warning', e)
          }
        }
      },
    }),
    {
      name: 'tautan_auth_storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

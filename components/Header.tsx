'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useCart } from '@/contexts/CartContext'
import { useState } from 'react'
import { ShoppingCart, Menu, X, LogOut } from 'lucide-react'

export default function Header() {
  const { data: session } = useSession()
  const { totalItems } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/pieces', label: 'Pièces' },
    { href: '/devis', label: 'Devis' },
  ]

  const user = session?.user as any
  const proLinks = user?.role === 'ADMIN' 
    ? [{ href: '/admin/dashbord', label: 'Admin' }]
    : user?.role === 'PROFESSIONAL'
    ? [{ href: '/espace-pro', label: 'Espace Pro' }]
    : []

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-40 h-16 relative flex items-center justify-start">
              <img src="/logo.png" alt="AUTOP Logo" className="h-full w-auto object-contain" />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {[...navLinks, ...proLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-red-500 font-semibold transition text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-6">
            <Link href="/panier" className="relative p-2 text-slate-300 hover:text-red-500 transition">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {session ? (
              <div className="hidden md:flex items-center space-x-4">
                <Link 
                  href="/mes-devis" 
                  className="text-xs text-slate-300 hover:text-white font-bold bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-red-500/50 px-3 py-1.5 rounded-full uppercase tracking-wider transition flex items-center gap-1.5"
                  title="Accéder à mon Espace Client"
                >
                  <span>👤</span>
                  <span>{user?.name || user?.email?.split('@')[0]}</span>
                </Link>
                <Link href="/mes-devis" className="text-sm text-slate-400 hover:text-red-500 transition font-semibold">
                  Espace Client
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center space-x-1.5 text-slate-400 hover:text-red-500 transition font-semibold border-l border-slate-850 pl-4"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/connexion" className="text-slate-300 hover:text-red-500 font-semibold transition text-sm">
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition text-sm"
                >
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col space-y-3 px-2">
              {[...navLinks, ...proLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-300 hover:text-red-500 font-semibold py-1 transition block text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <div className="text-slate-400 font-bold py-1 px-2 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    👤 Connecté : <span className="text-red-500 font-black">{user?.name || user?.email?.split('@')[0]}</span>
                  </div>
                  <Link 
                    href="/mes-devis" 
                    className="text-slate-300 hover:text-red-500 font-semibold py-2 transition block text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mes Devis
                  </Link>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' })
                      setMobileMenuOpen(false)
                    }}
                    className="text-left text-red-500 font-semibold py-2 transition block text-sm flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/connexion" 
                    className="text-slate-300 hover:text-red-500 font-semibold py-1 transition block text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link 
                    href="/inscription" 
                    className="text-slate-300 hover:text-red-500 font-semibold py-1 transition block text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
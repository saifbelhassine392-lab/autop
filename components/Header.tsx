'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useCart } from '@/contexts/CartContext'
import { useState } from 'react'
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react'

export default function Header() {
  const { data: session } = useSession()
  const { totalItems } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/pieces', label: 'Pièces' },
    { href: '/devis', label: 'Devis' },
  ]

  const proLinks = session?.user?.role === 'admin' 
    ? [{ href: '/admin', label: 'Admin' }]
    : session?.user?.role === 'pro'
    ? [{ href: '/espace-pro', label: 'Espace Pro' }]
    : []

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-red-600">AUTOP</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {[...navLinks, ...proLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-red-600 font-medium transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <Link href="/panier" className="relative p-2 text-gray-700 hover:text-red-600">
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {session ? (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/mes-devis" className="text-sm text-gray-600 hover:text-red-600">
                  Mes Devis
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/connexion" className="text-gray-700 hover:text-red-600 font-medium">
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {[...navLinks, ...proLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-red-600 font-medium px-2 py-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <Link href="/mes-devis" className="text-gray-700 px-2 py-1">Mes Devis</Link>
                  <button
                    onClick={() => signOut()}
                    className="text-left text-red-600 px-2 py-1"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/connexion" className="text-gray-700 px-2 py-1">Connexion</Link>
                  <Link href="/inscription" className="text-gray-700 px-2 py-1">Inscription</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
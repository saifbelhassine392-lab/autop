'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { Search, ShoppingCart, Filter, MessageSquare, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  oldPrice?: number
  images: string[]
  reference: string
  brand: string
  stock: number
  category: { name: string }
  compatible: string[]
}

export default function PiecesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    const res = await fetch('/api/categories')
    if (res.ok) {
      const data = await res.json()
      setCategories(data)
    }
  }

  const fetchProducts = async (params = '') => {
    setLoading(true)
    const res = await fetch(`/api/products?${params}`)
    if (res.ok) {
      const data = await res.json()
      setProducts(data)
    }
    setLoading(false)
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (selectedCategory) params.append('category', selectedCategory)
    fetchProducts(params.toString())
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-100 bg-slate-950/60 backdrop-blur-md min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-red-500 transition mb-6 font-bold text-sm">
        <Home className="w-4 h-4" /> Accueil
      </Link>
      <h1 className="text-3xl font-black mb-8 tracking-tight">Catalogue de Pièces</h1>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une pièce par désignation, référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/60 backdrop-blur-sm border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (e.target.value) params.append('category', e.target.value)
            fetchProducts(params.toString())
          }}
          className="px-4 py-3 bg-slate-900/60 backdrop-blur-sm border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
        >
          <option value="" className="bg-slate-900/60 backdrop-blur-sm/60 backdrop-blur-sm text-slate-100">Toutes les catégories</option>
          {Array.isArray(categories) && categories.map((cat: any) => (
            <option key={cat.id} value={cat.slug} className="bg-slate-900/60 backdrop-blur-sm/60 backdrop-blur-sm text-slate-100">{cat.name}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-200"
        >
          <Filter className="w-5 h-5" />
          Filtrer
        </button>
      </div>

      {/* Grille produits */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-800/40 border border-slate-800 h-80 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.isArray(products) && products.map((product) => (
            <div key={product.id} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden hover:border-red-500/50 transition duration-300 shadow-xl flex flex-col justify-between">
              <div className="relative h-48 bg-slate-950 flex items-center justify-center">
                {product.images && product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    Pas d'image
                  </div>
                )}
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-mono text-slate-400 mb-1">{product.brand || 'Générique'} | {product.reference}</p>
                  <h3 className="font-bold text-slate-100 text-sm mb-3 line-clamp-2">{product.name}</h3>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-400">PRIX SUR DEMANDE</span>
                    <button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('open-chat', {
                            detail: { reference: product.reference, name: product.name }
                          })
                        );
                      }}
                      className="p-1.5 bg-red-650 hover:bg-red-600 text-white rounded-lg transition"
                      title="Demander le prix par Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${product.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {product.stock > 0 ? `${product.stock} disponibles` : 'Rupture de stock'}
                    </span>
                  </div>
                  <button
                    onClick={() => addItem(product.id)}
                    disabled={product.stock <= 0}
                    className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition duration-200"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="text-center py-20 text-slate-500 font-medium">
          Aucune pièce trouvée dans le catalogue
        </div>
      )}
    </div>
  )
}
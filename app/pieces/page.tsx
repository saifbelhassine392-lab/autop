'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { Search, ShoppingCart, Filter, MessageSquare, Home } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  oldPrice?: number
  images?: string | string[]
  imageUrl?: string
  reference: string
  brand: string
  stock: number
  category?: { name: string }
  compatible?: string[]
}

export default function PiecesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchProducts = async (params = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (selectedCategory) params.append('category', selectedCategory)
    fetchProducts(params.toString())
  }

  const getProductImg = (product: any) => {
    if (!product) return null
    if (product.imageUrl) return product.imageUrl
    if (product.image) return product.image
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0]
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
        if (typeof parsed === 'string') return parsed
      } catch {
        if (product.images.startsWith('http') || product.images.startsWith('/')) return product.images
      }
    }
    return null
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
          <option value="" className="bg-slate-900 text-slate-100">Toutes les catégories</option>
          {Array.isArray(categories) && categories.map((cat: any) => (
            <option key={cat.id} value={cat.slug} className="bg-slate-900 text-slate-100">{cat.name}</option>
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

      {/* En-tête de listing B2B ordonné (Visible sur écran moyen et large) */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-xl mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <div className="col-span-1 text-center">Photo</div>
        <div className="col-span-5">Désignation & Référence</div>
        <div className="col-span-2 text-center">Disponibilité</div>
        <div className="col-span-2 text-center">Tarif B2B</div>
        <div className="col-span-2 text-right">Action</div>
      </div>

      {/* Liste ordonnée des produits (Ligne par ligne détaillée) */}
      {loading ? (
        <div className="flex flex-col gap-3 w-full">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-900/60 border border-slate-800 h-24 rounded-xl flex items-center p-4 gap-4 w-full">
              <div className="w-20 h-20 bg-slate-800/80 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800/80 rounded w-1/4" />
                <div className="h-4 bg-slate-800/80 rounded w-1/2" />
              </div>
              <div className="hidden sm:block w-28 h-8 bg-slate-800/80 rounded" />
              <div className="w-32 h-10 bg-slate-800/80 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {Array.isArray(products) && products.map((product: any) => {
            const imgSrc = getProductImg(product)
            return (
              <div
                key={product.id}
                className="w-full bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur-sm border border-slate-800 hover:border-red-500/50 rounded-xl p-3 sm:p-4 transition duration-200 shadow-md flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 items-stretch lg:items-center group"
              >
                {/* 1. Colonne Photo (Gauche, taille fixe 80-96px) */}
                <div className="col-span-1 flex justify-center lg:justify-start">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-center overflow-hidden">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-200"
                        onError={(e: any) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-600 text-[10px] font-medium text-center px-1">
                        Pas d'image
                      </div>
                    )}
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-black px-1 py-0.5 rounded shadow">
                        -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Colonne Détails & Désignation */}
                <div className="col-span-5 flex flex-col justify-center gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-red-400 border border-slate-700/70">
                      {product.reference || 'REF-N/A'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {product.brand || 'GÉNÉRIQUE'}
                    </span>
                    {product.category?.name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight hover:text-red-400 transition" title={product.name}>
                    {product.name}
                  </h3>
                </div>

                {/* 3. Colonne Disponibilité (Stock) */}
                <div className="col-span-2 flex items-center lg:justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    product.stock > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {product.stock > 0 ? `${product.stock} DISPONIBLE${product.stock > 1 ? 'S' : ''}` : 'RUPTURE DE STOCK'}
                  </span>
                </div>

                {/* 4. Colonne Tarif B2B */}
                <div className="col-span-2 flex items-center lg:justify-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
                    {product.price && product.price > 0 ? `${product.price.toFixed(3)} TND` : 'PRIX SUR DEMANDE'}
                  </span>
                  <button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('open-chat', {
                          detail: { reference: product.reference, name: product.name }
                        })
                      )
                    }}
                    className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shrink-0"
                    title="Demander le prix par Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 5. Colonne Action (Ajouter au panier) */}
                <div className="col-span-2 flex items-center justify-end">
                  <button
                    onClick={() => addItem(product.id)}
                    disabled={product.stock <= 0}
                    className="w-full lg:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition duration-200 shrink-0 shadow-md"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
            )
          })}
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
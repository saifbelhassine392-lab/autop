'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Trash2, Plus, Minus, CreditCard, Truck, 
  ShoppingBag, ArrowLeft, CheckCircle, Store, MessageSquare, Home
} from 'lucide-react'
import Image from 'next/image'

export default function PanierPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart, isLoading } = useCart()

  // Form states
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [zipCode, setZipCode] = useState('2035') // default Tunis postcode
  const [country, setCountry] = useState('Tunisie')
  
  const [shippingMethod, setShippingMethod] = useState<'POWER TRANSPORT' | 'PAR PROPRES MOYENS' | 'AU MAGASIN'>('POWER TRANSPORT')
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'BANK_TRANSFER' | 'CARD' | 'PAYPAL'>('CASH_ON_DELIVERY')
  const [customerNote, setCustomerNote] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null)

  // Auto fill some address fields for convenience if pick up in store is selected
  useEffect(() => {
    if (shippingMethod === 'AU MAGASIN') {
      setStreet('COMPTOIR DE DISTRIBUTION AUTOP - CHARGUIA 2')
      setCity('TUNIS')
      setZipCode('2035')
      setCountry('Tunisie')
    } else if (street.includes('COMPTOIR DE DISTRIBUTION')) {
      setStreet('')
      setCity('')
      setZipCode('')
    }
  }, [shippingMethod])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-4 text-center">
        <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 p-8 border border-slate-800 rounded-3xl max-w-md shadow-2xl backdrop-blur-md">
          <ShoppingBag className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3 uppercase tracking-wider text-3d-bold">Connexion Requise</h2>
          <p className="text-slate-400 mb-6 text-xs uppercase tracking-wide">Veuillez vous connecter pour accéder et commander votre panier.</p>
          <Link href="/connexion" className="chrome-gloss inline-block bg-red-650 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/25">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    if (!street.trim() || !city.trim() || !zipCode.trim()) {
      alert('Veuillez remplir les informations de livraison.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            street,
            city,
            zipCode,
            country
          },
          paymentMethod,
          shippingMethod,
          customerNote
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSubmittedOrder(data.data)
        clearCart()
      } else {
        alert(data.error || 'Erreur lors de la validation de la commande.')
      }
    } catch (err) {
      console.error(err)
      alert('Une erreur est survenue lors de la validation de la commande.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate standard shipping cost dynamically in the UI
  const settingsShippingCost = 0
  const actualShippingCost = 0
  const taxAmount = totalPrice * 0.19 // 19% TVA
  const finalTotal = totalPrice + taxAmount

  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white py-12 px-4 flex items-center justify-center">
        <div className="neon-border-glow bg-slate-900/60 backdrop-blur-sm/60 border border-slate-800 rounded-[32px] p-8 text-center shadow-2xl max-w-lg w-full backdrop-blur-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest text-3d-bold">Commande Enregistrée !</h2>
          <p className="text-xs text-slate-400 mb-6 uppercase tracking-wider">
            Votre commande <strong className="text-red-400 font-mono">#{submittedOrder.orderNumber}</strong> a été enregistrée avec succès. Un e-mail de confirmation a été envoyé à votre adresse et au comptoir.
          </p>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 text-left space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-bold uppercase">MODE DE LIVRAISON :</span>
              <span className="text-slate-200 font-black font-mono">{shippingMethod}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-bold uppercase">ADRESSE :</span>
              <span className="text-slate-200 font-black truncate max-w-[200px]">{street}, {city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold uppercase">MONTANT TOTAL PAYÉ :</span>
              <span className="text-green-400 font-black font-mono">{finalTotal.toFixed(3)} TND</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/mes-devis')}
              className="chrome-gloss w-full bg-gradient-to-r from-red-650 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg"
            >
              Suivre mes commandes dans l'espace client
            </button>
            <Link
              href="/pieces"
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Retourner au Catalogue de Pièces
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-4 mb-8">
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-red-500 transition font-bold text-sm">
            <Home className="w-4 h-4" /> Accueil
          </Link>
          <Link href="/pieces" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-red-500 transition font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Retourner au Catalogue
          </Link>
        </div>

        <h1 className="text-3xl font-black tracking-widest text-3d-neon uppercase mb-8">
          VOTRE PANIER D'ACHATS
        </h1>

        {items.length === 0 ? (
          <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 p-12 border border-slate-800 rounded-[28px] text-center backdrop-blur-md shadow-2xl">
            <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-wider text-xs">Votre panier est vide.</p>
            <Link href="/pieces" className="chrome-gloss inline-block bg-red-650 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest mt-6 transition-all shadow-md">
              Explorer les pièces en stock
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: Cart items & Delivery Options */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Items List */}
              <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800 rounded-[28px] p-6 backdrop-blur-md shadow-xl space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">1. LISTE DES ARTICLES ({totalItems})</h3>
                <div className="divide-y divide-slate-800/60">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center justify-between">
                      <div className="relative w-16 h-16 bg-slate-950 rounded-xl overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
                        {item.product.images && item.product.images[0] ? (
                          <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <span className="text-[9px] text-slate-600 font-bold uppercase">AUTOP</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 px-2">
                        <h4 className="text-xs font-black text-white uppercase truncate">{item.product.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{item.product.price.toFixed(2)} TND HT / pièce</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quantity controls */}
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg py-1 px-2">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1 text-slate-450 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono px-2 text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-slate-450 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="text-xs font-black text-slate-200 font-mono w-20 text-right">
                          {(item.product.price * item.quantity).toFixed(2)} TND
                        </span>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition"
                          title="Retirer l'article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery method cards selection */}
              <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800 rounded-[28px] p-6 backdrop-blur-md shadow-xl">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">2. MODE DE LIVRAISON</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'POWER TRANSPORT', label: 'POWER TRANSPORT', desc: 'Livraison transporteur / gratuit', icon: Truck },
                    { id: 'PAR PROPRES MOYENS', label: 'PAR PROPRES MOYENS', desc: 'Livraison par votre transport / gratuit', icon: ShoppingBag },
                    { id: 'AU MAGASIN', label: 'AU MAGASIN', desc: 'Récupération directe à la Charguia 2 / gratuit', icon: Store }
                  ].map((method) => {
                    const Icon = method.icon
                    const isSelected = shippingMethod === method.id
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setShippingMethod(method.id as any)}
                        className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-red-650/15 border-red-500 text-white shadow-lg' 
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2.5 ${isSelected ? 'text-red-500' : 'text-slate-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{method.label}</span>
                        <span className="text-[9px] text-slate-500 mt-1 uppercase leading-tight font-medium">{method.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Right: Checkout Address Form & Summary */}
            <div className="space-y-6">
              
              {/* Shipping Form & Totals */}
              <form onSubmit={handleCheckout} className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800 rounded-[28px] p-6 backdrop-blur-md shadow-xl space-y-5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">3. INFORMATIONS DE COMMANDE</h3>
                
                {/* Address details */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">ADRESSE DE LIVRAISON *</label>
                    <input
                      type="text"
                      placeholder="N° de rue, Avenue, Résidence..."
                      value={street}
                      disabled={shippingMethod === 'AU MAGASIN'}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition font-semibold uppercase disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">VILLE *</label>
                      <input
                        type="text"
                        placeholder="Ex: Tunis, Ariana..."
                        value={city}
                        disabled={shippingMethod === 'AU MAGASIN'}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition font-semibold uppercase disabled:opacity-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">CODE POSTAL *</label>
                      <input
                        type="text"
                        placeholder="Ex: 2035"
                        value={zipCode}
                        disabled={shippingMethod === 'AU MAGASIN'}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition font-mono font-bold disabled:opacity-50"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Mode de paiement */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">MODE DE PAIEMENT *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CASH_ON_DELIVERY', label: 'A LA LIVRAISON' },
                      { id: 'BANK_TRANSFER', label: 'VIREMENT BANCAIRE' }
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-black tracking-wider transition border ${
                          paymentMethod === pm.id
                            ? 'bg-red-650 border-red-500 text-white shadow shadow-red-600/25'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">INSTRUCTIONS PARTICULIÈRES (OPTIONNEL)</label>
                  <textarea
                    placeholder="Ex: Appeler avant livraison..."
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition font-semibold uppercase resize-none"
                  />
                </div>

                {/* Recap Financial details */}
                <div className="border-t border-slate-800/80 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">TOTAL H.T. :</span>
                    <span className="text-slate-200 font-black font-mono">{totalPrice.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase font-mono">FRAIS LIVRAISON ({shippingMethod}) :</span>
                    <span className="text-slate-200 font-black font-mono">
                      GRATUIT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">TVA (19%) :</span>
                    <span className="text-slate-200 font-black font-mono">{taxAmount.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/80 pt-3">
                    <span className="text-slate-400 font-black uppercase text-sm">TOTAL TTC :</span>
                    <span className="text-xl font-black text-green-400 font-mono">{finalTotal.toFixed(3)} TND</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="chrome-gloss w-full bg-gradient-to-r from-red-650 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      TRAITEMENT...
                    </>
                  ) : (
                    'CONFIRMER ET PAYER COMMANDE'
                  )}
                </button>
              </form>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Home, Package } from 'lucide-react';
import Link from 'next/link';

export default function CustomerCatalogue() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(data => setProducts(data));
  }, []);

  const filtered = products.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.reference || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-[#0a0e1a] min-h-screen mt-6">
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-red-500 transition mb-6 font-bold text-sm">
        <Home className="w-4 h-4" /> Accueil
      </Link>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">🗂️ Catalogue Général Articles</h1>
          <p className="text-xs text-slate-400 mt-1">Disponibilités sur Demande</p>
        </div>
        <input type="text" placeholder="Rechercher une pièce..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <div key={product.id} className="bg-[#1e293b]/30 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">{product.reference}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${(product.stock || product.stockQty || 0) > 0 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {(product.stock || product.stockQty || 0) > 0 ? '✓ En Stock' : '⏳ Sur Commande'}
                </span>
              </div>
              
              {/* Image Container with Bing fetch integration */}
              <div className="w-full h-44 bg-slate-950/60 rounded-xl overflow-hidden mb-4 relative flex items-center justify-center border border-slate-800/80">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain p-3 transition-transform duration-300 hover:scale-110"
                    onError={(e: any) => {
                      e.target.src = "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=300&auto=format&fit=crop&q=60";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Package className="w-12 h-12 stroke-[1.5] mb-2 animate-pulse text-red-500/60" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recherche photo...</span>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-200 mb-4">{product.name}</h3>
            </div>
            <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Prix de vente</span>
                <span className="text-sm font-bold text-red-500">{product.price > 0 ? `${product.price.toFixed(3)} TND` : "Prix sur demande"}</span>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-chat', {
                      detail: { reference: product.reference, name: product.name }
                    })
                  );
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl transition flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                title="Demander le prix par Chat"
              >
                <MessageSquare className="w-3.5 h-3.5" /> CHAT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
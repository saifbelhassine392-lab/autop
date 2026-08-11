'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Home, Package, Search } from 'lucide-react';
import Link from 'next/link';

export default function CustomerCatalogue() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      if (typeof base64 !== 'string') return;

      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: product.reference,
            images: [base64]
          })
        });

        if (res.ok) {
          alert('Photo mise à jour avec succès');
          fetchProducts();
        } else {
          alert('Erreur lors de la mise à jour de la photo');
        }
      } catch (err) {
        console.error(err);
        alert('Erreur réseau lors de l\'upload');
      }
    };
    reader.readAsDataURL(file);
  };

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
          <p className="text-xs text-slate-400 mt-1">Disponibilités & Tarifs en Temps Réel</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Rechercher une pièce, référence..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-red-500 transition" 
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1e293b]/20 border border-slate-800/80 rounded-2xl p-5 animate-pulse h-80 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="w-20 h-4 bg-slate-800 rounded"></div>
                  <div className="w-16 h-4 bg-slate-800 rounded"></div>
                </div>
                <div className="w-full h-40 bg-slate-800/50 rounded-xl mb-4"></div>
                <div className="w-3/4 h-4 bg-slate-800 rounded mb-2"></div>
              </div>
              <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                <div className="w-24 h-4 bg-slate-800 rounded"></div>
                <div className="w-16 h-7 bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/60 rounded-2xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-slate-300 font-bold text-sm mb-1">Aucun article trouvé pour cette recherche</h3>
          <p className="text-xs text-slate-500">Essayez avec une autre référence ou consultez notre robot B2B.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="bg-[#1e293b]/30 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-bold">{product.reference}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${(product.stock || product.stockQty || 0) > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {(product.stock || product.stockQty || 0) > 0 ? '✓ En Stock' : '⏳ Sur Commande'}
                  </span>
                </div>
                
                {/* Image Container */}
                <div className="w-full h-44 bg-slate-950/60 rounded-xl mb-4 relative flex items-center justify-center border border-slate-800/80 group overflow-hidden">
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
                      <Package className="w-12 h-12 stroke-[1.5] mb-2 text-red-500/60" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Photo Pièce</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                    <span className="text-white text-xs font-bold px-3 py-1.5 bg-red-600 rounded-lg shadow-lg">Changer Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, product)} />
                  </label>
                </div>

                <h3 className="text-sm font-bold text-slate-200 mb-4 line-clamp-2">{product.name}</h3>
              </div>
              <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Prix Unitaire</span>
                  <span className="text-sm font-bold text-red-400 font-mono">{product.price > 0 ? `${product.price.toFixed(3)} TND` : "Prix sur demande"}</span>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('open-chat', {
                        detail: { reference: product.reference, name: product.name }
                      })
                    );
                  }}
                  className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl transition flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95"
                  title="Demander le prix par Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> CHAT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Home, Package, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import ModalFicheArticle from '@/components/ModalFicheArticle';

export default function CustomerCatalogue() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
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

  const getProductImg = (product: any) => {
    if (!product) return null;
    if (product.imageUrl) return product.imageUrl;
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        if (typeof parsed === 'string') return parsed;
      } catch {
        if (product.images.startsWith('http') || product.images.startsWith('/')) return product.images;
      }
    }
    return null;
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.reference || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-red-650 flex items-center justify-center font-black text-white text-lg tracking-tighter shadow-lg shadow-red-650/30 group-hover:scale-105 transition-transform">
                A
              </div>
              <span className="font-black text-lg tracking-wider text-white uppercase">AUTOP<span className="text-red-500">.</span></span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>/</span>
              <span className="uppercase tracking-widest text-slate-200">Catalogue Pièces & Tarifs</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/admin/login" 
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Administration</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Title & Search bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-red-500" />
              Catalogue des Pièces
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Consultez nos pièces détachées en stock et demandez un devis immédiat
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par réf ou nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition"
            />
          </div>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Chargement des pièces...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 border border-slate-800/60 rounded-2xl">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-bold uppercase">Aucune pièce trouvée</p>
            <p className="text-slate-500 text-xs mt-1">Essayez un autre mot-clé ou réinitialisez votre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const imgSrc = getProductImg(product);
              return (
                <div 
                  key={product.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition shadow-lg group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span 
                        onClick={() => setSelectedProduct(product)}
                        className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-bold cursor-pointer hover:text-white"
                      >
                        {product.reference}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${(product.stock || product.stockQty || 0) > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {(product.stock || product.stockQty || 0) > 0 ? '✓ En Stock' : '⏳ Sur Commande'}
                      </span>
                    </div>
                    
                    <div 
                      onClick={() => setSelectedProduct(product)}
                      className="w-full h-44 bg-slate-950/60 rounded-xl mb-4 relative flex items-center justify-center border border-slate-800/80 group overflow-hidden cursor-pointer"
                      title="Cliquer pour voir la fiche article et la photo"
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Package className="w-12 h-12 stroke-[1.5] mb-2 text-red-500/60" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Photo Pièce</span>
                        </div>
                      )}
                    </div>

                    <h3 
                      onClick={() => setSelectedProduct(product)}
                      className="text-sm font-bold text-slate-200 mb-4 line-clamp-2 cursor-pointer hover:text-red-400 transition-colors"
                    >
                      {product.name}
                    </h3>
                  </div>
                  <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center gap-2">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Prix Unitaire</span>
                      <span className="text-sm font-bold text-red-400 font-mono">{product.price > 0 ? `${product.price.toFixed(3)} TND` : "Prix sur demande"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                        title="Voir la fiche détaillée"
                      >
                        <Eye className="w-3.5 h-3.5" /> Fiche
                      </button>
                      <button
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent('open-chat', {
                              detail: { reference: product.reference, name: product.name }
                            })
                          );
                        }}
                        className="px-3 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl transition flex items-center gap-1 text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95"
                        title="Demander le prix par Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> CHAT
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modale Fiche Article Complète */}
      {selectedProduct && (
        <ModalFicheArticle
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
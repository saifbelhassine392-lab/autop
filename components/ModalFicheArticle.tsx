"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  X, Check, ShoppingCart, FileText, Copy, Printer, 
  Car, Package, ShieldCheck, Tag, Sparkles, ExternalLink, Image as ImageIcon 
} from 'lucide-react';

interface ModalFicheArticleProps {
  product: any | null;
  onClose: () => void;
  onAddToCart?: (product: any) => void;
  isAdmin?: boolean;
}

export default function ModalFicheArticle({
  product,
  onClose,
  onAddToCart,
  isAdmin = false
}: ModalFicheArticleProps) {
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);

  if (!product) return null;

  // Extraction propre de l'image
  const getDisplayImage = () => {
    if (product.imageUrl) return product.imageUrl;
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
      const img = product.images[0];
      if (!img.includes('/images/categories/')) return img;
    }
    if (typeof product.images === 'string' && product.images.trim() && product.images !== '[]') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
          if (!parsed[0].includes('/images/categories/')) return parsed[0];
        }
      } catch {
        if (!product.images.includes('/images/categories/')) return product.images;
      }
    }
    return null;
  };

  const imageSrc = getDisplayImage();
  const hasRealPhoto = Boolean(imageSrc);

  const handleCopyRef = () => {
    if (product.reference) {
      navigator.clipboard.writeText(product.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCartClick = () => {
    if (onAddToCart) {
      onAddToCart(product);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Traitement des véhicules compatibles sous forme de liste
  const vehiclesList = product.vehicleCompat
    ? product.vehicleCompat.split(/[,/|;\n]+/).map((v: string) => v.trim()).filter(Boolean)
    : [];

  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const costPrice = typeof product.costPrice === 'number' ? product.costPrice : parseFloat(product.costPrice) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-950 border border-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-mono font-black text-xs rounded-lg uppercase tracking-wider">
              FICHE ARTICLE
            </span>
            <span className="text-slate-400 text-xs font-bold font-mono">
              RÉF : {product.reference || product.sku}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Imprimer la fiche"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps Modale */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche : Photo Grande */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div 
                className="relative w-full aspect-square bg-white rounded-2xl p-4 border border-slate-800 flex items-center justify-center overflow-hidden cursor-zoom-in group shadow-inner"
                onClick={() => hasRealPhoto && setImageZoom(!imageZoom)}
              >
                {hasRealPhoto ? (
                  <img
                    src={imageSrc!}
                    alt={product.name || product.reference}
                    className={`w-full h-full object-contain transition-transform duration-300 ${
                      imageZoom ? 'scale-150' : 'group-hover:scale-105'
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                    <ImageIcon className="w-16 h-16 mb-2 text-zinc-300 opacity-60" />
                    <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">Photo Non Fournie</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Conforme aux spécifications constructeur</span>
                  </div>
                )}

                {/* Badge statut photo */}
                <div className="absolute top-2.5 left-2.5">
                  {hasRealPhoto ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/90 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow">
                      <ShieldCheck className="w-3 h-3" /> Photo Référence
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Illustration standard
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton copier référence */}
              <button
                onClick={handleCopyRef}
                className="mt-3 w-full py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Référence copiée !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copier la référence ({product.reference})</span>
                  </>
                )}
              </button>
            </div>

            {/* Colonne Droite : Données Article */}
            <div className="md:col-span-7 space-y-4">
              <div>
                {product.brand && (
                  <span className="inline-block px-2.5 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider mb-2">
                    {product.brand}
                  </span>
                )}
                <h2 className="text-xl font-black text-white uppercase tracking-wide leading-tight">
                  {product.name}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-1 uppercase">
                  RÉF OEM / FABRICANT : <strong className="text-white">{product.reference || product.sku}</strong>
                </p>
              </div>

              {/* Bloc Prix & Disponibilité */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    PRIX DE VENTE
                  </span>
                  <div className="text-2xl font-black text-green-400 font-mono">
                    {price > 0 ? `${price.toFixed(3)} TND` : 'Sur Devis'}
                  </div>
                  {price > 0 && (
                    <span className="text-[10px] text-slate-400 uppercase">
                      Soit {(price / 1.19).toFixed(3)} TND H.T. (TVA 19%)
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                    product.stock > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {product.stock > 0 ? `En Stock (${product.stock} dispo)` : 'Sur Commande'}
                  </span>

                  {isAdmin && costPrice > 0 && (
                    <div className="text-[11px] font-mono text-red-400 mt-2">
                      Prix Revient : <strong>{costPrice.toFixed(3)} TND</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Véhicules compatibles */}
              {vehiclesList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-red-500" /> AFFECTATIONS VÉHICULES COMPATIBLES
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-900/40 rounded-xl border border-slate-850">
                    {vehiclesList.map((v: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-[11px] font-bold uppercase tracking-wide border border-slate-700"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description supplémentaire */}
              {product.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    CARACTÉRISTIQUES TECHNIQUES
                  </span>
                  <p className="text-xs text-slate-300 bg-slate-900/30 p-3 rounded-xl border border-slate-850 whitespace-pre-line uppercase">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-850 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-slate-800 transition"
          >
            Fermer
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onAddToCart && (
              <button
                onClick={handleCartClick}
                disabled={addedToCart}
                className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow ${
                  addedToCart
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Article Ajouté !</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    <span>Ajouter au Panier</span>
                  </>
                )}
              </button>
            )}

            <Link
              href={`/devis?ref=${encodeURIComponent(product.reference || '')}&name=${encodeURIComponent(product.name || '')}`}
              className="flex-1 sm:flex-none px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/25"
            >
              <FileText className="w-4 h-4" />
              <span>Demander Devis</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

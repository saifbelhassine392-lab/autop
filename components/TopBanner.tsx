'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

export default function TopBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  // Do not show on admin panel or if dismissed by user
  if (dismissed || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div style={{ width: '100%', zIndex: 99999, position: 'sticky', top: 0 }} className="bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 justify-center sm:justify-start">
          <strong className="font-black uppercase tracking-wider text-xs sm:text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
            PROMO B2B EXCLUSIVE :
          </strong>
          <span className="text-xs sm:text-sm font-semibold normal-case">
            Jusqu'à -30% sur les commandes de pièces de carrosserie en gros ce mois-ci.
          </span>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <a 
            href="/devis" 
            className="bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
          >
            Demander un devis
          </a>
          
          <button
            onClick={() => setDismissed(true)}
            title="Masquer la bannière"
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

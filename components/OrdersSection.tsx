"use client";

import { orders } from '@/lib/data';
import { Package, ArrowRight } from 'lucide-react';

export default function OrdersSection() {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 mb-8 md:mb-10 shadow-xl shadow-black/25">
      <div className="flex items-center gap-2 md:gap-2.5 text-sm md:text-base font-black text-blue-400 mb-5 uppercase tracking-wider">
        <Package size={18} /> MES COMMANDES
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center shadow-inner">
          <div className="text-2xl md:text-3xl font-black text-orange-400 mb-1 font-mono">3</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">DEMANDES EN COURS</div>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center shadow-inner">
          <div className="text-2xl md:text-3xl font-black text-blue-400 mb-1 font-mono">5</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">COMMANDES</div>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center shadow-inner">
          <div className="text-2xl md:text-3xl font-black text-emerald-400 mb-1 font-mono">2</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">EN LIVRAISON</div>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center shadow-inner">
          <div className="text-2xl md:text-3xl font-black text-purple-400 mb-1 font-mono">8</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">LIVRÉES</div>
        </div>
      </div>

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-slate-950/70 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border border-slate-800 border-l-4 border-l-orange-500 hover:border-slate-700 transition-all shadow-sm">
            <div>
              <h4 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-tight mb-1">{order.title}</h4>
              <div className="text-[11px] text-slate-400 font-medium">{order.vehicle} · <span className="font-mono text-slate-500">{order.date}</span></div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-400 flex-wrap">
              {order.timeline.map((step, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={step.active ? 'text-blue-400 font-bold' : 'text-slate-500'}>{step.label}</span>
                  {i < order.timeline.length - 1 && <ArrowRight size={12} className="text-slate-600" />}
                </span>
              ))}
            </div>
            <span className={`${order.statusColor || 'bg-blue-600'} text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm`}>
              {order.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

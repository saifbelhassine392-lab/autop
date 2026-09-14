import Link from 'next/link'
import { Mail, Phone, Globe, ShieldCheck, Truck, Zap, Award, CheckCircle2, Clock } from 'lucide-react'
import { HomeSlider } from '@/components/HomeSlider'

export default function AccueilPage() {
  return (
    <div className="text-white min-h-screen">
      
      <HomeSlider />
      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 space-y-24">
        
        {/* Grid of Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, title: "Qualité OEM", desc: "Pièces neuves d'origine certifiées et de qualité première monte." },
            { icon: Truck, title: "Livraison rapide", desc: "Service de livraison réactif sur toute la Tunisie." },
            { icon: Zap, title: "Stock immédiat", desc: "Grand inventaire disponible immédiatement pour commande en ligne." },
            { icon: Award, title: "Multimarques", desc: "Pièces pour toutes les marques européennes et asiatiques." }
          ].map((feat, idx) => (
            <div key={idx} className="tilt-card-3d bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-lg hover:bg-slate-900/50 shadow-xl flex flex-col items-start">
              <div className="w-12 h-12 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-4 shadow">
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black mb-2 tracking-wider">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold normal-case">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Corporate Info Section */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-[40px] p-8 md:p-12 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Glow Accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-4 tracking-wider">VENTE DE PIÈCES AUTO EN LIGNE</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-8">
                COMMANDE EN LIGNE & LIVRAISON PARTOUT EN TUNISIE
              </p>

              <div className="space-y-6">
                {/* Vente en ligne */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-red-500 shrink-0 shadow-inner">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">VENTE EN LIGNE</h4>
                    <p className="text-sm font-semibold mt-1 normal-case text-slate-300">Plateforme 100% en ligne — Livraison rapide et sécurisée dans toute la Tunisie</p>
                  </div>
                </div>

                {/* Téléphone */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-red-500 shrink-0 shadow-inner">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">TÉLÉPHONE</h4>
                    <p className="text-sm font-semibold mt-1">
                      <a href="tel:+21695576525" className="font-mono text-slate-300 hover:text-red-400 transition">+216 95 576 525</a>
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-red-500 shrink-0 shadow-inner">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">EMAIL</h4>
                    <a 
                      href="mailto:saif.belhssin@gmail.com" 
                      className="text-sm font-semibold mt-1 text-red-400 hover:text-red-300 transition block lowercase"
                    >
                      saif.belhssin@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Online Service Card */}
            <div className="border border-slate-800 bg-slate-950/80 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
                <div className="w-10 h-10 rounded-xl border border-slate-800 bg-red-600/10 flex items-center justify-center text-red-500">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">COMMANDES & EXPÉDITIONS</h3>
                  <p className="text-[10px] text-slate-400 font-mono">SERVICE CLIENT RÉACTIF 7J/7</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Livraison express à domicile ou garage sous <strong>24h à 48h</strong>.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Paiement à la livraison après vérification de votre colis.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pièces certifiées d'origine avec garantie fabricant.</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Traitement immédiat de vos demandes de devis et commandes.</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/devis"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                  Demander un devis en ligne
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
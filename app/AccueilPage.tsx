"use client"
import Link from 'next/link'
import { MapPin, Phone, Mail, User } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function AccueilPage() {
  const { data: session } = useSession();

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Container taking full screen. Image will stretch to fill it, 
          eliminating black bars and perfectly aligning the percentage-based overlays! */}
      <div className="relative w-full h-full @container">
        {/* 8K Pro Enhance Filter: Contrast and Saturation */}
        <img 
          src="/bg-accueil.jpg" 
          alt="AUTOP Store" 
          className="w-full h-full object-fill block contrast-110 saturate-110 brightness-105 drop-shadow-2xl" 
        />

        {/* OVERLAYS TO COVER AI GIBBERISH WITH REAL DATA */}
        
        {/* MOBILE VIEW FOR MONITORS (Stacked, Mobile-First) */}
        <div className="md:hidden absolute inset-0 flex flex-col justify-end pb-8 px-4 z-20 pointer-events-none overflow-y-auto">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md text-slate-900 flex flex-col justify-center items-center text-center p-6 rounded-2xl shadow-2xl border border-white/50 mb-4 w-full mt-auto">
            <h3 className="text-3xl font-black mb-1 text-slate-800 tracking-wider">TUNIS</h3>
            <p className="font-bold text-red-600 mb-3 text-sm tracking-widest">COMPTOIR DE DISTRIBUTION</p>
            <div className="bg-red-100 p-3 rounded-full mb-2 shadow-inner">
              <MapPin className="text-red-600 animate-bounce w-8 h-8" />
            </div>
            <p className="font-bold mt-2 text-slate-500 uppercase text-xs tracking-wider">Ouvert pour les pros</p>
          </div>
          
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md text-slate-900 flex flex-col justify-center p-6 rounded-2xl shadow-2xl border border-white/50 w-full mb-12">
            <h3 className="font-black mb-4 text-center text-red-600 uppercase tracking-widest border-b-2 border-slate-200 pb-3 text-lg">
              COORDONNÉES
            </h3>
            <div className="flex flex-col gap-4 font-bold text-slate-800 mt-2 text-sm">
              <p className="flex items-center gap-4 hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition"><Phone className="w-5 h-5" /></span>
                <span>+216 98 774 525</span>
              </p>
              <p className="flex items-center gap-4 hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition"><Phone className="w-5 h-5" /></span>
                <span>+216 98 171 411</span>
              </p>
              <a href="mailto:comptoir.distribution@autop.tn" className="flex items-center gap-4 hover:text-red-600 transition group break-all">
                <span className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition"><Mail className="shrink-0 w-5 h-5" /></span>
                <span>distribution@autop.tn</span>
              </a>
              <p className="flex items-center gap-4 hover:text-red-600 transition group leading-tight">
                <span className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition"><MapPin className="shrink-0 w-5 h-5" /></span>
                <span>19 Rue de l'Usine, Z.I. Charguia 2</span>
              </p>
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW FOR MONITORS (3D Perspective) */}
        <div className="hidden md:block">
          {/* Left Monitor (Location) */}
          <div 
            className="absolute bg-white/90 backdrop-blur-md text-slate-900 flex flex-col justify-center items-center text-center p-[2%] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/50"
            style={{ 
              top: '50.5%', left: '4.5%', width: '19.5%', height: '14.5%',
              transform: 'perspective(800px) rotateY(8deg) rotateX(2deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            <h3 className="text-[1.5cqw] md:text-xl font-black mb-[1%] text-slate-800 tracking-widest drop-shadow-sm" style={{ fontSize: '1.4cqw' }}>TUNIS</h3>
            <p className="font-black text-red-600 mb-[4%] tracking-widest" style={{ fontSize: '0.75cqw' }}>COMPTOIR DE DISTRIBUTION</p>
            <div className="bg-red-50 p-[3%] rounded-full mb-[3%] shadow-inner flex items-center justify-center">
              <MapPin className="text-red-600 animate-bounce" style={{ width: '2cqw', height: '2cqw' }} />
            </div>
            <p className="font-bold mt-[2%] text-slate-500 uppercase tracking-widest" style={{ fontSize: '0.65cqw' }}>Ouvert pour les pros</p>
          </div>

          {/* Right Monitor (Contact Coordinates) */}
          <div 
            className="absolute bg-white/90 backdrop-blur-md text-slate-900 flex flex-col justify-center p-[2%] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/50"
            style={{ 
              top: '52.5%', left: '76%', width: '19.5%', height: '14.5%',
              transform: 'perspective(800px) rotateY(-8deg) rotateX(2deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            <h3 className="font-black mb-[4%] text-center text-red-600 uppercase tracking-widest border-b-2 border-slate-200 pb-[2%]" style={{ fontSize: '0.9cqw' }}>
              COORDONNÉES
            </h3>
            <div className="flex flex-col gap-[6%] font-bold text-slate-700 mt-[2%]" style={{ fontSize: '0.75cqw' }}>
              <p className="flex items-center gap-[5%] hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-[2%] rounded-lg group-hover:bg-red-600 group-hover:text-white transition flex items-center justify-center"><Phone style={{ width: '0.9cqw', height: '0.9cqw' }} /></span>
                <span>+216 98 774 525</span>
              </p>
              <p className="flex items-center gap-[5%] hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-[2%] rounded-lg group-hover:bg-red-600 group-hover:text-white transition flex items-center justify-center"><Phone style={{ width: '0.9cqw', height: '0.9cqw' }} /></span>
                <span>+216 98 171 411</span>
              </p>
              <a href="mailto:comptoir.distribution@autop.tn" className="flex items-center gap-[5%] hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-[2%] rounded-lg group-hover:bg-red-600 group-hover:text-white transition flex items-center justify-center"><Mail style={{ width: '0.9cqw', height: '0.9cqw' }} /></span>
                <span>distribution@autop.tn</span>
              </a>
              <p className="flex items-center gap-[5%] leading-tight hover:text-red-600 transition group">
                <span className="bg-red-50 text-red-600 p-[2%] rounded-lg group-hover:bg-red-600 group-hover:text-white transition flex items-center justify-center"><MapPin style={{ width: '0.9cqw', height: '0.9cqw' }} /></span> 
                <span>19 Rue de l'Usine, Z.I. Charguia 2</span>
              </p>
            </div>
          </div>
        </div>

        {/* INTERACTIVE LINK OVERLAYS OVER THE IMAGE'S BUTTONS */}

        {/* Top Navigation Links in the Image */}
        <Link 
          href="/" 
          className="absolute hover:bg-white/20 transition rounded-md"
          style={{ top: '6%', left: '22%', width: '9%', height: '5%' }}
          title="Accueil"
        />
        <Link 
          href="/pieces" 
          className="absolute hover:bg-white/20 transition rounded-md"
          style={{ top: '6%', left: '33%', width: '9%', height: '5%' }}
          title="Pièces"
        />
        <Link 
          href="/devis" 
          className="absolute hover:bg-white/20 transition rounded-md"
          style={{ top: '6%', left: '44%', width: '9%', height: '5%' }}
          title="Devis"
        />
        
        {session?.user ? (
          <div 
            className="absolute bg-white/10 backdrop-blur-md rounded-xl flex items-center px-[2%] gap-[5%] shadow-xl border border-white/20 hover:bg-white/20 transition"
            style={{ top: '5%', left: '55%', width: '23%', height: '7%' }}
          >
            <div className="w-[15%] aspect-square bg-red-600 rounded-full flex items-center justify-center text-white font-black" style={{ fontSize: '1.2cqw' }}>
              {session.user.name?.[0]?.toUpperCase() || <User className="w-1/2 h-1/2" />}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-white font-bold truncate tracking-wider" style={{ fontSize: '0.9cqw' }}>{session.user.name}</span>
              <span className="text-red-400 font-black uppercase tracking-widest" style={{ fontSize: '0.6cqw' }}>En Ligne</span>
            </div>
            <Link href="/mes-devis" className="bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transition flex items-center justify-center" style={{ fontSize: '0.7cqw', padding: '3% 6%' }}>
              Espace
            </Link>
          </div>
        ) : (
          <>
            <Link 
              href="/connexion" 
              className="absolute hover:bg-white/20 transition rounded-md"
              style={{ top: '6%', left: '55%', width: '11%', height: '5%' }}
              title="Connexion"
            />
            <Link 
              href="/inscription" 
              className="absolute hover:bg-white/20 transition rounded-md"
              style={{ top: '6%', left: '67%', width: '11%', height: '5%' }}
              title="S'inscrire"
            />
          </>
        )}

        {/* The big bottom sign (SERVICE-OPTIONS) */}
        <div 
          className="absolute bg-transparent flex flex-col justify-end items-center pb-[2%]"
          style={{ top: '70%', left: '34.5%', width: '31%', height: '22%' }}
        >
          <Link 
            href="/pieces" 
            className="w-[80%] h-[35%] hover:bg-white/10 mb-[2%] transition rounded-xl flex items-center justify-center cursor-pointer"
            title="Consulter le catalogue"
          />
          <Link 
            href="/pieces" 
            className="w-[80%] h-[35%] hover:bg-white/10 transition rounded-xl flex items-center justify-center cursor-pointer"
            title="Voir toutes les marques"
          />
        </div>

        {/* Hidden SEO text for search engines since the content is mostly an image */}
        <div className="sr-only">
          <h1>AUTOP - VOTRE PARTENAIRE PIÈCES AUTO</h1>
          <p>Comptoir de distribution mécanique et carrosserie. Automotive Premium.</p>
          <p>Adresse: 19 Rue de l'Usine, Z.I. Ariana Aéroport, 1080 Tunis Cedex (Charguia 2).</p>
          <p>Téléphone: +216 98 774 525 / +216 98 171 411. Email: comptoir.distribution@autop.tn</p>
        </div>
      </div>
    </div>
  )
}
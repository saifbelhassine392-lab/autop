import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'

export default function AccueilPage() {
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

        {/* OVERLAYS TO COVER AI GIBBERISH WITH REAL DATA - WITH 3D PERSPECTIVE */}
        
        {/* Left Monitor (Location) */}
        <div 
          className="absolute bg-[#e8e9eb] text-slate-900 flex flex-col justify-center items-center text-center p-[2%] rounded-md shadow-2xl border-4 border-slate-900"
          style={{ 
            top: '50.5%', left: '4.5%', width: '19.5%', height: '14.5%',
            transform: 'perspective(800px) rotateY(8deg) rotateX(2deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <h3 className="text-[1.5cqw] md:text-xl font-black mb-[1%] text-slate-800 tracking-wider" style={{ fontSize: '1.2cqw' }}>TUNIS</h3>
          <p className="font-bold text-red-600 mb-[2%]" style={{ fontSize: '0.8cqw' }}>COMPTOIR DE DISTRIBUTION</p>
          <MapPin className="text-red-600 animate-bounce" style={{ width: '2cqw', height: '2cqw' }} />
          <p className="font-bold mt-[2%] text-slate-500 uppercase" style={{ fontSize: '0.6cqw' }}>Ouvert pour les pros</p>
        </div>

        {/* Right Monitor (Contact Coordinates) */}
        <div 
          className="absolute bg-[#e8e9eb] text-slate-900 flex flex-col justify-center p-[2%] rounded-md shadow-2xl border-4 border-slate-900"
          style={{ 
            top: '52.5%', left: '76%', width: '19.5%', height: '14.5%',
            transform: 'perspective(800px) rotateY(-8deg) rotateX(2deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <h3 className="font-black mb-[2%] text-center text-red-600 uppercase tracking-widest border-b-2 border-slate-300 pb-[1%]" style={{ fontSize: '0.85cqw' }}>
            COORDONNÉES
          </h3>
          <div className="flex flex-col gap-[3%] font-bold text-slate-800 mt-[1%]" style={{ fontSize: '0.7cqw' }}>
            <p className="flex items-center gap-[4%] hover:text-red-600 transition">
              <Phone className="text-red-600" style={{ width: '1cqw', height: '1cqw' }} /> +216 98 774 525
            </p>
            <p className="flex items-center gap-[4%] hover:text-red-600 transition">
              <Phone className="text-red-600" style={{ width: '1cqw', height: '1cqw' }} /> +216 98 171 411
            </p>
            <a href="mailto:comptoir.distribution@autop.tn" className="flex items-center gap-[4%] hover:text-red-600 transition">
              <Mail className="text-red-600" style={{ width: '1cqw', height: '1cqw' }} /> distribution@autop.tn
            </a>
            <p className="flex items-start gap-[4%] mt-[1%] leading-tight hover:text-red-600 transition">
              <MapPin className="text-red-600 shrink-0 mt-0.5" style={{ width: '1cqw', height: '1cqw' }} /> 
              <span>19 Rue de l'Usine, Z.I. Charguia 2</span>
            </p>
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
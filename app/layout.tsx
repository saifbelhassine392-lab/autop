import type { Metadata } from "next";
import Providers from "./Providers";
import ClientChatWidget from "@/components/ClientChatWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUTOP Tunisie — Gestion de Stock & Devis",
  description: "Plateforme intégrée : Espace Client, Catalogue et Administration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-[#0a0e1a] text-slate-100 antialiased">
        <Providers>
          {/* Top Alert Banner */}
          <div style={{ width: '100%', zIndex: 99999, position: 'sticky', top: 0 }} className="bg-red-600 text-white shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <strong className="font-black uppercase tracking-wider text-sm">PROMO B2B EXCLUSIVE :</strong>
                <span className="ml-2 text-sm font-medium normal-case">Jusqu'à -30% sur les commandes de pièces de carrosserie en gros ce mois-ci.</span>
              </div>
              <a href="/devis" className="btn-banner-action shrink-0 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-xl">
                Demander un devis
              </a>
            </div>
          </div>
          {children}
          <ClientChatWidget />
        </Providers>
      </body>
    </html>
  );
}
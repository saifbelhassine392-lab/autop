import type { Metadata } from "next";
import Providers from "./Providers";
import ClientChatWidget from "@/components/ClientChatWidget";
import TopBanner from "@/components/TopBanner";
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
          <TopBanner />
          {children}
          <ClientChatWidget />
        </Providers>
      </body>
    </html>
  );
}
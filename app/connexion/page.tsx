"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Utilisation de signIn de NextAuth
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // On gère la redirection nous-mêmes
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const { data: user } = await meRes.json();
          if (user?.role === "ADMIN") {
            router.push("/admin/dashbord");
          } else if (user?.role === "PROFESSIONAL") {
            router.push("/espace-pro");
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/");
      }
      router.refresh(); // Rafraîchit l'état de la session
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-12 text-slate-100 overflow-hidden">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/bg_hero.png" 
          alt="AUTOP background" 
          className="w-full h-full object-cover opacity-20 object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-slate-900/60 backdrop-blur-sm/60 border border-slate-800/80 rounded-3xl p-4 shadow-2xl backdrop-blur-md max-w-xs items-center justify-center mb-4">
            <img src="/logo.png" alt="AUTOP Logo" className="max-h-16 w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-black tracking-wider text-white">Connexion</h2>
          <p className="mt-2 text-sm text-slate-400 normal-case">
            Ou{" "}
            <Link href="/inscription" className="font-semibold text-red-500 hover:text-red-400">
              créez un compte gratuitement
            </Link>
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/60 backdrop-blur-sm/30 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center normal-case">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Adresse email</label>
              <input
                type="email"
                placeholder="Ex: contact@autop.tn"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 backdrop-blur-md px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 backdrop-blur-md px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-700 transition duration-300 shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
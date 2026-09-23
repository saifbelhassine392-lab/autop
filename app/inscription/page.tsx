"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InscriptionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Tous les champs sont obligatoires.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription.");
      }

      // Redirection vers la page de connexion après succès
      router.push("/connexion?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-black tracking-wider text-white">Créer un compte</h2>
          <p className="mt-2 text-sm text-slate-400 normal-case">
            Ou{" "}
            <Link href="/connexion" className="font-semibold text-red-500 hover:text-red-400">
              connectez-vous à votre compte
            </Link>
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/60 backdrop-blur-sm/30 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center normal-case">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom complet</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-750 bg-[#0a0e1a] px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                placeholder="Ex: Saif Belhassine"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Adresse email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-750 bg-[#0a0e1a] px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                placeholder="Ex: test@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-750 bg-[#0a0e1a] px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-750 bg-[#0a0e1a] px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm normal-case"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center py-3.5 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 transition duration-300 shadow-lg shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? "Inscription en cours..." : "S'inscrire"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
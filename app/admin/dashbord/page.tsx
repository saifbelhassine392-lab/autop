'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminContent from '@/components/AdminContent';
import Image from 'next/image';
import { Settings, Bell, Menu } from 'lucide-react';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Nouveaux états d'authentification
  const [selectedProfName, setSelectedProfName] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'selection' | 'setup_password' | 'enter_password'>('selection');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    const adminAuth = typeof window !== 'undefined' ? localStorage.getItem('adminAuth') : null;
    const activeProf = typeof window !== 'undefined' ? localStorage.getItem('activeAdminProfile') : null;
    const defaultProf = activeProf || adminAuth || 'SAIF';
    if (!activeProf && typeof window !== 'undefined') {
      localStorage.setItem('activeAdminProfile', defaultProf);
      localStorage.setItem('adminAuth', defaultProf);
      setActiveProfile(defaultProf);
    } else if (activeProf) {
      setActiveProfile(activeProf);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hasLocalAuth = typeof window !== 'undefined' && !!(localStorage.getItem('adminAuth') || localStorage.getItem('activeAdminProfile'));
    if (status === 'unauthenticated' && !hasLocalAuth) {
      router.push('/connexion');
    }
  }, [status, router, mounted]);

  useEffect(() => {
    const handleProfileChange = () => {
      const current = localStorage.getItem('activeAdminProfile');
      setActiveProfile(current);
      if (!current) {
        setSelectedProfName(null);
        setAuthState('selection');
        setPasswordInput('');
        setAuthError(null);
      }
    };
    window.addEventListener('active-profile-changed', handleProfileChange);
    return () => window.removeEventListener('active-profile-changed', handleProfileChange);
  }, []);

  const handleProfileClick = async (name: string) => {
    setSelectedProfName(name);
    setAuthError(null);
    setPasswordInput('');
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/admin/profiles/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action: 'check' })
      });
      const data = await res.json();
      if (data.hasPassword) {
        setAuthState('enter_password');
      } else {
        setAuthState('setup_password');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Erreur de connexion au serveur.');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setCheckingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/profiles/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedProfName, action: 'set', password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('activeAdminProfile', selectedProfName!);
        window.dispatchEvent(new Event('active-profile-changed'));
        setActiveProfile(selectedProfName);
      } else {
        setAuthError(data.error || 'Erreur d\'initialisation');
      }
    } catch (err) {
      setAuthError('Erreur serveur');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setCheckingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/profiles/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedProfName, action: 'verify', password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('activeAdminProfile', selectedProfName!);
        window.dispatchEvent(new Event('active-profile-changed'));
        setActiveProfile(selectedProfName);
      } else {
        setAuthError(data.error || 'Mot de passe incorrect');
      }
    } catch (err) {
      setAuthError('Erreur serveur');
    } finally {
      setCheckingAuth(false);
    }
  };

  const hasLocalAuth = mounted && !!(localStorage.getItem('adminAuth') || localStorage.getItem('activeAdminProfile') || activeProfile);

  if (!mounted || (status === 'loading' && !hasLocalAuth)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
          <span className="text-zinc-950 font-black uppercase text-sm tracking-widest">CHARGEMENT...</span>
        </div>
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  const isNextAuthAdmin = role === 'admin' || role === 'ADMIN' || role === 'PROFESSIONAL';
  const isAdmin = isNextAuthAdmin || hasLocalAuth;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 relative mx-auto mb-6">
            <Image src="/logo.png" alt="AUTOP" fill style={{ objectFit: 'contain' }} />
          </div>
          <h2 className="text-2xl font-black text-zinc-950 uppercase tracking-widest mb-2">ACCÈS RÉSERVÉ</h2>
          <p className="text-slate-400 uppercase text-sm mb-6">CET ESPACE EST RÉSERVÉ AUX ADMINISTRATEURS AUTOP.</p>
          <button onClick={() => router.push('/')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-zinc-950 rounded-xl font-black uppercase tracking-wide transition">
            RETOUR À L'ACCUEIL
          </button>
        </div>
      </div>
    );
  }

  // Si aucun profil admin n'est sélectionné dans la session locale, afficher l'overlay de sélection
  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="w-28 h-14 relative mx-auto mb-6">
            <Image src="/logo.png" alt="AUTOP" fill style={{ objectFit: 'contain' }} priority />
          </div>

          {authState === 'selection' && (
            <>
              <h2 className="text-2xl font-black text-zinc-950 uppercase tracking-[4px] mb-2">
                QUI COMMENCE SA SESSION ?
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">
                SÉLECTIONNEZ VOTRE PROFIL POUR SÉCURISER ET SUIVRE VOS ACTIONS
              </p>

              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                {[
                  { name: 'SAIF', color: 'from-red-600 to-orange-500', initials: 'S' },
                  { name: 'AMINE', color: 'from-orange-500 to-amber-500', initials: 'A' },
                  { name: 'SAIFALLAH', color: 'from-purple-600 to-indigo-600', initials: 'SF' },
                ].map((prof) => (
                  <button
                    key={prof.name}
                    disabled={checkingAuth}
                    onClick={() => handleProfileClick(prof.name)}
                    className="group relative bg-slate-900 border border-zinc-200 rounded-3xl p-5 hover:border-red-650 transition-all duration-300 transform hover:scale-[1.02] shadow-2xl flex items-center gap-4 overflow-hidden w-full disabled:opacity-50"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${prof.color} flex items-center justify-center text-zinc-950 font-black text-lg shadow-lg`}>
                      {prof.initials}
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-zinc-950 text-sm tracking-wider group-hover:text-red-400 transition-colors">
                        {prof.name}
                      </span>
                      <span className="block text-[8px] text-zinc-600 font-extrabold uppercase tracking-[2px]">
                        ADMINISTRATEUR
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {authState === 'setup_password' && (
            <div className="bg-slate-900 border border-zinc-200 rounded-[30px] p-8 shadow-2xl text-center">
              <h3 className="text-zinc-950 font-black text-lg uppercase tracking-wider mb-2">PREMIÈRE CONNEXION</h3>
              <p className="text-slate-400 text-xs font-bold uppercase mb-6 tracking-wide">
                CHOISISSEZ UN MOT DE PASSE POUR LE PROFIL <span className="text-red-400">{selectedProfName}</span>
              </p>

              <form onSubmit={handleSetupPassword} className="space-y-4">
                <input
                  type="password"
                  required
                  placeholder="CHOISISSEZ VOTRE CODE / MOT DE PASSE"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-950 text-center font-bold tracking-widest focus:outline-none focus:border-red-500 uppercase animate-pulse"
                />
                
                {authError && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-wider">{authError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthState('selection')}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                  >
                    RETOUR
                  </button>
                  <button
                    type="submit"
                    disabled={checkingAuth}
                    className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition disabled:opacity-50"
                  >
                    {checkingAuth ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {authState === 'enter_password' && (
            <div className="bg-slate-900 border border-zinc-200 rounded-[30px] p-8 shadow-2xl text-center">
              <h3 className="text-zinc-950 font-black text-lg uppercase tracking-wider mb-2">VERROUILLAGE PROFIL</h3>
              <p className="text-slate-400 text-xs font-bold uppercase mb-6 tracking-wide">
                ENTREZ LE MOT DE PASSE DE <span className="text-red-400">{selectedProfName}</span> POUR ACCÉDER
              </p>

              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="ENTREZ VOTRE MOT DE PASSE"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-950 text-center font-bold tracking-widest focus:outline-none focus:border-red-500 uppercase"
                />
                
                {authError && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-wider">{authError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthState('selection')}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                  >
                    RETOUR
                  </button>
                  <button
                    type="submit"
                    disabled={checkingAuth}
                    className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition disabled:opacity-50"
                  >
                    {checkingAuth ? 'VERIFICATION...' : 'DÉVERROUILLER'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex text-zinc-950 antialiased overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top bar */}
        <header className="bg-slate-900 border-b border-zinc-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-400 hover:text-zinc-950 transition p-1.5"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-10 h-8 relative hidden md:block">
              <Image src="/logo.png" alt="AUTOP" fill style={{ objectFit: 'contain' }} />
            </div>
            <span className="text-zinc-950 font-black uppercase tracking-widest text-[10px] md:text-sm">CONSOLE ADMIN</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="text-slate-400 hover:text-zinc-950 transition p-1.5 hidden sm:block">
              <Bell className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-zinc-950 transition p-1.5 hidden sm:block">
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-2 md:pl-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-zinc-950 font-black text-sm shrink-0">
                {(activeProfile || session?.user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-zinc-950 font-black text-xs uppercase leading-none">{activeProfile || session?.user?.name}</p>
                <p className="text-zinc-600 text-[9px] uppercase">{role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 bg-zinc-50">
          <AdminContent />
        </main>
      </div>
    </div>
  );
}
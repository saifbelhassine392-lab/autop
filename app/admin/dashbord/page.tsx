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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center bg-[#f8f9fa] border border-[#dcedf2] rounded-[12px] p-8 max-w-md w-full shadow-sm">
          <div className="w-24 h-12 relative mx-auto mb-5">
            <Image src="/logo.png" alt="AUTOP" fill style={{ objectFit: 'contain' }} />
          </div>
          <h2 className="text-xl font-bold text-black uppercase tracking-wider mb-2">Accès Réservé</h2>
          <p className="text-[#6c757d] text-xs font-semibold uppercase mb-6">Cet espace est réservé aux administrateurs AutoP.</p>
          <button onClick={() => router.push('/')}
            className="w-full py-2.5 bg-[#e8432f] hover:bg-[#d13a27] text-white rounded-[7px] font-bold text-xs uppercase tracking-wide transition shadow-sm">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Si aucun profil admin n'est sélectionné dans la session locale, afficher l'overlay de sélection
  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative font-sans">
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="w-28 h-12 relative mx-auto mb-6">
            <Image src="/logo.png" alt="AUTOP" fill style={{ objectFit: 'contain' }} priority />
          </div>

          {authState === 'selection' && (
            <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[12px] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-black uppercase tracking-wider mb-1.5 font-sans">
                Qui commence sa session ?
              </h2>
              <p className="text-[#6c757d] text-xs font-semibold mb-6">
                Sélectionnez votre profil pour sécuriser et suivre vos actions
              </p>

              <div className="flex flex-col gap-3">
                {[
                  { name: 'SAIF', color: 'from-[#e8432f] to-[#b8281a]', initials: 'S' },
                  { name: 'AMINE', color: 'from-[#d97706] to-[#b45309]', initials: 'A' },
                  { name: 'SAIFALLAH', color: 'from-[#4a3ab8] to-[#372b8c]', initials: 'SF' },
                ].map((prof) => (
                  <button
                    key={prof.name}
                    disabled={checkingAuth}
                    onClick={() => handleProfileClick(prof.name)}
                    className="group bg-white border border-[#dcedf2] hover:border-[#e8432f] rounded-[9px] p-3.5 transition-all shadow-xs flex items-center gap-3.5 text-left w-full disabled:opacity-50 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-[8px] bg-gradient-to-br ${prof.color} flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0`}>
                      {prof.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block font-bold text-black text-[13.5px] group-hover:text-[#e8432f] transition-colors">
                        {prof.name}
                      </span>
                      <span className="block text-[10.5px] text-[#6c757d] font-semibold uppercase tracking-wider">
                        Administrateur
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {authState === 'setup_password' && (
            <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[12px] p-6 shadow-sm text-center">
              <h3 className="text-black font-bold text-base uppercase tracking-wide mb-1.5">Première connexion</h3>
              <p className="text-[#6c757d] text-xs font-semibold mb-5">
                Choisissez un mot de passe pour le profil <span className="text-[#e8432f] font-bold">{selectedProfName}</span>
              </p>

              <form onSubmit={handleSetupPassword} className="space-y-3.5">
                <input
                  type="password"
                  required
                  placeholder="Choisissez votre mot de passe"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2 text-xs text-black text-center font-bold tracking-widest focus:outline-none focus:border-[#e8432f]"
                />
                
                {authError && (
                  <p className="text-[#dc2626] text-[11px] font-bold">{authError}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthState('selection')}
                    className="flex-1 py-2 bg-white border border-[#dcedf2] hover:border-[#e8432f] text-[#111318] rounded-[7px] text-xs font-bold transition"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={checkingAuth}
                    className="flex-1 py-2 bg-[#e8432f] hover:bg-[#d13a27] text-white rounded-[7px] text-xs font-bold transition disabled:opacity-50"
                  >
                    {checkingAuth ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {authState === 'enter_password' && (
            <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[12px] p-6 shadow-sm text-center">
              <h3 className="text-black font-bold text-base uppercase tracking-wide mb-1.5">Verrouillage Profil</h3>
              <p className="text-[#6c757d] text-xs font-semibold mb-5">
                Entrez le mot de passe de <span className="text-[#e8432f] font-bold">{selectedProfName}</span> pour accéder
              </p>

              <form onSubmit={handleVerifyPassword} className="space-y-3.5">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Entrez votre mot de passe"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2 text-xs text-black text-center font-bold tracking-widest focus:outline-none focus:border-[#e8432f]"
                />
                
                {authError && (
                  <p className="text-[#dc2626] text-[11px] font-bold">{authError}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthState('selection')}
                    className="flex-1 py-2 bg-white border border-[#dcedf2] hover:border-[#e8432f] text-[#111318] rounded-[7px] text-xs font-bold transition"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={checkingAuth}
                    className="flex-1 py-2 bg-[#e8432f] hover:bg-[#d13a27] text-white rounded-[7px] text-xs font-bold transition disabled:opacity-50"
                  >
                    {checkingAuth ? 'Vérification...' : 'Déverrouiller'}
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
    <div className="min-h-screen bg-white flex text-black antialiased overflow-hidden font-sans">
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        {/* Top bar */}
        <header className="bg-white border-b border-[#e9ecef] px-5 py-3 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-[#495057] hover:text-black transition p-1.5 rounded-[6px] hover:bg-[#f8f9fa]"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-black tracking-tight font-sans">
                Console Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-[#6c757d] hover:text-black transition p-1.5 rounded-[6px] hover:bg-[#f8f9fa] hidden sm:block">
              <Bell className="w-4 h-4" />
            </button>
            <button className="text-[#6c757d] hover:text-black transition p-1.5 rounded-[6px] hover:bg-[#f8f9fa] hidden sm:block">
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-[#e9ecef] pl-3">
              <div className="w-7 h-7 rounded-[6px] bg-[#f8d7da] text-[#e8432f] flex items-center justify-center font-bold text-xs shrink-0">
                {(activeProfile || session?.user?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-black font-bold text-[12px] leading-tight">{activeProfile || session?.user?.name || 'Admin'}</p>
                <p className="text-[#6c757d] text-[10px] font-semibold">{role || 'Administrateur'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 bg-white p-5 md:p-7">
          <AdminContent />
        </main>
      </div>
    </div>
  );
}
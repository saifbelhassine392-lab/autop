"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AppContextType {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  adminSection: string;
  setAdminSection: (s: string) => void;
  cart: string[];
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState('accueil');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSection, setAdminSection] = useState('tableau-bord');
  const [cart, setCart] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addToCart = useCallback((id: string) => {
    setCart(prev => prev.includes(id) ? prev : [...prev, id]);
    showToast('Article ajoute au devis !');
  }, [showToast]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      isAdmin, setIsAdmin,
      adminSection, setAdminSection,
      cart, addToCart, removeFromCart,
      toast, showToast,
      searchQuery, setSearchQuery
    }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] bg-accent-green text-white px-6 py-3 rounded-xl font-bold shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

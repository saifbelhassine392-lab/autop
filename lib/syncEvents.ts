/**
 * Utilitaires de synchronisation temps réel pour les Devis & Demandes (Client & Admin)
 * Supporte :
 * 1. BroadcastChannel (synchronisation instantanée multi-onglets < 5ms)
 * 2. Événements Storage (fallback inter-onglets)
 * 3. Polling dynamique intelligent (toutes les 3s quand l'onglet est visible)
 * 4. Rafraîchissement automatique lors du focus de la fenêtre
 */

export function notifyQuotesSync() {
  if (typeof window === 'undefined') return;

  const payload = { type: 'QUOTES_SYNC', timestamp: Date.now() };

  // 1. BroadcastChannel
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('autop_quotes_sync_channel');
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {
    // Ignorer
  }

  // 2. LocalStorage Event (cross-tab fallback)
  try {
    localStorage.setItem('autop_quotes_sync_ping', String(Date.now()));
  } catch (e) {
    // Ignorer
  }

  // 3. CustomEvent (même onglet)
  try {
    window.dispatchEvent(new CustomEvent('autop_quotes_sync', { detail: payload }));
  } catch (e) {
    // Ignorer
  }
}

export function subscribeQuotesSync(onSync: () => void, pollIntervalMs = 3000): () => void {
  if (typeof window === 'undefined') return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('autop_quotes_sync_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'QUOTES_SYNC') {
          onSync();
        }
      };
    }
  } catch (e) {
    // Ignorer
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'autop_quotes_sync_ping') {
      onSync();
    }
  };

  const handleCustom = () => {
    onSync();
  };

  const handleFocus = () => {
    onSync();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      onSync();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('autop_quotes_sync', handleCustom);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibility);

  // Polling automatique si l'onglet est actif
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      onSync();
    }
  }, pollIntervalMs);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch (e) {}
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('autop_quotes_sync', handleCustom);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
    clearInterval(intervalId);
  };
}

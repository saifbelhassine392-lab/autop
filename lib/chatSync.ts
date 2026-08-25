/**
 * Utilitaire de synchronisation en temps réel du Chat AutoP (Inter-onglets et Polling)
 */

export const notifyChatSync = () => {
  try {
    if (typeof window !== 'undefined') {
      // 1. Diffusion BroadcastChannel vers tous les onglets du navigateur (Admin & Client)
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('autop_chat_channel');
        bc.postMessage({ type: 'NEW_CHAT_MESSAGE', timestamp: Date.now() });
        setTimeout(() => bc.close(), 100);
      }
      // 2. Événement local pour l'onglet courant
      window.dispatchEvent(new CustomEvent('autop_chat_event', { detail: { timestamp: Date.now() } }));
    }
  } catch (e) {
    console.error('BroadcastChannel sync error:', e);
  }
};

export const subscribeToChatSync = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('autop_chat_channel');
      bc.onmessage = () => {
        callback();
      };
    }
  } catch (e) {}

  const handleCustomEvent = () => callback();
  window.addEventListener('autop_chat_event', handleCustomEvent);

  return () => {
    try {
      if (bc) bc.close();
    } catch (e) {}
    window.removeEventListener('autop_chat_event', handleCustomEvent);
  };
};

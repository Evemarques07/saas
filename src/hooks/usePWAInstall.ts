import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Storage keys
const STORAGE_KEYS = {
  LAST_PROMPT_TIME: 'ejym_pwa_last_prompt',
  APP_INSTALLED: 'ejym_pwa_installed',
  PROMPT_DISMISSED_COUNT: 'ejym_pwa_dismissed_count',
};

// Constants
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_DISMISS_COUNT = 5; // Stop showing after 5 dismissals

export interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  showPrompt: boolean;
  installApp: () => Promise<void>;
  dismissPrompt: () => void;
  canShowPrompt: boolean;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if app is installed
  const checkIfInstalled = useCallback(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check if running as installed app on iOS
    const isIOSInstalled = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Check localStorage flag (set after successful install)
    const wasInstalled = localStorage.getItem(STORAGE_KEYS.APP_INSTALLED) === 'true';

    return isStandalone || isIOSInstalled || wasInstalled;
  }, []);

  // Check if should show prompt based on time interval
  const shouldShowPrompt = useCallback(() => {
    if (checkIfInstalled()) {
      return false;
    }

    // Check dismiss count
    const dismissCount = parseInt(localStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED_COUNT) || '0', 10);
    if (dismissCount >= MAX_DISMISS_COUNT) {
      return false;
    }

    const lastPromptTime = localStorage.getItem(STORAGE_KEYS.LAST_PROMPT_TIME);
    if (!lastPromptTime) {
      return true; // Never shown before
    }

    const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
    return timeSinceLastPrompt >= ONE_HOUR_MS;
  }, [checkIfInstalled]);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if should show the prompt
      if (shouldShowPrompt()) {
        setShowPrompt(true);
        localStorage.setItem(STORAGE_KEYS.LAST_PROMPT_TIME, Date.now().toString());
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem(STORAGE_KEYS.APP_INSTALLED, 'true');
    };

    // Listen for install prompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check initial installed state
    setIsInstalled(checkIfInstalled());

    // Set up interval to check if should show prompt (every minute)
    const intervalId = setInterval(() => {
      if (deferredPrompt && shouldShowPrompt() && !showPrompt) {
        setShowPrompt(true);
        localStorage.setItem(STORAGE_KEYS.LAST_PROMPT_TIME, Date.now().toString());
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(intervalId);
    };
  }, [checkIfInstalled, shouldShowPrompt, deferredPrompt, showPrompt]);

  // Install the app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem(STORAGE_KEYS.APP_INSTALLED, 'true');
        // Reset dismiss count on successful install
        localStorage.removeItem(STORAGE_KEYS.PROMPT_DISMISSED_COUNT);
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  }, [deferredPrompt]);

  // Dismiss the prompt
  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEYS.LAST_PROMPT_TIME, Date.now().toString());

    // Increment dismiss count
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED_COUNT) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.PROMPT_DISMISSED_COUNT, (currentCount + 1).toString());
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    showPrompt,
    installApp,
    dismissPrompt,
    canShowPrompt: !!deferredPrompt && !isInstalled,
  };
}

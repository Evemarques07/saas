import { getSubdomainSlug } from '../routes/paths';
import { useState, useEffect, useCallback } from 'react';
import { Company } from '../types';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UseCatalogPWAOptions {
  company: Company | null;
}

interface UseCatalogPWAReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  installApp: () => Promise<boolean>;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
}

// Convert image URL to base64 data URL
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('[CatalogPWA] Failed to convert image to base64:', error);
    return null;
  }
}

// Generate dynamic manifest for the company
async function generateManifest(company: Company): Promise<string> {
  const baseUrl = window.location.origin;

  // Build icons array
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = [];

  // Try to convert company logo to base64 for offline support
  if (company.logo_url) {
    const logoBase64 = await imageToBase64(company.logo_url);

    if (logoBase64) {
      // Use base64 data URL - works offline!
      icons.push(
        {
          src: logoBase64,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: logoBase64,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: logoBase64,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }
      );
      console.log('[CatalogPWA] Logo converted to base64 successfully');
    } else {
      // Fallback to external URL if base64 conversion fails
      console.log('[CatalogPWA] Using external logo URL');
      icons.push(
        {
          src: company.logo_url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: company.logo_url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        }
      );
    }
  }

  // Always add fallback icons (they will be used if company logo fails)
  icons.push(
    {
      src: `${baseUrl}/pwa-192x192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: `${baseUrl}/pwa-512x512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    }
  );

  const manifest = {
    name: company.name,
    short_name: company.name.length > 12 ? company.name.substring(0, 12) : company.name,
    description: `Catalogo de produtos - ${company.name}`,
    theme_color: '#6366f1',
    background_color: '#111827',
    display: 'standalone',
    orientation: 'portrait',
    scope: getSubdomainSlug() ? `/catalogo` : `/catalogo/${company.slug}`,
    start_url: getSubdomainSlug() ? `/catalogo` : `/catalogo/${company.slug}`,
    id: getSubdomainSlug() ? `/catalogo` : `/catalogo/${company.slug}`,
    icons,
    categories: ['shopping', 'lifestyle'],
    screenshots: [],
    shortcuts: [
      {
        name: 'Ver Catalogo',
        short_name: 'Catalogo',
        description: 'Abrir catalogo de produtos',
        url: getSubdomainSlug() ? `/catalogo` : `/catalogo/${company.slug}`,
      },
    ],
  };

  return JSON.stringify(manifest);
}

// Store manifest URLs to avoid memory leaks
const manifestUrls = new Map<string, string>();

// Inject dynamic manifest into DOM
async function injectManifest(company: Company): Promise<() => void> {
  // Remove ALL existing manifest links (including the static one from PWA plugin)
  const existingManifests = document.querySelectorAll('link[rel="manifest"]');
  existingManifests.forEach((manifest) => manifest.remove());

  // Revoke old manifest URL for this company if exists
  const oldUrl = manifestUrls.get(company.slug);
  if (oldUrl) {
    URL.revokeObjectURL(oldUrl);
  }

  // Generate and inject new manifest
  const manifestContent = await generateManifest(company);
  const blob = new Blob([manifestContent], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(blob);

  // Store the URL for later cleanup
  manifestUrls.set(company.slug, manifestUrl);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  link.setAttribute('data-catalog', 'true');
  link.setAttribute('data-company', company.slug);
  document.head.appendChild(link);

  console.log('[CatalogPWA] Injected dynamic manifest for:', company.name);

  // Update theme color
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', '#6366f1');

  // Update apple-touch-icon if company has logo
  if (company.logo_url) {
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement('link');
      appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.setAttribute('href', company.logo_url);
  }

  // Cleanup function - DON'T revoke URL immediately, it's needed for install
  // URLs are cleaned up when a new manifest is injected for the same company
  return () => {
    link.remove();
  };
}

// Check if running as installed PWA
function isRunningAsInstalledPWA(): boolean {
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }

  // Check if opened from home screen (Android)
  if (document.referrer.includes('android-app://')) {
    return true;
  }

  return false;
}

// Check if device is iOS
function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function useCatalogPWA({ company }: UseCatalogPWAOptions): UseCatalogPWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isIOS = isIOSDevice();
  const isInstallable = !isInstalled && (!!deferredPrompt || isIOS);

  // Inject manifest when company data is available
  useEffect(() => {
    if (!company) return;

    let cleanup: (() => void) | undefined;

    // Inject manifest asynchronously
    injectManifest(company).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [company]);

  // Check if already installed
  useEffect(() => {
    setIsInstalled(isRunningAsInstalledPWA());

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install app function
  const installApp = useCallback(async (): Promise<boolean> => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return false;
    }

    if (!deferredPrompt) {
      console.log('[CatalogPWA] No deferred prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);

      if (outcome === 'accepted') {
        console.log('[CatalogPWA] User accepted the install prompt');
        return true;
      } else {
        console.log('[CatalogPWA] User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('[CatalogPWA] Error showing install prompt:', error);
      return false;
    }
  }, [deferredPrompt, isIOS]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    installApp,
    showIOSInstructions,
    setShowIOSInstructions,
  };
}

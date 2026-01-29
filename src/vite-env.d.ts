/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase - Estas são públicas por design (a segurança vem via RLS)
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // WuzAPI URL (opcional, para conexão WhatsApp)
  readonly VITE_WUZAPI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

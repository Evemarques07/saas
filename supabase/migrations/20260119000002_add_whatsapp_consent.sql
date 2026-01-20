-- Migration: Add whatsapp_consent to catalog_orders table
-- LGPD: Armazenar consentimento do cliente para receber mensagens WhatsApp

-- Adiciona campo whatsapp_consent para armazenar consentimento
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT false;

-- Adiciona campo consent_at para registrar quando o consentimento foi dado
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN catalog_orders.whatsapp_consent IS 'LGPD: Cliente consentiu receber mensagens WhatsApp';
COMMENT ON COLUMN catalog_orders.consent_at IS 'LGPD: Data/hora do consentimento';

-- Atualiza pedidos existentes para ter consentimento como true (retroativo)
-- Isso porque antes da implementação não havia opt-in explícito
UPDATE catalog_orders
SET whatsapp_consent = true,
    consent_at = created_at
WHERE whatsapp_consent IS NULL;

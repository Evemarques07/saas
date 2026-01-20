-- Migration: Add whatsapp_settings to companies table
-- Description: Adds JSONB column for WhatsApp automation settings per company

-- Add whatsapp_settings column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN companies.whatsapp_settings IS 'WhatsApp automation settings for the company. Structure:
{
  "enabled": boolean,           -- Whether WhatsApp automation is enabled
  "provider": string,           -- "evolution" | "z-api" | "twilio"
  "instance_name": string,      -- Instance name in Evolution API (ejym-{slug})
  "connected": boolean,         -- Whether WhatsApp is currently connected
  "connected_at": timestamp,    -- When the WhatsApp was connected
  "phone": string,              -- Connected phone number
  "phone_name": string,         -- WhatsApp profile name
  "notify_on_new_order": boolean,   -- Send notification on new order
  "notify_on_confirm": boolean,     -- Send notification on order confirmed
  "notify_on_complete": boolean,    -- Send notification on order completed
  "notify_on_cancel": boolean       -- Send notification on order cancelled
}';

-- Create index for querying companies with WhatsApp enabled
CREATE INDEX IF NOT EXISTS idx_companies_whatsapp_enabled
ON companies ((whatsapp_settings->>'enabled'))
WHERE whatsapp_settings->>'enabled' = 'true';

-- Optional: Create table to log WhatsApp messages (for audit/debugging)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,

  -- Recipient info
  phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'company')),

  -- Message info
  message_type TEXT NOT NULL CHECK (message_type IN ('order_created', 'order_confirmed', 'order_completed', 'order_cancelled', 'test')),
  message_content TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,

  -- External tracking
  external_id TEXT, -- ID returned by WhatsApp API

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order ON whatsapp_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- RLS for whatsapp_messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from their companies
CREATE POLICY "whatsapp_messages_select_policy" ON whatsapp_messages
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = current_setting('app.user_id', true)
    )
  );

-- Policy: Allow insert for authenticated users (will be done via Edge Functions mostly)
CREATE POLICY "whatsapp_messages_insert_policy" ON whatsapp_messages
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = current_setting('app.user_id', true)
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON whatsapp_messages TO authenticated;
GRANT SELECT, INSERT ON whatsapp_messages TO anon;

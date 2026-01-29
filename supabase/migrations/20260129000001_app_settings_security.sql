-- ============================================
-- Ejym SaaS - App Settings & Security Improvements
-- ============================================

-- Tabela para configurações globais da aplicação
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração inicial
INSERT INTO app_settings (key, value, description, is_public) VALUES
  ('super_admin_emails', '["evertonmarques.jm@gmail.com"]', 'Lista de emails super admin', false)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Super admins can manage all settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can read public settings" ON app_settings;

-- profiles.id é TEXT, auth.uid() é UUID - precisa cast para TEXT
CREATE POLICY "Super admins can manage all settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()::text
      AND profiles.is_super_admin = true
    )
  );

CREATE POLICY "Authenticated users can read public settings"
  ON app_settings FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);

-- Função para verificar se email é super admin
CREATE OR REPLACE FUNCTION is_super_admin_email(check_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_emails JSONB;
BEGIN
  SELECT value INTO admin_emails
  FROM app_settings
  WHERE key = 'super_admin_emails';

  IF admin_emails IS NULL THEN
    RETURN false;
  END IF;

  RETURN admin_emails @> to_jsonb(check_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de signup
CREATE OR REPLACE FUNCTION set_super_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF is_super_admin_email(NEW.email) THEN
    UPDATE profiles
    SET is_super_admin = true
    WHERE id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar super admin (profiles.id é TEXT)
CREATE OR REPLACE FUNCTION add_super_admin_email(new_email TEXT)
RETURNS VOID AS $$
DECLARE
  current_emails JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::text
    AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Apenas super admins podem adicionar novos super admins';
  END IF;

  SELECT value INTO current_emails
  FROM app_settings
  WHERE key = 'super_admin_emails';

  IF NOT (current_emails @> to_jsonb(new_email)) THEN
    UPDATE app_settings
    SET value = current_emails || jsonb_build_array(new_email)
    WHERE key = 'super_admin_emails';
  END IF;

  UPDATE profiles SET is_super_admin = true WHERE email = new_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover super admin (profiles.id é TEXT)
CREATE OR REPLACE FUNCTION remove_super_admin_email(remove_email TEXT)
RETURNS VOID AS $$
DECLARE
  current_emails JSONB;
  new_emails JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::text
    AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Apenas super admins podem remover super admins';
  END IF;

  SELECT value INTO current_emails
  FROM app_settings
  WHERE key = 'super_admin_emails';

  SELECT jsonb_agg(elem) INTO new_emails
  FROM jsonb_array_elements(current_emails) AS elem
  WHERE elem::text != to_jsonb(remove_email)::text;

  UPDATE app_settings
  SET value = COALESCE(new_emails, '[]'::jsonb)
  WHERE key = 'super_admin_emails';

  UPDATE profiles SET is_super_admin = false WHERE email = remove_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

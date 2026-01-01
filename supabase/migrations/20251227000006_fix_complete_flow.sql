-- ============================================
-- Fix COMPLETO: Corrigir todo o fluxo de signup e convites
-- ============================================

-- ==========================================
-- 1. FUNÇÃO PARA CRIAR PROFILE
-- ==========================================
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS ensure_user_profile(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, is_super_admin)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_email = 'evertonmarques.jm@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);
END;
$$;

GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile TO service_role;

-- ==========================================
-- 2. FUNÇÃO PARA ACEITAR CONVITE
-- ==========================================
DROP FUNCTION IF EXISTS accept_invite(TEXT, UUID);

CREATE OR REPLACE FUNCTION accept_invite(
  invite_token TEXT,
  user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Buscar convite válido
  SELECT * INTO v_invite
  FROM invites
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    -- Tentar buscar convite já aceito (para casos de retry)
    SELECT * INTO v_invite
    FROM invites
    WHERE token = invite_token;

    IF FOUND AND v_invite.accepted_at IS NOT NULL THEN
      -- Convite já aceito, mas vamos garantir que o membro foi adicionado
      INSERT INTO company_members (company_id, user_id, role, is_active)
      VALUES (
        v_invite.company_id,
        user_id,
        CASE WHEN v_invite.role = 'company_admin' THEN 'admin' ELSE v_invite.role END,
        true
      )
      ON CONFLICT (company_id, user_id) DO NOTHING;

      RETURN jsonb_build_object('success', true, 'company_id', v_invite.company_id, 'note', 'already_accepted');
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Convite invalido ou expirado');
  END IF;

  -- Inserir como membro da empresa
  INSERT INTO company_members (company_id, user_id, role, is_active)
  VALUES (
    v_invite.company_id,
    user_id,
    CASE WHEN v_invite.role = 'company_admin' THEN 'admin' ELSE v_invite.role END,
    true
  )
  ON CONFLICT (company_id, user_id) DO NOTHING;

  -- Marcar convite como aceito
  UPDATE invites
  SET accepted_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'company_id', v_invite.company_id);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invite TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invite TO anon;
GRANT EXECUTE ON FUNCTION accept_invite TO service_role;

-- ==========================================
-- 3. FUNÇÃO PARA ADICIONAR MEMBRO DIRETAMENTE
-- ==========================================
CREATE OR REPLACE FUNCTION add_company_member(
  p_company_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'admin'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO company_members (company_id, user_id, role, is_active)
  VALUES (
    p_company_id,
    p_user_id,
    p_role,
    true
  )
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION add_company_member TO authenticated;
GRANT EXECUTE ON FUNCTION add_company_member TO service_role;

-- ==========================================
-- 4. POLÍTICAS RLS SIMPLIFICADAS
-- ==========================================

-- PROFILES
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- COMPANY_MEMBERS
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_members_select_all" ON company_members;
DROP POLICY IF EXISTS "company_members_insert_all" ON company_members;
DROP POLICY IF EXISTS "company_members_update_all" ON company_members;
DROP POLICY IF EXISTS "company_members_delete_all" ON company_members;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_all" ON company_members FOR ALL USING (true) WITH CHECK (true);

-- COMPANIES
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_select_all" ON companies;
DROP POLICY IF EXISTS "companies_insert_admin" ON companies;
DROP POLICY IF EXISTS "companies_update_admin" ON companies;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_all" ON companies FOR ALL USING (true) WITH CHECK (true);

-- INVITES
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_select_all" ON invites;
DROP POLICY IF EXISTS "invites_insert_auth" ON invites;
DROP POLICY IF EXISTS "invites_update_auth" ON invites;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_all" ON invites FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 5. PERMISSÕES
-- ==========================================
GRANT ALL ON profiles TO authenticated, anon, service_role;
GRANT ALL ON company_members TO authenticated, anon, service_role;
GRANT ALL ON companies TO authenticated, anon, service_role;
GRANT ALL ON invites TO authenticated, anon, service_role;

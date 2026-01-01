-- ============================================
-- Fix: Allow users to accept invites
-- ============================================

-- Função para aceitar convite com SECURITY DEFINER (bypassa RLS)
CREATE OR REPLACE FUNCTION accept_invite(
  invite_token TEXT,
  user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_result JSONB;
BEGIN
  -- Buscar convite válido
  SELECT * INTO v_invite
  FROM invites
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION accept_invite TO authenticated;

-- Policy adicional: permitir que usuários vejam membros de empresas onde eles são membros
-- (já existe, mas vamos garantir que funciona)
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_members;
CREATE POLICY "Users can view members of their companies"
  ON company_members FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

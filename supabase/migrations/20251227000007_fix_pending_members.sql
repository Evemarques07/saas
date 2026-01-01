-- ============================================
-- Corrigir usuarios que aceitaram convite mas nao foram adicionados
-- ============================================

-- Inserir os membros que estão faltando
INSERT INTO company_members (company_id, user_id, role, is_active)
SELECT
  i.company_id,
  p.id,
  CASE WHEN i.role = 'company_admin' THEN 'admin' ELSE i.role END,
  true
FROM invites i
JOIN profiles p ON p.email = i.email
LEFT JOIN company_members cm ON cm.company_id = i.company_id AND cm.user_id = p.id
WHERE i.accepted_at IS NOT NULL
  AND cm.id IS NULL
  AND p.id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Também garantir que profiles tenham o email correto
UPDATE profiles p
SET email = (
  SELECT email FROM auth.users WHERE id = p.id
)
WHERE p.email IS NULL OR p.email = '';

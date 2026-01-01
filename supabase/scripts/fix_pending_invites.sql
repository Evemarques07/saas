-- ============================================
-- Corrigir usuarios que aceitaram convite mas nao foram adicionados
-- ============================================

-- 1. Ver convites aceitos que não tem company_member correspondente
SELECT
  i.email,
  i.company_id,
  c.name as company_name,
  i.role,
  i.accepted_at,
  p.id as profile_id,
  p.full_name,
  cm.id as member_id
FROM invites i
LEFT JOIN companies c ON c.id = i.company_id
LEFT JOIN profiles p ON p.email = i.email
LEFT JOIN company_members cm ON cm.company_id = i.company_id AND cm.user_id = p.id
WHERE i.accepted_at IS NOT NULL
  AND cm.id IS NULL
  AND p.id IS NOT NULL;

-- 2. Inserir os membros que estão faltando
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

-- 3. Verificar resultado
SELECT
  p.email,
  p.full_name,
  c.name as company_name,
  cm.role
FROM company_members cm
JOIN profiles p ON p.id = cm.user_id
JOIN companies c ON c.id = cm.company_id
ORDER BY cm.created_at DESC;

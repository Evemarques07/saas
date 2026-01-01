-- ============================================
-- Ejym SaaS - Super Admin Setup
-- ============================================

-- This trigger will set the super admin flag when the specified email signs up
CREATE OR REPLACE FUNCTION set_super_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'evertonmarques.jm@gmail.com' THEN
    UPDATE profiles
    SET is_super_admin = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_super_admin_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION set_super_admin_on_signup();

-- Also create a function to manually set super admin if needed
CREATE OR REPLACE FUNCTION make_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET is_super_admin = true
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default super_admin account
-- Password: admin123
-- Hash generated with: node -e "require('bcrypt').hash('admin123', 12).then(h => console.log(h))"

INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Super Admin',
  'admin@exata.co.id',
  '$2b$12$AG5D6Vzr8hO9m2//rrsFT.ZDJBvfFYrgB9h86DVtI5bca1nELeEj2',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

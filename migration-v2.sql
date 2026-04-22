-- ============================================================
-- Migration V2: Optional Fields, Viewed Status, City Column
-- Speed Nenkin — April 2026
-- ============================================================

-- 1. Add city column (for Kota field)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- 2. Make NIK and address nullable (can be filled by client at signing time)
ALTER TABLE clients ALTER COLUMN nik DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN address DROP NOT NULL;

-- 3. Add viewed_at timestamp (tracks when client first verified identity)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP;

-- 4. Update status CHECK constraint to include 'viewed'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('pending', 'viewed', 'signed', 'expired'));

-- ============================================================
-- Verification: Run this to confirm the migration
-- SELECT column_name, data_type, is_nullable 
--   FROM information_schema.columns 
--   WHERE table_name = 'clients' 
--   ORDER BY ordinal_position;
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'staff')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name      VARCHAR(255) NOT NULL,
  uploaded_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMP DEFAULT NOW(),
  total_clients   INTEGER DEFAULT 0,
  signed_count    INTEGER DEFAULT 0,
  output_excel_url TEXT,
  status          VARCHAR(30) DEFAULT 'active'
);

CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID REFERENCES batches(id) ON DELETE CASCADE,
  pic_user_id       UUID REFERENCES users(id),

  -- Data Klien (dari Excel)
  full_name         VARCHAR(255) NOT NULL,
  birth_date        DATE NOT NULL,
  nik               VARCHAR(20) NOT NULL,
  address           TEXT NOT NULL,
  phone             VARCHAR(30) NOT NULL,
  nenkin_number     VARCHAR(50),
  account_number    VARCHAR(50),
  pic_name          VARCHAR(100),

  -- Link & Dokumen
  slug              VARCHAR(100) UNIQUE NOT NULL,
  letter_number     VARCHAR(100) UNIQUE NOT NULL,
  link_expires_at   TIMESTAMP NOT NULL,
  blank_pdf_url     TEXT,

  -- Status
  status            VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),

  -- Data Setelah TTD
  signed_at         TIMESTAMP,
  signature_image_url TEXT,
  signed_pdf_url    TEXT,
  ip_address        VARCHAR(50),
  user_agent        TEXT,

  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  actor_type  VARCHAR(20),
  action      VARCHAR(100) NOT NULL,
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Sequence for Letter Numbers
CREATE SEQUENCE letter_number_seq START 1;

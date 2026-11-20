-- Mirror pages: a smart mirror with its own kiosk sign-in and a prepaid
-- AI try-on limit. Limit packages are bought per mirror and confirmed by the
-- platform once paid (no payment provider is integrated).
ALTER TABLE mirror.devices
 ADD COLUMN user_id uuid UNIQUE REFERENCES mirror.users(id),
 ADD COLUMN tryon_limit integer NOT NULL DEFAULT 0 CHECK (tryon_limit >= 0),
 ADD COLUMN tryons_used integer NOT NULL DEFAULT 0 CHECK (tryons_used >= 0),
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE mirror.orders ADD COLUMN device_id uuid REFERENCES mirror.devices(id) ON DELETE SET NULL;
CREATE INDEX ON mirror.orders(device_id);
CREATE TABLE mirror.limit_purchases(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES mirror.tenants(id),
 device_id uuid NOT NULL REFERENCES mirror.devices(id),
 package_id text,
 kind text NOT NULL DEFAULT 'TOPUP' CHECK (kind IN ('INITIAL','TOPUP')),
 tryons integer NOT NULL CHECK (tryons > 0),
 amount_cents integer NOT NULL CHECK (amount_cents >= 0),
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','CANCELLED')),
 requested_by uuid REFERENCES mirror.users(id),
 confirmed_by uuid REFERENCES mirror.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz);
CREATE INDEX ON mirror.limit_purchases(tenant_id, created_at);
CREATE INDEX ON mirror.limit_purchases(device_id);
ALTER TABLE mirror.limit_purchases ENABLE ROW LEVEL SECURITY;
-- Starting prices (USD); the Super Admin edits them in the console.
UPDATE mirror.credit_packages SET price_cents = 10000 WHERE id = 'extra-100' AND price_cents IS NULL;
UPDATE mirror.credit_packages SET price_cents = 45000 WHERE id = 'extra-500' AND price_cents IS NULL;
INSERT INTO mirror.credit_packages(id, name, credits, price_cents) VALUES ('extra-1000', '1000 additional try-ons', 1000, 80000) ON CONFLICT DO NOTHING;

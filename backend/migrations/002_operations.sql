CREATE TABLE mirror.credit_packages(id text PRIMARY KEY,name text NOT NULL,credits integer NOT NULL CHECK(credits>0),price_cents integer CHECK(price_cents>=0),active boolean NOT NULL DEFAULT true);
-- Prices intentionally unset until business approval; no payment integration implied.
INSERT INTO mirror.credit_packages(id,name,credits) VALUES('extra-100','100 additional try-ons',100),('extra-500','500 additional try-ons',500);
ALTER TABLE mirror.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON mirror.users(tenant_id,branch_id);
CREATE INDEX ON mirror.notifications(tenant_id,branch_id,created_at);
CREATE INDEX ON mirror.inventory(tenant_id,variant_id);
CREATE INDEX ON mirror.images(tenant_id,owner_id);

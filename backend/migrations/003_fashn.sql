-- Durable prediction IDs allow status polling after reconnects/restarts. Never
-- retry an uncertain submission: the provider has no documented idempotency key.
ALTER TABLE mirror.tryon_sessions
 ADD COLUMN provider_request_id text,
 ADD COLUMN request_hash text NOT NULL DEFAULT '',
 ADD COLUMN result_image_id uuid REFERENCES mirror.images(id) ON DELETE SET NULL,
 ADD COLUMN error_code text NOT NULL DEFAULT '',
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
 ADD COLUMN next_poll_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX ON mirror.tryon_sessions(next_poll_at) WHERE status='PENDING' AND provider_request_id IS NOT NULL;

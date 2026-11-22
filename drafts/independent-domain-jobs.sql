-- DRAFT ONLY. Review and run PostgreSQL integration tests before applying.
BEGIN;
CREATE SCHEMA independent_domain_jobs;
REVOKE ALL ON SCHEMA independent_domain_jobs FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA independent_domain_jobs TO service_role;
CREATE TABLE independent_domain_jobs.activation_jobs (
 domain_id uuid PRIMARY KEY REFERENCES public.site_domains(id) ON DELETE CASCADE,
 site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
 hostname text NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','retry','blocked','complete')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
 lease_version bigint NOT NULL DEFAULT 0 CHECK (lease_version >= 0),
 lease_until timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((state = 'running') = (lease_until IS NOT NULL)),
 CHECK (hostname = lower(hostname) AND length(hostname) BETWEEN 3 AND 253)
);
CREATE INDEX activation_jobs_due ON independent_domain_jobs.activation_jobs(next_attempt_at, domain_id)
 WHERE state IN ('queued','retry');
CREATE INDEX activation_jobs_expired ON independent_domain_jobs.activation_jobs(lease_until, domain_id)
 WHERE state = 'running';
ALTER TABLE independent_domain_jobs.activation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON independent_domain_jobs.activation_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON independent_domain_jobs.activation_jobs TO service_role;
COMMIT;

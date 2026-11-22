// Internal service-role/direct PostgreSQL adapter. Never expose it to a browser.
const TABLE = 'independent_domain_jobs.activation_jobs';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createIndependentJobStore(db) {
 if (typeof db?.query !== 'function') throw new TypeError('POSTGRES_QUERY_REQUIRED');
 return {
  async enqueue({domainId, siteId, hostname}) {
   if (!UUID.test(domainId || '') || !UUID.test(siteId || '') || typeof hostname !== 'string'
     || hostname.length > 253 || hostname !== hostname.toLowerCase()) throw new TypeError('INVALID_JOB');
   const r = await db.query(`INSERT INTO ${TABLE} (domain_id,site_id,hostname)
    SELECT id,site_id,hostname FROM public.site_domains WHERE id=$1 AND site_id=$2 AND hostname=$3
    ON CONFLICT (domain_id) DO NOTHING RETURNING *`, [domainId,siteId,hostname]);
   return r.rows[0] || null;
  },
  async claim() {
   const r = await db.query(`WITH candidate AS (
    SELECT j.domain_id FROM ${TABLE} j
    WHERE j.attempts < 20 AND EXISTS (SELECT 1 FROM public.site_domains d
      WHERE d.id=j.domain_id AND d.site_id=j.site_id AND d.hostname=j.hostname)
     AND ((j.state IN ('queued','retry') AND j.next_attempt_at <= clock_timestamp())
      OR (j.state='running' AND j.lease_until <= clock_timestamp()))
    ORDER BY j.next_attempt_at,j.domain_id FOR UPDATE OF j SKIP LOCKED LIMIT 1
   ) UPDATE ${TABLE} j SET state='running',attempts=j.attempts+1,
    lease_version=j.lease_version+1,lease_until=clock_timestamp()+interval '2 minutes',
    updated_at=clock_timestamp() FROM candidate c WHERE j.domain_id=c.domain_id RETURNING j.*`);
   return r.rows[0] || null;
  },
  async settle({domainId, leaseVersion, outcome, reason, delayMs=30000}) {
   if (!UUID.test(domainId || '') || !/^[1-9][0-9]*$/.test(String(leaseVersion))
     || !['retry','blocked','complete'].includes(outcome) || !/^[A-Z_]{1,80}$/.test(reason || '')
     || !Number.isInteger(delayMs) || delayMs < 30000 || delayMs > 3600000) throw new TypeError('INVALID_SETTLEMENT');
   const r = await db.query(`UPDATE ${TABLE} j SET
    state=CASE WHEN $3='retry' AND attempts>=20 THEN 'blocked' ELSE $3 END,
    reason=CASE WHEN $3='retry' AND attempts>=20 THEN 'RETRY_BUDGET_EXHAUSTED' ELSE $4 END,
    lease_until=NULL,next_attempt_at=clock_timestamp()+($5::integer * interval '1 millisecond'),
    updated_at=clock_timestamp()
    WHERE domain_id=$1 AND lease_version=$2::bigint AND state='running' AND lease_until>clock_timestamp()
     AND EXISTS (SELECT 1 FROM public.site_domains d WHERE d.id=j.domain_id AND d.site_id=j.site_id AND d.hostname=j.hostname)
    RETURNING *`, [domainId,String(leaseVersion),outcome,reason,delayMs]);
   return r.rows[0] || null;
  },
  async reapExhausted() {
   const r = await db.query(`WITH expired AS (
    SELECT domain_id FROM ${TABLE} WHERE state='running' AND attempts>=20 AND lease_until<=clock_timestamp()
    ORDER BY lease_until,domain_id FOR UPDATE SKIP LOCKED LIMIT 100
   ) UPDATE ${TABLE} j SET state='blocked',reason='RETRY_BUDGET_EXHAUSTED',lease_until=NULL,
    updated_at=clock_timestamp() FROM expired e WHERE j.domain_id=e.domain_id RETURNING j.domain_id`);
   return r.rows;
  }
 };
}

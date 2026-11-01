#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == domain_intent_ci && "${PGHOST:-}" == 127.0.0.1 ]] || { echo 'ISOLATED_LOCAL_CI_DATABASE_REQUIRED' >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
run_intent() {
 printf 'SET ROLE service_role;\nSELECT public.domain_prepare_customer_purchase_intent(:\x27payload\x27::jsonb);\n' | psql -XqAt -v ON_ERROR_STOP=1 -v payload="$1" > "$2"
}
assert_results() {
 node --input-type=module - "$1" "$2" "$3" <<'NODE'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [mode,a,b]=process.argv.slice(2),rows=[a,b].map(f=>JSON.parse(readFileSync(f,'utf8').trim()));
if(mode==='reuse'){
 assert.ok(rows.every(r=>r.ok===true));
 assert.deepEqual(rows.map(r=>r.reused).sort(),[false,true]);
 assert.equal(rows[0].intentId,rows[1].intentId);
}else{
 assert.equal(rows.filter(r=>r.ok===true).length,1);
 assert.equal(rows.filter(r=>r.error==='REVIEW_ALREADY_CONSUMED').length,1);
}
for(const r of rows.filter(r=>r.ok)){
 assert.equal(r.purchaseAllowed,false);assert.equal(r.checkoutAvailable,false);assert.equal(r.state,'prepared_not_payable');
}
NODE
}
payload=$(psql -XqAt -v ON_ERROR_STOP=1 -c "SELECT public.domain_intent_ci_fixture('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555')")
run_intent "$payload" "$tmp/a" & a=$!
run_intent "$payload" "$tmp/b" & b=$!
wait "$a";wait "$b"
assert_results reuse "$tmp/a" "$tmp/b"
p=$(psql -XqAt -v ON_ERROR_STOP=1 -c "SELECT public.domain_intent_ci_fixture('66666666-6666-4666-8666-666666666666','88888888-8888-4888-8888-888888888888')")
q=$(psql -XqAt -v ON_ERROR_STOP=1 -c "SELECT public.domain_intent_ci_fixture('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888')")
run_intent "$p" "$tmp/c" & a=$!
run_intent "$q" "$tmp/d" & b=$!
wait "$a";wait "$b"
assert_results replay "$tmp/c" "$tmp/d"
count=$(psql -XqAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM public.domain_customer_purchase_intents WHERE review_id='88888888-8888-4888-8888-888888888888'")
[[ "$count" == 1 ]]

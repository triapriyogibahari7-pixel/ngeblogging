import {runGroup} from './run-group.mjs';
runGroup("isolation",[
  "tests/domain-fetch-mutation-safety.test.mjs",
  "tests/domain-customer-auth.test.mjs",
  "tests/domain-worker-fetch.test.mjs",
  "tests/domain-checkout-site-guard.test.mjs",
  "tests/domain-order-site-handler.test.mjs"
]);

import {runGroup} from './run-group.mjs';
runGroup("checkout",[
  "tests/domain-checkout-client.test.mjs",
  "tests/domain-checkout-payment-contract.test.mjs",
  "tests/domain-checkout-site-guard.test.mjs",
  "tests/domain-customer-purchase-intent.test.mjs",
  "tests/domain-purchase-site-context.test.mjs"
]);

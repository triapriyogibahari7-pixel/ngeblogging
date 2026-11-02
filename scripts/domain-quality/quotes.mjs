import {runGroup} from './run-group.mjs';
runGroup("quotes",[
  "tests/domain-registrar-quote-router.test.mjs",
  "tests/domain-customer-price-check.test.mjs",
  "tests/domain-pricing-snapshot.test.mjs",
  "tests/domain-sale-price-policy.test.mjs",
  "tests/domain-money-conversion.test.mjs"
]);

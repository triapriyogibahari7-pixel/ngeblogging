import {runGroup} from './run-group.mjs';
runGroup("payments",[
  "tests/domain-payment-notification.test.mjs",
  "tests/domain-midtrans-margin25000.test.mjs",
  "tests/midtrans-hosted-checkout.test.mjs",
  "tests/midtrans-qris-core.test.mjs",
  "tests/midtrans-v4-token-recovery.test.mjs"
]);

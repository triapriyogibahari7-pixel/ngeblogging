import {runGroup} from './run-group.mjs';
runGroup("transfer",[
  "tests/domain-transfer-handler.test.mjs",
  "tests/domain-transfer-reconciliation.test.mjs",
  "tests/domain-transfer-supabase-adapter.test.mjs",
  "tests/domain-transfer-state.test.mjs",
  "tests/domain-transfer-confirmation.test.mjs"
]);

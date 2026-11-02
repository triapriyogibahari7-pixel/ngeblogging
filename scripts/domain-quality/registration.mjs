import {runGroup} from './run-group.mjs';
runGroup("registration",[
  "tests/domain-registration-orchestration.test.mjs",
  "tests/domain-registration-response-validation.test.mjs",
  "tests/domain-registration-stale-observation.test.mjs",
  "tests/domain-worker-registration-single-attempt.test.mjs"
]);

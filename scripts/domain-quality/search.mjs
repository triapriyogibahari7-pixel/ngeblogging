import {runGroup} from './run-group.mjs';
runGroup("search",[
  "tests/domain-search-configuration-preflight.test.mjs",
  "tests/domain-search-wrangler-config.test.mjs",
  "tests/domain-customer-search-endpoint.test.mjs",
  "tests/domain-customer-suggestions.test.mjs",
  "tests/registrar-search-keyword.test.mjs"
]);

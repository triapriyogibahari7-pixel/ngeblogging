import {runGroup} from './run-group.mjs';
runGroup("dns",[
  "tests/domain-dns-v67.test.mjs",
  "tests/cloudflare-full-zone-provider.test.mjs",
  "tests/domain-nameserver-controller.test.mjs",
  "tests/domain-nameserver-poll.test.mjs",
  "tests/domain-handler-full-zone-rls.test.mjs"
]);

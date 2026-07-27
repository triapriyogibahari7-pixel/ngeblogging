import test from "node:test";
import assert from "node:assert/strict";
import {
  addressSetsOverlap,
  buildDomainDnsContract,
  cnameAnswerMatches,
  normalizeDomainHostname,
} from "../server/domain-dns-v67-contract.mjs";

test("domain onboarding emits exactly two branded CNAME records", () => {
  const contract = buildDomainDnsContract("Example.COM", "abcdef0123456789abcdef0123456789");
  assert.equal(contract.records.length, 2);
  assert.deepEqual(contract.records.map((record) => record.type), ["CNAME", "CNAME"]);
  assert.equal(contract.records[0].value, "connect.ngeblogging.com");
  assert.equal(contract.records[1].name, "_ngeblogging.example.com");
  assert.match(contract.records[1].value, /^verify-[a-z0-9]+\.ngeblogging\.com$/);
  assert.equal(new Set(contract.records.map((record) => record.value)).size, 2);
});

test("verification target is stable per token and unique across tokens", () => {
  const first = buildDomainDnsContract("example.com", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const same = buildDomainDnsContract("example.com", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const other = buildDomainDnsContract("example.com", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(first.verificationTarget, same.verificationTarget);
  assert.notEqual(first.verificationTarget, other.verificationTarget);
});

test("hostname normalization rejects paths and managed free domains", () => {
  assert.equal(normalizeDomainHostname("https://Blog.Example.com"), "blog.example.com");
  assert.throws(() => normalizeDomainHostname("example.com/path"), /domain saja/i);
  assert.throws(() => normalizeDomainHostname("demo.ngeblogging.com"), /subdomain gratis/i);
});

test("DNS matching accepts exact CNAME and flattened address overlap", () => {
  assert.equal(cnameAnswerMatches([{ type: 5, data: "connect.ngeblogging.com." }], "connect.ngeblogging.com"), true);
  assert.equal(addressSetsOverlap(new Set(["192.0.2.1"]), new Set(["192.0.2.1", "192.0.2.2"])), true);
  assert.equal(addressSetsOverlap(new Set(["192.0.2.1"]), new Set(["192.0.2.2"])), false);
});

import {Resolver} from 'node:dns/promises';
import {isIP} from 'node:net';
import {TARGET_NAMESERVERS} from './ngeblogging-full-zone-foundation.mjs';

export async function inspectNameserverAddresses({lookup} = {}) {
  const resolver = new Resolver({timeout:2000, tries:1});
  const read = lookup || ((name, family) => family === 4 ? resolver.resolve4(name) : resolver.resolve6(name));
  const nameservers = await Promise.all(TARGET_NAMESERVERS.map(async hostname => {
    const addresses = [], errors = [];
    for (const family of [4, 6]) {
      try {
        const values = await read(hostname, family);
        if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || isIP(value) !== family)) throw Object.assign(new Error('INVALID_ADDRESS_RESULT'), {code:'INVALID_ADDRESS_RESULT'});
        addresses.push(...values);
      } catch (error) {
        errors.push({family, code:String(error?.code || 'DNS_LOOKUP_FAILED').slice(0,80)});
      }
    }
    return {hostname, addresses:[...new Set(addresses)], errors};
  }));
  const sharedAddresses = nameservers[0].addresses.filter(value => nameservers[1].addresses.includes(value));
  const blockers = [];
  if (nameservers.some(ns => ns.addresses.length === 0)) blockers.push('NAMESERVER_ADDRESS_UNRESOLVED');
  if (sharedAddresses.length) blockers.push('NAMESERVER_ADDRESSES_OVERLAP');
  return {check:'recursive-address-resolution-only', nameservers, sharedAddresses, blockers, authoritativeDnsVerified:false, udp53Verified:false, tcp53Verified:false, networkDiversityVerified:false, zoneConsistencyVerified:false, gatewayVerified:false, productionReady:false, migrationAllowed:false};
}

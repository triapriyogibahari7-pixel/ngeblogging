import test from 'node:test';
import assert from 'node:assert/strict';
import {planDomainActivationRecovery as plan} from '../server/domain-activation-recovery-plan.mjs';
const accountId='a'.repeat(32),zoneId='b'.repeat(32),now=Date.parse('2026-11-06T10:00:00Z');
function input(name='example.com'){const ns=['first.ns.cloudflare.com','second.ns.cloudflare.com'];return {accountId,now,domain:{hostname:name,provider:'cloudflare-full-zone',provider_hostname_id:zoneId,status:'verifying'},zone:{id:zoneId,name,type:'full',account:{id:accountId},status:'pending',paused:false,name_servers:ns},dns:{hostname:name,zoneName:name,checkedAt:new Date(now).toISOString(),checks:['cloudflare-dns.com','dns.google'].map(resolver=>({resolver,ns:{state:'resolved',answers:ns.map(value=>value+'.')}}))}};}
test('matching fresh nameservers only offer a check, never production activation',()=>{const r=plan(input());assert.equal(r.action,'offer_activation_check');assert.equal(r.activationCheckAllowed,true);assert.equal(r.productionChangeAllowed,false);assert.equal(r.publicSiteVerified,false);});
test('works for different customer domains without hardcoding',()=>{assert.equal(plan(input('another.example.net')).activationCheckAllowed,true);});
test('unavailable DNS cannot authorize activation',()=>{const i=input();i.dns.checks[0].ns={state:'unavailable',answers:[]};assert.equal(plan(i).activationCheckAllowed,false);assert.equal(plan(i).action,'check_dns');});
test('wrong nameservers request registrar correction, not a check',()=>{const i=input();i.dns.checks[0].ns.answers=['wrong.example.net'];assert.equal(plan(i).action,'update_registrar_nameservers');assert.equal(plan(i).activationCheckAllowed,false);});
test('stale evidence fails closed',()=>{const i=input();i.dns.checkedAt=new Date(now-300001).toISOString();assert.equal(plan(i).action,'check_dns');});
test('duplicate resolver evidence fails closed',()=>{const i=input();i.dns.checks[1].resolver=i.dns.checks[0].resolver;assert.equal(plan(i).reason,'DNS_RESOLVERS_UNVERIFIED');});
test('cross-account zone and deletion state are blocked',()=>{const i=input();i.zone.account.id='c'.repeat(32);assert.equal(plan(i).action,'blocked');const j=input();j.domain.status='pending_deletion';assert.equal(plan(j).action,'blocked');});
test('active zones require routing verification rather than activation checks',()=>{const i=input();i.zone.status='active';assert.equal(plan(i).action,'verify_worker_routing');assert.equal(plan(i).activationCheckAllowed,false);});

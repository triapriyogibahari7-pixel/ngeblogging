import test from 'node:test';
import assert from 'node:assert/strict';
import {canPollNameservers,nextNameserverPoll,NAMESERVER_POLL_LIMIT} from '../src/domain-nameserver-poll.mjs';
const pending={hostname:'customer.example',status:'Verifikasi nameserver',nameservers:[]};
test('pending domain without assigned nameservers can poll',()=>assert.equal(canPollNameservers(pending),true));
test('real assigned nameservers stop automatic polling',()=>assert.equal(canPollNameservers({...pending,nameservers:['one.ns.example','two.ns.example']}),false));
test('busy, active, failed, deletion, attention and missing domains do not poll',()=>{assert.equal(canPollNameservers(pending,true),false);for(const status of ['Aktif','Gagal','Menunggu pelepasan hapus','Perlu perhatian'])assert.equal(canPollNameservers({...pending,status}),false);assert.equal(canPollNameservers(null),false);});
test('poll budget ends after eight attempts',()=>{let count=0;while(nextNameserverPoll(count)){const next=nextNameserverPoll(count);assert.ok(next.delay>=3500&&next.delay<=15000);count=next.count;}assert.equal(count,NAMESERVER_POLL_LIMIT);});
test('invalid counters do not bypass the limit',()=>{for(const value of [-1,NaN,Infinity,0.5,9])assert.equal(nextNameserverPoll(value),null);});

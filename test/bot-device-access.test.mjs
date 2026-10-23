import test from 'node:test';
import assert from 'node:assert/strict';
import {readDeviceAccess,saveDeviceAccess,forgetDeviceAccess} from '../assets/bot-device-access.mjs';
function memory(){const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}
test('remembered access expires after seven days and is removed',()=>{
  const store=memory();assert.equal(saveDeviceAccess(store,'test-code',1000),true);
  assert.equal(readDeviceAccess(store,1001),'test-code');
  assert.equal(readDeviceAccess(store,1000+7*86400000),'');
  assert.equal(readDeviceAccess(store,1001),'');
});
test('logout forgets access and blocked storage never breaks login',()=>{
  const store=memory();saveDeviceAccess(store,'test-code');forgetDeviceAccess(store);
  assert.equal(readDeviceAccess(store),'');assert.equal(saveDeviceAccess(undefined,'test-code'),false);
  assert.equal(readDeviceAccess(undefined),'');assert.doesNotThrow(()=>forgetDeviceAccess(undefined));
});

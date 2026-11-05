import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LineDecoder,normalize,type RainEvent} from '../src/serial/protocol.ts';
import {initial,reduceEvent} from '../src/serial/session.ts';
test('split chunks, CRLF, malformed lines, multiple packets and repeated same pitch',()=>{
  const events:RainEvent[]=[],logs:string[]=[];const d=new LineDecoder(e=>events.push(e),e=>logs.push(e));
  d.push('{"event":"tri');d.push('gger","actual":3}\r\ninvalid\n{"event":"trigger","actual":3}\n');
  assert.deepEqual(events.map(e=>e.actual),[3,3]);assert.equal(logs.length,1);
});
test('dedupe explicit identifiers but never firmware chart id or actual pitch',()=>{
  const events:RainEvent[]=[];const d=new LineDecoder(e=>events.push(e),()=>{});
  d.push('{"event":"trigger","actual":2,"t":10,"id":-1}\n'.repeat(2));
  d.push('{"event":"trigger","actual":2,"t":11,"id":-1}\n');
  assert.equal(events.length,2);
});
test('invalid and oversized lines recover on newline',()=>{
  const events:RainEvent[]=[];const d=new LineDecoder(e=>events.push(e),()=>{});
  d.push('x'.repeat(9000));d.push('\n{"event":"sound","sound":45}\n');
  assert.equal(events.length,1);assert.equal(normalize({event:'trigger',actual:9}),null);
  assert.equal(normalize({event:'trigger',actual:'3'}),null);
});
test('legacy diagnostic SOUND uses relative input; distance never triggers piano',()=>{
  assert.equal(normalize({event:'SOUND',relative:22,pp:44,actual:7})?.sound,22);
  assert.equal(normalize({event:'DISTANCE',note:5}),null);
  assert.equal(normalize({event:'hit',actual:3,target:5})?.type,'hit');
});
test('hardware phase preempts selection and unknown scores remain unknown',()=>{
  let s=reduceEvent(initial,{type:'song',song:2});assert.equal(s.phase,'SONG_SELECT');assert.equal(s.score,null);
  s=reduceEvent(s,{type:'state',phase:'PLAYING'});assert.equal(s.phase,'PLAYING');
  s=reduceEvent(s,{type:'early',score:-3,combo:0});assert.equal(s.score,-3);
});
test('END latches once; late status cannot replace final score',()=>{
  let s=reduceEvent(initial,{type:'song',song:1});s=reduceEvent(s,{type:'end',score:18,bestCombo:8});
  assert.equal(s.phase,'RESULT');assert.equal(s.bestCombo,8);
  assert.equal(reduceEvent(s,{type:'end',score:99}),s);
  assert.equal(reduceEvent(s,{type:'status',phase:'WAITING',score:0}),s);
});
test('judgments alone never manufacture points and missing combo stays missing',()=>{
  const s=reduceEvent(initial,{type:'song',song:3});assert.equal(reduceEvent(s,{type:'hit'}).score,null);
  assert.equal(reduceEvent(s,{type:'miss'}).combo,null);
});
test('the next audience can choose the same song while the previous result is visible',()=>{
  let s=reduceEvent(initial,{type:'song',song:2});s=reduceEvent(s,{type:'end',score:18});
  const next=reduceEvent(s,{type:'song',song:2});assert.equal(next.phase,'SONG_SELECT');assert.equal(next.score,null);assert.ok(next.run>s.run);
});

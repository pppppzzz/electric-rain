const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
function runtime(extra = {}) {
  const context = vm.createContext({window:{},...extra});
  for (const file of ['data.js','serial/config.js','serial/scoring.js','serial/text-v32.js','serial/protocol.js','serial/session.js','controller.js','i18n.js']) {
    vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
  }
  return context.window.ElectricRain;
}
test('full scores match the actual digit counts in the supplied Songs.h',()=>{
  const E=runtime();
  const source=fs.readFileSync(path.resolve(base,'../../arduino/InteractivePiano_v3.2_550-700_130-200ms_2026-11-05/InteractivePiano/Songs.h'),'utf8');
  const charts=[...source.matchAll(/const char\s+(\w+)\[\]\s+PROGMEM\s*=\s*([\s\S]*?);/g)];
  assert.equal(charts.length,3);
  charts.forEach((chart,i)=>{
    const notes=[...chart[2].matchAll(/"([^"]*)"/g)].map(m=>m[1]).join('').match(/[1-8]/g).length;
    assert.equal(E.songNoteCounts[i],notes);assert.equal(E.scoreProgress(i+1,0).maximum,notes*3);
  });
  assert.equal([1,2,3].map(id=>E.scoreProgress(id,0).maximum).join(','),'120,132,210');
});
test('result progress supports zero, partial, full and unknown-song scores',()=>{
  const E=runtime();assert.equal(E.scoreProgress(null,0),null);
  assert.equal(E.scoreProgress(1,0).percent,0);assert.equal(E.scoreProgress(1,0).remaining,120);
  assert.equal(E.scoreProgress(2,66).percent,50);assert.equal(E.scoreProgress(2,66).remaining,66);
  assert.equal(E.scoreProgress(3,210).percent,100);assert.equal(E.scoreProgress(3,210).remaining,0);
  const c=new E.Controller();c.receive({type:'song',song:1},'HARDWARE');c.receive({type:'hit',score:123},'HARDWARE');
  assert.equal(E.scoreProgress(1,c.state.score).percent,100);assert.equal(c.state.score,123);
});
test('real text score starts at zero, hit +3, yellow/red -1, no double-counted verdicts',()=>{
  const E=runtime(), c=new E.Controller(), d=new E.LineDecoder(e=>c.receive(e,'HARDWARE'),()=>{});
  const send=line=>d.push(line+'\r\n');
  assert.equal(c.state.score,0);send('Selected: Mo Li Hua');assert.equal(c.state.score,0);
  send('PRESS mm=65 key=3');assert.equal(c.state.score,0);send('GREEN HIT event=0');assert.equal(c.state.score,3);
  send('GREEN HIT event=0');assert.equal(c.state.score,3);send('GREEN HIT event=1');assert.equal(c.state.score,6);
  assert.equal(c.state.combo,2);send('PRESS mm=58 key=2');send('YELLOW EARLY/WRONG event=-1');assert.equal(c.state.score,5);
  send('YELLOW EARLY/WRONG event=-1');assert.equal(c.state.score,5);assert.equal(c.state.combo,0);
  send('RED MISS event=2');send('RED MISS event=2');assert.equal(c.state.score,4);
  send('GREEN HIT event=3');assert.equal(c.state.score,7);assert.equal(c.state.bestCombo,2);
  send('Song finished. Quiet pause, then recalibrate and blow again.');assert.equal(c.state.score,7);assert.equal(c.state.phase,'RESULT');
  send('Song finished. Quiet pause, then recalibrate and blow again.');assert.equal(c.state.score,7);
  send('Keep quiet for 2 seconds: calibrating microphone.');assert.equal(c.state.score,7);
  send('Selected: Mo Li Hua');assert.equal(c.state.score,0);assert.equal(c.state.bestCombo,0);
});
test('floor zero, each new yellow press counts once, and diagnostics never score',()=>{
  const E=runtime(),c=new E.Controller(),d=new E.LineDecoder(e=>c.receive(e,'HARDWARE'),()=>{});
  d.push('Selected: Jingle Bells\nRED MISS event=0\n');assert.equal(c.state.score,0);
  d.push('GREEN HIT event=1\n');assert.equal(c.state.score,3);
  for(let i=0;i<5;i++)d.push('PRESS mm=58 key=2\nYELLOW EARLY/WRONG event=-1\n');
  assert.equal(c.state.score,0);
  d.push('LED TEST: red, yellow, green; 1 second each.\nGREEN HIT event=2\nPRESS mm=58 key=2\n');assert.equal(c.state.score,0);
});
test('JSON score remains authoritative and never receives a second local hit bonus',()=>{
  const E=runtime(),c=new E.Controller(),d=new E.LineDecoder(e=>c.receive(e,'HARDWARE'),()=>{});
  d.push('{"event":"song","song":1}\n{"event":"hit","score":12,"combo":4}\n');
  assert.equal(c.state.score,12);assert.equal(c.state.bestCombo,4);
  d.push('{"event":"early","score":-1,"combo":0}\n');assert.equal(c.state.score,0);
});
test('full simulated fixture totals 28 and combo 6, then resets with mode isolation',()=>{
  const E=runtime(),c=new E.Controller();c.setMode('SIMULATION');c.receive({type:'song',song:3},'SIMULATION');
  for(let i=0;i<12;i++)c.receive({type:i===3?'early':i===5?'miss':'hit'},'SIMULATION');
  c.receive({type:'end'},'SIMULATION');assert.equal(c.state.score,28);assert.equal(c.state.bestCombo,6);
  c.receive({type:'hit',score:999},'HARDWARE');assert.equal(c.state.score,28);
  c.setMode('HARDWARE');assert.equal(c.state.score,0);assert.equal(c.state.bestCombo,0);
});
test('both dictionaries cover all declared UI keys and switching preserves active scores',()=>{
  const E=runtime(),html=fs.readFileSync(path.resolve(base,'../../index.html'),'utf8');
  const keys=[...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m=>m[1]);
  const c=new E.Controller();c.receive({type:'song',song:2},'HARDWARE');c.receive({type:'hit',score:6,combo:2},'HARDWARE');
  for(const lang of ['zh','en']){
    E.i18n.set(lang);for(const key of keys)assert.notEqual(E.i18n.t(key),key,`${lang}:${key}`);
    assert.equal(c.state.score,6);assert.equal(c.state.song,2);
  }
  E.i18n.set('zh');assert.equal(E.i18n.song(1),'茉莉花');E.i18n.set('en');assert.equal(E.i18n.song(3),'Doll and Bear Dance');
});
test('language preference is stored and restored; file storage denial is harmless',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  let E=runtime({localStorage:storage});assert.equal(E.i18n.language,'zh');E.i18n.set('en');
  E=runtime({localStorage:storage});assert.equal(E.i18n.language,'en');
  E=runtime({localStorage:{getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}}});
  E.i18n.set('en');assert.equal(E.i18n.language,'en');
});

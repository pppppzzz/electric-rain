const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
function runtime(extra = {}) {
  const context = vm.createContext({window:{},navigator:{},TextDecoder,TextEncoder,ReadableStream,WritableStream,...extra});
  for (const name of ['data.js','serial/config.js','serial/scoring.js','serial/text-v32.js','serial/protocol.js','serial/session.js','controller.js','serial/transport.js','audio/piano.js','i18n.js']) {
    vm.runInContext(fs.readFileSync(path.join(base, name), 'utf8'), context, {filename:name});
  }
  return {E:context.window.ElectricRain,context};
}
test('root HTML has only existing relative classic-script and CSS resources', () => {
  const root = path.resolve(base,'../..'), html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(value => !value.startsWith('data:'));
  assert.ok(resources.length >= 9);
  for (const resource of resources) { assert.ok(!/^(https?:|\/)/.test(resource)); assert.ok(fs.existsSync(path.join(root,resource)),resource); }
  assert.ok(!/type="module"|\.tsx|cdn\./.test(html));
});
test('v3.2 real text dialect runs all phases with verdict scores and no guessed start', () => {
  const {E}=runtime(), notes=[], controller=new E.Controller({trigger:n=>notes.push(n)});
  const decoder=new E.LineDecoder(e=>controller.receive(e,'HARDWARE'),()=>{});
  decoder.push('Keep quiet for 2 seconds: calibrating microphone.\r\nBlow strength=601\r\nSelected: Jingle ');
  decoder.push('Bells\r\nMicrophone locked. Play when blocks reach the bottom. r = restart.\r\n');
  assert.equal(controller.state.phase,'SONG_SELECT');assert.equal(controller.state.song,2);
  decoder.push('Sonar raw mm=66 target key=3 stable key=2\r\n');
  assert.equal(controller.state.phase,'PLAYING');assert.equal(notes.length,0);
  decoder.push('PRESS mm=65 key=3\r\nYELLOW EARLY/WRONG event=-1\r\nPRESS mm=65 key=3\r\nGREEN HIT event=12\r\nRED MISS event=13\r\n');
  assert.equal(notes.join(','),'3,3');assert.equal(controller.state.score,2);assert.equal(controller.state.combo,0);
  decoder.push('Song finished. Quiet pause, then recalibrate and blow again.\r\n'.repeat(2));
  assert.equal(controller.state.phase,'RESULT');assert.equal(controller.state.bestCombo,1);
  decoder.push('Keep quiet for 2 seconds: calibrating microphone.\r\n');assert.equal(controller.state.phase,'RESULT');
  decoder.push('Selected: Jingle Bells\r\n');assert.equal(controller.state.phase,'SONG_SELECT');
});
test('v3.2 suppresses diagnostic/mid-round presses, dedupes verdicts, preserves live repeated notes', () => {
  const {E}=runtime(), events=[], decoder=new E.LineDecoder(e=>events.push(e),()=>{});
  decoder.push('PRESS mm=58 key=2\nMATRIX commands sent (no readback). Expect falling blocks.\nPRESS mm=58 key=2\n');
  assert.equal(events.filter(e=>e.type==='trigger').length,0);
  decoder.push('Selected: Mo Li Hua\nPRESS mm=58 key=2\nPRESS mm=58 key=2\nGREEN HIT event=3\nGREEN HIT event=3\nRED MISS event=3\nYELLOW EARLY/WRONG event=-1\n');
  assert.equal(events.filter(e=>e.type==='trigger').length,2);
  assert.equal(events.filter(e=>e.type==='hit').length,1);assert.equal(events.filter(e=>e.type==='miss').length,0);
  assert.equal(events.at(-1).type,'wrong');assert.equal(events.some(e=>e.type==='early'),false);
  decoder.reset();decoder.push('PRESS mm=58 key=2\n');assert.equal(events.filter(e=>e.type==='trigger').length,2);
});
test('v3.2 retry messages, no-echo playing evidence and all exact song aliases', () => {
  const {E}=runtime(),events=[],decoder=new E.LineDecoder(e=>events.push(e),()=>{});
  for (const [name,id] of [['Mo Li Hua',1],['Jingle Bells',2],['Doll and Bear Dance',3]]) {
    decoder.push(`Selected: ${name}\n`);assert.equal(events.at(-1).song,id);
    decoder.push('Sonar: NO ECHO. Check Trig=D6, Echo=D7, 5V, GND.\n');assert.equal(events.at(-1).phase,'PLAYING');
  }
  decoder.push('Below 550: no song selected. Blow harder and try again.\n');assert.equal(events.at(-1).phase,'WAITING');
  decoder.push('Above 700: no song selected. Blow more gently and try again.\n');assert.equal(events.at(-1).phase,'WAITING');
  assert.equal(events.some(e=>e.type==='trigger'),false);
});
test('split UTF-8 lines, CRLF, repeated pitch and invalid/oversized input recover', () => {
  const {E} = runtime(), events = [], logs = [];
  const decoder = new E.LineDecoder(e => events.push(e), message => logs.push(message));
  decoder.push('{"event":"tri');decoder.push('gger","actual":3}\r\nBAD\n{"event":"trigger","actual":3}\n');
  decoder.push('x'.repeat(9000));decoder.push('\n{"event":"sound","sound":42}\n');
  assert.equal(events.map(e => e.type).join(','),'trigger,trigger,sound');
  assert.equal(logs.length,2);assert.equal(E.normalize({event:'trigger',actual:9}),null);
});
test('dedupe unique packets, not chart ids or repeated actual notes', () => {
  const {E} = runtime(), events = [], decoder = new E.LineDecoder(e => events.push(e), () => {});
  decoder.push('{"event":"trigger","actual":2,"t":10,"id":-1}\n'.repeat(2));
  decoder.push('{"event":"trigger","actual":2,"t":11,"id":-1}\n');
  assert.equal(events.length,2);
  decoder.reset();decoder.push('{"event":"trigger","actual":2,"t":10,"id":-1}\n');assert.equal(events.length,3);
});
test('only accepted actual triggers sound: never sound telemetry, target, hit, early or miss', () => {
  const {E} = runtime(), notes = [], c = new E.Controller({trigger:actual => notes.push(actual)});
  c.setMode('SIMULATION');
  c.receive({type:'song',song:2},'SIMULATION');
  c.receive({type:'trigger',actual:3,target:5},'SIMULATION');
  c.receive({type:'trigger',actual:3},'SIMULATION');
  for (const type of ['hit','early','wrong','miss','sound']) c.receive({type,actual:5,sound:80},'SIMULATION');
  assert.equal(notes.join(','),'3,3');assert.equal(c.state.score,0);
});
test('hardware and simulation data cannot mix; switching mode clears scores', () => {
  const {E} = runtime(), notes = [], c = new E.Controller({trigger:actual => notes.push(actual)});
  assert.equal(c.receive({type:'song',song:1},'SIMULATION'),false);
  c.receive({type:'song',song:1},'HARDWARE');c.receive({type:'hit',score:12,combo:4},'HARDWARE');
  c.receive({type:'trigger',actual:6,score:999},'SIMULATION');assert.equal(c.state.score,12);assert.equal(notes.length,0);
  c.setMode('SIMULATION');assert.equal(c.state.score,0);assert.equal(c.state.phase,'WAITING');
  assert.equal(c.receive({type:'end',score:999},'HARDWARE'),false);
});
test('three exact track names, hardware state priority, minimum-zero scores and end latch', () => {
  const {E} = runtime();assert.equal(Array.from(E.songs).join('|'),'Jasmine Flower|Jingle Bells|Doll and Bear Dance');
  for (let song=1;song<=3;song++) {
    const c = new E.Controller();c.receive({type:'song',song},'HARDWARE');assert.equal(c.state.phase,'SONG_SELECT');
    c.receive({type:'state',phase:'PLAYING'},'HARDWARE');assert.equal(c.state.phase,'PLAYING');
    c.receive({type:'early',score:-3,combo:0},'HARDWARE');assert.equal(c.state.score,0);
    c.receive({type:'end',score:18,bestCombo:8},'HARDWARE');assert.equal(c.state.phase,'RESULT');
    c.receive({type:'end',score:999},'HARDWARE');c.receive({type:'status',phase:'WAITING',score:0},'HARDWARE');assert.equal(c.state.score,18);
    c.receive({type:'song',song},'HARDWARE');assert.equal(c.state.phase,'SONG_SELECT');assert.equal(c.state.score,0);
    c.home();assert.equal(c.state.phase,'WAITING');assert.equal(c.state.bestCombo,0);
  }
});
test('legacy sensor samples do not become trigger events', () => {
  const {E} = runtime();assert.equal(E.normalize({event:'SOUND',relative:22,pp:44})?.sound,22);
  assert.equal(E.normalize({event:'DISTANCE',note:5}),null);
  assert.equal(E.normalize({event:'state',phase:'SELECTED',song:2})?.phase,'SONG_SELECT');
});
test('transport receives multibyte chunks, disconnects and reconnects without stale parser data', async () => {
  let input,opens=0,closes=0;const writes=[],events=[],statuses=[];
  const port={readable:null,writable:null,async open(){opens++;this.readable=new ReadableStream({start(c){input=c;}});this.writable=new WritableStream({write(data){writes.push(new TextDecoder().decode(data));}});},async close(){closes++;}};
  const {E}=runtime({navigator:{serial:{async requestPort(){return port;}}}});
  const serial=new E.SerialTransport(e=>events.push(e),s=>statuses.push(s),()=>{});
  await serial.connect();
  const bytes=new TextEncoder().encode('{"event":"trigger","actual":3,"title":"雨"}\n');
  input.enqueue(bytes.slice(0,bytes.length-4));input.enqueue(bytes.slice(bytes.length-4));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(events.length,1);
  await serial.requestStart();assert.equal(writes.length,0);
  E.serialConfig.startCommand='START\n';await serial.requestStart();assert.equal(writes[0],'START\n');
  input.enqueue(new TextEncoder().encode('{"event":"unfinished'));await serial.disconnect();assert.equal(serial.connected,false);
  await serial.connect();input.enqueue(new TextEncoder().encode('{"event":"trigger","actual":3}\n'));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(events.length,2);
  await serial.disconnect();assert.equal(opens,2);assert.equal(closes,2);assert.equal(statuses.at(-1),'Disconnected');
});
test('unavailable serial API gives the optional no-npm launcher instruction', async () => {
  const {E}=runtime();const serial=new E.SerialTransport(()=>{},()=>{},()=>{});
  await assert.rejects(serial.connect(),/Start Hardware\.cmd/);
});
test('piano retriggers each note, plays all eight pitches, and clears active voices', async () => {
  let starts=0,stops=0;const frequencies=[];
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
  class MockAudioContext {
    state='suspended';currentTime=0;destination={};
    async resume(){this.state='running';this.onstatechange?.();}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createBiquadFilter(){return {frequency:param(),connect(){},disconnect(){}};}
    createOscillator(){const f=param();return {frequency:f,connect(){},disconnect(){},start(){starts++;frequencies.push(f.value);},stop(){stops++;}};}
  }
  const {E}=runtime({AudioContext:MockAudioContext}),piano=new E.Piano();
  assert.equal(piano.play(1),false);await piano.unlock();
  for(let i=1;i<=8;i++)assert.equal(piano.play(i),true);
  piano.play(3);piano.play(3);assert.equal(starts,60);assert.equal(frequencies[12],frequencies[48]);
  assert.equal(piano.play(9),false);piano.clear();assert.equal(piano.voices.size,0);assert.equal(stops,120);
});

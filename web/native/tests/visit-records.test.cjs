const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({window:{ElectricRain:{}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../visit-records.js'),'utf8'),context);
const Records = context.window.ElectricRain.VisitRecords;
const completed = (score,song=1)=>({phase:'RESULT',ended:true,score,song});
test('highest completed round survives return/new rounds but ignores incomplete and lower scores',()=>{
  const records = new Records(null);
  assert.equal(records.best('HARDWARE').score,0);
  assert.equal(records.record('HARDWARE',{...completed(90),phase:'PLAYING',ended:false}),false);
  records.record('HARDWARE',completed(12));records.record('HARDWARE',completed(9));
  assert.equal(records.best('HARDWARE').score,12);
  records.record('HARDWARE',completed(28,3));assert.equal(records.best('HARDWARE').score,28);assert.equal(records.best('HARDWARE').song,3);
  records.record('HARDWARE',completed(28,2));assert.equal(records.best('HARDWARE').song,3);
});
test('refresh restores this tab while a new storage session starts at zero',()=>{
  const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  new Records(storage).record('HARDWARE',completed(30,2));
  assert.equal(new Records(storage).best('HARDWARE').score,30);
  assert.equal(new Records({getItem:()=>null,setItem(){}}).best('HARDWARE').score,0);
});
test('demo records cannot replace real records and returned values cannot mutate records',()=>{
  const records=new Records(null);records.record('SIMULATION',completed(28,3));records.record('HARDWARE',completed(3));
  assert.equal(records.best('HARDWARE').score,3);assert.equal(records.best('SIMULATION').score,28);
  records.best('HARDWARE').score=999;assert.equal(records.best('HARDWARE').score,3);
});
test('malformed/blocked storage and invalid events remain safe',()=>{
  const invalid=new Records({getItem:()=>'{broken',setItem(){throw new Error('blocked');}});
  assert.equal(invalid.record('HARDWARE',completed(6)),true);assert.equal(invalid.best('HARDWARE').score,6);
  for(const state of [completed(-1),completed(NaN),completed(5,9),{...completed(5),ended:false}])assert.equal(invalid.record('HARDWARE',state),false);
  const denied=new Records({getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}});
  assert.equal(denied.record('SIMULATION',completed(0)),true);
});

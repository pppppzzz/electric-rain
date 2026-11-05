import {serialConfig} from './config.ts';
export type Phase = 'WAITING'|'SONG_SELECT'|'PLAYING'|'RESULT';
export type RainEvent = {type:string; phase?:Phase; song?:number; actual?:number; score?:number; combo?:number; bestCombo?:number; sound?:number};
const numeric = (v:unknown):number|undefined => typeof v==='number' && Number.isFinite(v) ? v : undefined;
export function normalize(raw:unknown):RainEvent|null {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return null;
  const r=raw as Record<string,unknown>, f=serialConfig.fields;
  if(typeof r[f.event]!=='string') return null;
  const type=(r[f.event] as string).toLowerCase();
  if(!['sound','song','state','status','trigger','hit','early','miss','wrong','end'].includes(type)) return null;
  const e:RainEvent={type};
  const phases:Record<string,Phase>={WAITING:'WAITING',LISTENING:'WAITING',SELECTED:'SONG_SELECT',SONG_SELECT:'SONG_SELECT',PLAYING:'PLAYING',RESULT:'RESULT'};
  // FINISHING is not an END: preserve the last scene until actual end arrives.
  if(typeof r[f.phase]==='string') e.phase=phases[(r[f.phase] as string).toUpperCase()];
  const song=numeric(r[f.song]); if(song && Number.isInteger(song)&&song>=1&&song<=3)e.song=song;
  const actual=numeric(r[f.actual]); if(actual && Number.isInteger(actual)&&actual>=1&&actual<=8)e.actual=actual;
  for(const key of ['score','combo','bestCombo'] as const) e[key]=numeric(r[f[key]]);
  e.sound=numeric(r.relative)??numeric(r[f.sound]);
  if(type==='trigger'&&!e.actual || type==='song'&&!e.song || type==='sound'&&e.sound===undefined)return null;
  return e;
}
export class LineDecoder {
  private buffer=''; private dropping=false; private seen=new Set<string>();
  private emit:(e:RainEvent)=>void; private log:(s:string)=>void;
  constructor(emit:(e:RainEvent)=>void,log:(s:string)=>void){this.emit=emit;this.log=log;}
  reset(){this.buffer='';this.dropping=false;this.seen.clear();}
  push(chunk:string){
    for(const part of chunk.split(/(?<=\n)/)) {
      if(!this.dropping)this.buffer+=part;
      if(this.buffer.length>serialConfig.maxLineLength){this.buffer='';this.dropping=true;this.log('Oversized serial line ignored');}
      if(!part.endsWith('\n'))continue;
      if(this.dropping){this.dropping=false;continue;}
      const line=this.buffer.trim();this.buffer='';if(!line)continue;
      try {
        const raw=JSON.parse(line), e=normalize(raw);if(!e){this.log('Unsupported or invalid event ignored');continue;}
        // Firmware id is a chart-note index (often -1), NOT a unique event id.
        // Dedupe only explicit eventId/seq or timestamp + complete packet, never pitch.
        const token=raw.eventId!==undefined?`${e.type}:id:${raw.eventId}`:raw.seq!==undefined?`${e.type}:seq:${raw.seq}`:raw.t!==undefined?line:null;
        if(token&&this.seen.has(token))continue;
        if(token){this.seen.add(token);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value!);}
        this.emit(e);
      }catch{this.log('Malformed JSON ignored');}
    }
  }
}

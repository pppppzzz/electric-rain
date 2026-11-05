import type {Phase,RainEvent} from './protocol.ts';
export type Session={phase:Phase;song:number|null;score:number|null;combo:number|null;bestCombo:number|null;sound:number;ended:boolean;run:number};
export const initial:Session={phase:'WAITING',song:null,score:null,combo:null,bestCombo:null,sound:0,ended:false,run:0};
export function reduceEvent(s:Session,e:RainEvent):Session{
  if(e.type==='sound')return {...s,sound:e.sound??0};
  if(e.type==='song'){
    if(!e.song)return s;
    if(s.song===e.song&&s.phase!=='WAITING'&&!s.ended)return s;
    return {...initial,phase:'SONG_SELECT',song:e.song,run:s.run+1};
  }
  if(s.ended)return s;
  let next={...s};
  if(e.song)next.song=e.song;
  if(e.type==='state'||e.type==='status'){
    if(e.phase==='WAITING')return s.phase==='WAITING'?s:{...initial,run:s.run+1};
    if(e.phase==='SONG_SELECT'&&s.phase==='WAITING')next={...next,phase:'SONG_SELECT',run:s.run+1};
    if(e.phase==='PLAYING')next.phase='PLAYING';
  }
  // Triggers recover from a dropped STATE without buffering or delaying the note.
  if(e.type==='trigger' && (s.phase==='SONG_SELECT'||s.phase==='WAITING'))next.phase='PLAYING';
  if(e.type==='end') {if(s.phase==='WAITING')return s;next.phase='RESULT';next.ended=true;}
  if(next.phase!=='WAITING'){
    if(e.score!==undefined)next.score=e.score;
    if(e.combo!==undefined)next.combo=e.combo;
    if(e.bestCombo!==undefined)next.bestCombo=e.bestCombo;
  }
  return next;
}

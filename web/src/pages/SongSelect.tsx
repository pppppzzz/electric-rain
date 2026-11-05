import {useEffect,useState} from 'react';
import WindowBar from '../components/WindowBar';
import {songs} from '../data/songs';
export default function SongSelect({song}:{song:number|null}){
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{const start=performance.now();const t=setInterval(()=>setElapsed(performance.now()-start),90);return()=>clearInterval(t);},[]);
  const selected=elapsed>2350?(song? song-1:-1):Math.floor(elapsed/120)%3;
  return <section className={`window cd-player ${elapsed>3350?'settled':''}`} role="dialog" aria-label="Finding your track"><WindowBar title="CD Player — finding your rain"/><div className="cd-body"><div className="disc-wrap"><div className="disc"><div className="disc-label">ELECTRIC RAIN<br/><small>PERSONAL RECORDING · 01</small></div></div><span className="disc-caption">{elapsed>2350?'TRACK FOUND':'READING DISC . . .'}</span></div><div className="tracklist"><small>CAPTURED SOUND / SELECT TRACK</small>{songs.map((name,i)=><div className={selected===i?'track selected':'track'} key={name}><span className="track-box">{selected===i?'▪':''}</span><span>0{i+1} · {name}</span></div>)}<div className="readout">{elapsed>2350?(song?'READY · '+String(song).padStart(2,'0'):'WAITING FOR TRACK'):'SEEKING . . .'}<span>▰ ▰ ▰ ▱</span></div></div></div></section>;
}

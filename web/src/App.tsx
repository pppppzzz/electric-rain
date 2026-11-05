import {useEffect,useRef,useState} from 'react';
import WindowBar from './components/WindowBar';
import SongSelect from './pages/SongSelect';
import Rain,{type VisualEvent} from './animations/Rain';
import {Piano} from './audio/piano';
import {SerialTransport} from './serial/transport';
import {serialConfig} from './serial/config';
import {type RainEvent} from './serial/protocol';
import {initial,reduceEvent,type Session} from './serial/session';
import {songs,pitches} from './data/songs';
const format=(n:number|null,len=4)=>n===null?'— — —':(n<0?'-':'')+String(Math.abs(n)).padStart(len,'0');
const devEnabled=new URLSearchParams(location.search).get('dev')==='1';
export default function App(){
  const [session,setSession]=useState<Session>(initial), sessionRef=useRef(session);sessionRef.current=session;
  const [mode,setMode]=useState<'HARDWARE'|'SIMULATION'>('HARDWARE'),modeRef=useRef(mode);modeRef.current=mode;
  const [status,setStatus]=useState('Disconnected'),[busy,setBusy]=useState(false),[audioReady,setAudioReady]=useState(false),[error,setError]=useState('');
  const [visual,setVisual]=useState<VisualEvent[]>([]),[reset,setReset]=useState(0),[logs,setLogs]=useState<string[]>([]),[panel,setPanel]=useState(devEnabled),[simSong,setSimSong]=useState(1);
  const piano=useRef(new Piano()),serial=useRef<SerialTransport|null>(null),eventId=useRef(0),simTimers=useRef<ReturnType<typeof setTimeout>[]>([]),generation=useRef(0);
  const log=(message:string)=>setLogs(a=>[new Date().toLocaleTimeString()+' '+message,...a].slice(0,30));
  function clearTimers(){generation.current++;simTimers.current.forEach(clearTimeout);simTimers.current=[];}
  function returnHome(){clearTimers();piano.current.clear();sessionRef.current={...initial,run:sessionRef.current.run+1};setSession(sessionRef.current);setVisual([]);setReset(x=>x+1);}
  function receive(e:RainEvent,source:'HARDWARE'|'SIMULATION'){
    if(modeRef.current!==source)return;
    const s=sessionRef.current;
    if(!s.ended && e.type==='trigger'){
      if(!piano.current.play(e.actual!))setAudioReady(false);
    }
    if(!s.ended&&['trigger','hit','early','miss','wrong'].includes(e.type)){const v={id:++eventId.current,type:e.type,actual:e.actual};setVisual(events=>[...events,v].slice(-256));}
    // Ref is updated synchronously so a burst containing END twice cannot settle twice.
    const next=reduceEvent(s,e);sessionRef.current=next;setSession(next);
    if(e.type==='song'&&next!==s){piano.current.clear();setReset(x=>x+1);}
    if(!['sound','status'].includes(e.type))log(`${source} · ${e.type}${e.actual?' · '+pitches[e.actual-1]:''}`);
  }
  if(!serial.current)serial.current=new SerialTransport(e=>receive(e,'HARDWARE'),setStatus,log);
  useEffect(()=>()=>{clearTimers();void serial.current?.disconnect();piano.current.clear();},[]);
  useEffect(()=>{
    if(session.phase!=='SONG_SELECT')return;
    const timer=setTimeout(()=>{
      if(modeRef.current==='SIMULATION')receive({type:'state',phase:'PLAYING'},'SIMULATION');
      else void serial.current?.requestStart().catch(e=>{setError(String(e));log(String(e));});
    },3600);return()=>clearTimeout(timer);
  },[session.phase,session.run]);
  useEffect(()=>{if(session.phase!=='RESULT')return;const timer=setTimeout(returnHome,10000);return()=>clearTimeout(timer);},[session.phase]);
  const connected=status==='Connected';
  async function unlock(){try{await piano.current.unlock();setAudioReady(true);return true;}catch(e){setError(String(e));return false;}}
  async function connect(){setBusy(true);setError('');try{if(connected){await serial.current!.disconnect();returnHome();}else{if(!await unlock())return;clearTimers();modeRef.current='HARDWARE';setMode('HARDWARE');returnHome();await serial.current!.connect();}}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  async function simulation(){if(connected||busy)return;await unlock();modeRef.current='SIMULATION';setMode('SIMULATION');returnHome();}
  function demo(){if(modeRef.current!=='SIMULATION')return;returnHome();const gen=generation.current;const at=(ms:number,fn:()=>void)=>simTimers.current.push(setTimeout(()=>{if(gen===generation.current)fn();},ms));
    for(let i=0;i<12;i++)at(i*75,()=>receive({type:'sound',sound:i*8},'SIMULATION'));
    at(1000,()=>receive({type:'song',song:simSong},'SIMULATION'));
    // Scripted fixture values are external demo data, never the production scoring path.
    const notes=[3,3,5,1,8,4,2,6,7,5,3,1];
    notes.forEach((n,i)=>at(5000+i*750,()=>{
      if(i===5){receive({type:'miss',score:4,combo:0},'SIMULATION');return;}
      receive({type:'trigger',actual:n},'SIMULATION');
      at(25,()=>receive({type:i===3?'early':'hit',score:[1,2,3,2,4,4,5,6,7,8,9,10][i],combo:[1,2,3,0,1,0,1,2,3,4,5,6][i]},'SIMULATION'));
    }));at(15000,()=>receive({type:'end',score:10,bestCombo:6},'SIMULATION'));
  }
  const playing=session.phase==='PLAYING',title=playing?(session.song?songs[session.song-1]:'Awaiting track'): 'Electric Rain — Notepad';
  return <main><div className="desktop-meta"><span>ER / A SOUND AND WATER STUDY</span><span>EST. 2026</span></div><section className={`stage window phase-${session.phase.toLowerCase()}`} aria-label="Electric Rain installation"><WindowBar title={title}/><nav className="menubar"><div className="menu-labels"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>H</u>elp</span></div><div className="device"><span className="mode-label">{mode==='SIMULATION'?'SIMULATION':connected?'ARDUINO CONNECTED':'HARDWARE · OFFLINE'}</span><button onClick={connect} disabled={busy}>{busy?'Connecting…':connected?'Disconnect':'Connect'}</button></div></nav><div className="viewport"><div className="paper"/><Rain phase={session.phase} sound={session.sound} combo={session.combo??0} events={visual} reset={reset}/><div className="margin-line"/><div className="scrollbar"><span>▲</span><i/><span>▼</span></div>
    {(session.phase==='WAITING'||session.phase==='SONG_SELECT')&&<div className="cover"><span className="folio">FIELD NOTES / No. 001</span><h1>Electric Rain</h1><p className="subtitle">a little sound, a passing rain.</p><div className="invitation">Blow or Speak<span className={session.phase==='WAITING'?'cursor':'cursor frozen'}/></div><span className="waiting-caption">{mode==='SIMULATION'?'A SIMULATED RAIN SESSION':'WAITING FOR A SOUND TO BECOME A SONG'}</span><svg className="umbrella" viewBox="0 0 140 130" fill="none" aria-hidden="true"><path d="M12 64Q68 -10 128 64Q108 50 92 63Q71 49 53 63Q32 51 12 64ZM70 15Q46 36 53 63M70 15Q91 33 92 63M70 15V112Q68 132 52 119V110M70 9V16" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/></svg></div>}
    {playing&&<div className="playing-head"><div><small>NOW PLAYING / {session.song?`0${session.song}`:'—'}</small><h2>{session.song?songs[session.song-1]:'Awaiting track'}</h2></div><div className="scoreboard"><span>SCORE <b>{format(session.score)}</b></span><span>COMBO <b>{session.combo===null?'— —':`x${format(session.combo,2)}`}</b></span></div></div>}
    {session.phase==='SONG_SELECT'&&<SongSelect key={session.run} song={session.song}/>}
    {session.phase==='RESULT'&&<section className="window result" role="dialog" aria-modal="true" aria-labelledby="result-title"><WindowBar title="Electric Rain - Result"/><div className="result-paper"><p id="result-title">YOUR RAIN HAS ENDED.</p><div className="result-score"><span>FINAL SCORE</span><strong>{format(session.score)}</strong></div><div className="result-row"><span>BEST COMBO</span><b>{session.bestCombo===null?'— —':`x${format(session.bestCombo,2)}`}</b></div><div className="result-track"><small>TRACK</small><p>{session.song?songs[session.song-1]:'Awaiting track'}</p></div><button onClick={returnHome} autoFocus>Return</button><small className="return-hint">RETURNING TO THE RAIN IN A MOMENT</small></div></section>}
    {!audioReady&&(connected||mode==='SIMULATION')&&<button className="audio-enable" onClick={unlock}>Enable sound</button>}
    {error&&<div role="alert" className="error">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
    </div><footer className="statusbar"><span>{session.phase.replace('_',' ')}<i/> {mode==='SIMULATION'?'DEMO DATA':status}</span><span>8 NOTES · ONE PASSING MOMENT</span><span>Electric Rain / 01</span></footer></section><div className="desktop-footer"><span>LISTEN. REACH. LET IT RAIN.</span><span>AN INTERACTIVE PIANO INSTALLATION</span></div>
    {devEnabled&&<><button className="dev-toggle" onClick={()=>setPanel(x=>!x)}>Developer</button>{panel&&<aside className="dev-panel"><h3>Test console <button onClick={()=>setPanel(false)}>×</button></h3><p>{mode} · {status} · Audio {audioReady?'ready':'locked'}</p><button disabled={connected||busy} onClick={simulation}>Use simulation</button><button onClick={()=>{modeRef.current='HARDWARE';setMode('HARDWARE');returnHome();}}>Use hardware</button><select value={simSong} onChange={e=>setSimSong(+e.target.value)} aria-label="Demo track">{songs.map((s,i)=><option value={i+1} key={s}>{s}</option>)}</select><button disabled={mode!=='SIMULATION'} onClick={demo}>Run full demo</button><div className="test-notes">{pitches.map((p,i)=><button disabled={mode!=='SIMULATION'} key={p} onClick={()=>receive({type:'trigger',actual:i+1},'SIMULATION')}>{p}</button>)}</div><div className="test-events">{['hit','early','miss'].map(type=><button disabled={mode!=='SIMULATION'} key={type} onClick={()=>receive({type},'SIMULATION')}>{type}</button>)}<button disabled={mode!=='SIMULATION'} onClick={()=>receive({type:'end'},'SIMULATION')}>End</button><button onClick={returnHome}>Reset</button></div><label>Sound <input type="range" min="0" max="100" value={session.sound} disabled={mode!=='SIMULATION'} onChange={e=>receive({type:'sound',sound:+e.target.value},'SIMULATION')}/></label><pre>{logs.join('\n')}</pre><small>Start command: {serialConfig.startCommand??'disabled · firmware controls start'}</small></aside>}</>}
  </main>;
}

(() => {
'use strict';
const E = window.ElectricRain ||= {};
E.Rain = class Rain {
constructor(canvas, getState) {
    const ctx=canvas.getContext('2d');let frame=0,last=0,time=0,seen=0,resetSeen=0,density=0,spawn=0,previousPhase='WAITING';
    let drops=[],rings=[];
    const add=(note=false,actual=4,outcome='pending')=>drops.push({x:note?45+(actual-1)*49+Math.random()*50:Math.random()*480,y:note?35:Math.random()*-70,speed:note?105:28+Math.random()*65,depth:Math.random(),note,outcome,born:time});
    for(let i=0;i<48;i++){add();drops[i].y=Math.random()*230;}
    function draw(stamp){
      const dt=Math.min((stamp-last)/1000||.016,.04);last=stamp;time+=dt;
      const p=getState(),dark=p.phase==='PLAYING'||p.phase==='RESULT';
      if(resetSeen!==p.reset){drops=[];rings=[];resetSeen=p.reset;}
      if(p.phase==='PLAYING'&&previousPhase==='SONG_SELECT')rings.push({x:240,y:215,age:0,partial:false,strong:true});
      previousPhase=p.phase;
      for(const event of p.events.filter(e=>e.id>seen)){seen=event.id;
        if(event.type==='trigger')add(true,event.actual);
        else if(['hit','early','wrong'].includes(event.type)){
          const d=[...drops].reverse().find(d=>d.note&&d.outcome==='pending');if(d)d.outcome=event.type;
          else if(event.type==='hit')rings.push({x:90+Math.random()*300,y:210+Math.random()*28,age:0,partial:false,strong:true});
        }else if(event.type==='miss'){
          add(true,4,'miss');
        }
      }
      density+=(Math.min(25,Math.max(0,p.combo))-density)*dt*.7;
      ctx.clearRect(0,0,480,236);
      const water=ctx.createLinearGradient(0,178,0,236);water.addColorStop(0,dark?'#354f68':'#b3b4c0');water.addColorStop(1,dark?'#243b53':'#a7acbd');ctx.globalAlpha=dark?.9:.42;ctx.fillStyle=water;ctx.fillRect(0,185,480,51);ctx.globalAlpha=1;
      // Quiet water reflection, independently animated from precipitation.
      for(let j=0;j<32;j++){const x=(j*79%480),y=190+(j*19%46);ctx.fillStyle=dark?'#78829b':'#8c95ab';ctx.globalAlpha=(.07+.04*Math.sin(time+j))*(1+density/35);ctx.fillRect(x+Math.round(Math.sin(time*.4+j)*4),y,8+j%16,1);}
      ctx.globalAlpha=1;spawn+=dt;
      const interval=p.phase==='RESULT'?.5:p.phase==='SONG_SELECT'?.22:dark?.12-density*.002:.23;
      if(spawn>interval){spawn=0;add();}
      for(const d of drops){
        d.y+=d.speed*dt;
        const broken=d.outcome==='miss'||d.outcome==='early'||d.outcome==='wrong';
        ctx.globalAlpha=d.note?.9:.13+d.depth*.25;ctx.fillStyle=d.note?(dark?'#dfd3d8':'#8c829f'):(dark?'#b9bacd':'#7a87a0');
        const x=Math.round(d.x),y=Math.round(d.y);
        if(broken&&y>130){ctx.globalAlpha*=Math.max(0,1-(y-130)/65);for(let k=0;k<4;k++)ctx.fillRect(x+(k-2)*(y-125)*.09,y-k*4,1,2);}
        else{ctx.fillRect(x,y,d.note?2:1,d.note?11:2+Math.floor(d.depth*7));if(d.note){ctx.fillRect(x-2,y+8,3,2);ctx.fillRect(x+2,y+2,2,1);}}
        if(d.y>=199+d.depth*30){if(d.outcome!=='miss')rings.push({x:d.x,y:d.y,age:0,partial:broken,strong:d.note&&d.outcome==='hit'});d.y=999;}
      }
      drops=drops.filter(d=>d.y<280).slice(-180);ctx.lineWidth=1;
      for(const r of rings){r.age+=dt;const radius=3+r.age*(r.strong?24:15);ctx.globalAlpha=Math.max(0,1-r.age/2.8)*(r.strong?.85:.28);ctx.strokeStyle=dark?'#c5bfd3':'#7c879e';
        for(let k=0;k<(r.strong?3:1);k++){ctx.beginPath();ctx.ellipse(Math.round(r.x),Math.round(r.y),radius+k*6,(radius+k*6)*.20,0,r.partial?.4:0,r.partial?4.1:Math.PI*2);ctx.stroke();}
      }rings=rings.filter(r=>r.age<2.8).slice(-100);
      // Only real/simulated SOUND values drive this small sensor waveform.
      if(p.phase==='WAITING'&&p.sound>0){ctx.globalAlpha=.5;ctx.strokeStyle='#7b7693';ctx.beginPath();for(let x=165;x<315;x++){const amp=Math.sin((x-165)/150*Math.PI)*Math.min(p.sound,100)*.12;const y=163+Math.sin(x*.4+time*8)*amp;x===165?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
      ctx.globalAlpha=1;frame=requestAnimationFrame(draw);
    }frame=requestAnimationFrame(draw);this.stop=()=>cancelAnimationFrame(frame);


}
};
})();

const frequencies=[261.626,293.665,329.628,349.228,391.995,440,493.883,523.251];
// Additive struck-string approximation: decaying harmonics, transient and soundboard filter.
// No score, chart, sensor loudness or accompaniment enters this module.
export class Piano {
  private context:AudioContext|null=null;private voices=new Set<OscillatorNode>();
  async unlock(){this.context??=new AudioContext({latencyHint:'interactive'});await this.context.resume();}
  get ready(){return this.context?.state==='running';}
  play(actual:number){
    const ctx=this.context;if(!ctx||ctx.state!=='running'||!frequencies[actual-1])return false;
    const now=ctx.currentTime, master=ctx.createGain(), filter=ctx.createBiquadFilter();
    filter.type='lowpass';filter.frequency.value=4200;master.gain.value=.24;master.connect(filter);filter.connect(ctx.destination);
    [1,.43,.19,.10,.045,.025].forEach((weight,i)=>{
      const oscillator=ctx.createOscillator(), envelope=ctx.createGain();oscillator.type='sine';
      oscillator.frequency.value=frequencies[actual-1]*(i+1)*(1+ i*i*.00017);
      envelope.gain.setValueAtTime(.00001,now);envelope.gain.exponentialRampToValueAtTime(weight,now+.004);
      envelope.gain.exponentialRampToValueAtTime(.00001,now+1.6/(1+i*.3));
      oscillator.connect(envelope);envelope.connect(master);oscillator.start(now);oscillator.stop(now+1.8);
      this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();if(i===0){master.disconnect();filter.disconnect();}};
    });return true;
  }
  clear(){for(const v of this.voices){try{v.stop();}catch{}}this.voices.clear();}
}

import {LineDecoder,type RainEvent} from './protocol';
import {serialConfig} from './config';
interface Port {readable:ReadableStream<Uint8Array>|null;writable:WritableStream<Uint8Array>|null;open(o:{baudRate:number}):Promise<void>;close():Promise<void>}
type SerialAPI={requestPort():Promise<Port>};
export class SerialTransport {
  private port:Port|null=null;private reader:ReadableStreamDefaultReader<Uint8Array>|null=null;private task:Promise<void>|null=null;
  private decoder:LineDecoder; private closing=false;
  constructor(emit:(e:RainEvent)=>void,private status:(s:string)=>void,log:(s:string)=>void){this.decoder=new LineDecoder(emit,log);}
  get connected(){return !!this.port;}
  async connect(){
    if(this.port)return;
    const api=(navigator as Navigator&{serial?:SerialAPI}).serial;
    if(!api)throw new Error('Web Serial needs Chrome or Edge on localhost.');
    const port=await api.requestPort();await port.open({baudRate:serialConfig.baudRate});
    this.port=port;this.closing=false;this.decoder.reset();this.status('Connected');this.task=this.read(port);
  }
  private async read(port:Port){
    const decoder=new TextDecoder();
    try{
      if(!port.readable)throw new Error('Serial input unavailable');
      this.reader=port.readable.getReader();
      while(!this.closing){const {value,done}=await this.reader.read();if(done)break;if(value)this.decoder.push(decoder.decode(value,{stream:true}));}
    }catch(e){if(!this.closing)this.status(`Disconnected: ${String(e)}`);}
    finally{this.reader?.releaseLock();this.reader=null;try{await port.close();}catch{/* device removed */}this.port=null;this.decoder.reset();this.status('Disconnected');}
  }
  async disconnect(){this.closing=true;try{await this.reader?.cancel();}catch{}await this.task;}
  async requestStart(){
    if(!serialConfig.startCommand || !this.port?.writable)return;
    const writer=this.port.writable.getWriter();try{await writer.write(new TextEncoder().encode(serialConfig.startCommand));}finally{writer.releaseLock();}
  }
}

export default function WindowBar({title,onClose}:{title:string;onClose?:()=>void}){
  return <header className="titlebar"><span className="file-icon">▤</span><span>{title}</span><div className="window-controls"><span>_</span><span>□</span>{onClose?<button aria-label="Close" onClick={onClose}>×</button>:<span>×</span>}</div></header>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, LockKeyhole, Minus, Plus } from "lucide-react";

export function ErgonomicDesign() {
  const [width,setWidth]=useState(.5);
  const [announcement,setAnnouncement]=useState("Mid-width");
  const position=useRef(.5);
  const timer=useRef<ReturnType<typeof setInterval>|null>(null);
  function stop() {
    if(timer.current){clearInterval(timer.current);timer.current=null;}
    setAnnouncement(position.current<.3?"Narrower setting":position.current>.7?"Wider setting":"Mid-width");
  }
  function move(direction:number) {
    position.current=Math.max(0,Math.min(1,position.current+direction*.025));
    setWidth(position.current);
    if(position.current===0||position.current===1) stop();
  }
  function start(direction:number) {
    if(timer.current)clearInterval(timer.current);
    move(direction);timer.current=setInterval(()=>move(direction),40);
  }
  useEffect(()=>()=>{if(timer.current)clearInterval(timer.current);},[]);
  const left=180-width*65;
  const right=420+width*65;
  return <div className="ergonomic-grid">
    <article className="ergonomic-panel handle-panel"><div className="ergonomic-heading"><span className="detail-eyebrow">01 / IN YOUR HANDS</span><h3>A more natural grip.</h3><p>Broad palm supports. Rounded edges. Handle height fitted for relaxed shoulders and a slight elbow bend.</p></div>
      <div className="handle-closeup"><img src="./assets/airi-detail-poster.webp" width={1672} height={941} alt="Close-up of AIRI’s broad, contoured handle and rounded grip" loading="lazy"/><span className="handle-callout"><Hand size={18}/>Contoured palm support</span></div>
      <p className="ergo-detail">Designed to support a comfortable wrist position. Fit is personal.</p>
    </article>
    <article className="ergonomic-panel width-panel"><div className="ergonomic-heading"><span className="detail-eyebrow">02 / FITTED TO YOU</span><h3>A little room to adjust.</h3><p>Paired electric actuators adjust side-support spacing. Hold to move. Release to stop.</p></div>
      <svg className="width-diagram" viewBox="0 0 600 300" role="img" aria-label="Top view of paired side supports. Two synchronized screw actuators adjust the spacing equally around a fixed centre line.">
        <path d="M300 21V278" stroke="#85997a" strokeDasharray="3 7" opacity=".6"/>
        <path d="M110 63V224M490 63V224" stroke="#788e6a" strokeDasharray="3 6" opacity=".45"/>
        {[108,189].map(y=><g key={y}><rect x="228" y={y-10} width="144" height="20" rx="4" fill="#485e3d" stroke="#9aad8c"/><rect x={left} y={y-4} width={228-left} height="8" rx="2" fill="#bdcdae"/><rect x="372" y={y-4} width={right-372} height="8" rx="2" fill="#bdcdae"/><rect x="276" y={y-18} width="48" height="36" rx="5" fill="#283d22" stroke="#e69a73"/><text x="300" y={y+5} fontSize="12" fill="#edb795" textAnchor="middle">M</text></g>)}
        <g className="width-rail" transform={`translate(${left} 0)`}><rect x="-13" y="65" width="26" height="166" rx="11" fill="#d9e5ce"/><rect x="-24" y="47" width="48" height="40" rx="15" fill="#a7b598" stroke="#d8e5ca"/></g>
        <g className="width-rail" transform={`translate(${right} 0)`}><rect x="-13" y="65" width="26" height="166" rx="11" fill="#d9e5ce"/><rect x="-24" y="47" width="48" height="40" rx="15" fill="#a7b598" stroke="#d8e5ca"/></g>
        <path d={`M${left} 256H${right}M${left+7} 251l-7 5 7 5M${right-7} 251l7 5-7 5`} stroke="#e9a077" strokeWidth="1.5" fill="none"/>
        <text x="300" y="288" textAnchor="middle" fontSize="12" fill="#a5b79b">SYNCHRONIZED SIDE-SUPPORT MOVEMENT</text>
      </svg>
      <div className="width-controls"><span><LockKeyhole size={14}/>Stationary · wheels held</span><div>{[[-1,"Narrower"],[1,"Wider"]].map(([direction,label])=><button key={label} disabled={direction===-1?width<=0:width>=1}
        onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);start(Number(direction));}}
        onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onPointerLeave={stop} onBlur={stop}
        onKeyDown={event=>{if((event.key==="Enter"||event.key===" ")&&!event.repeat){event.preventDefault();start(Number(direction));}}}
        onKeyUp={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();stop();}}}
        onClick={event=>{if(event.detail===0){move(Number(direction)*4);stop();}}}
        >{direction===-1?<Minus size={15}/>:<Plus size={15}/>} {label}</button>)}</div><small>Hold to adjust · interactive illustration</small><span className="sr-only" role="status">{announcement}</span></div>
      <p className="ergo-detail">Position limits, mechanical stops and load protection bound movement. A rated locking drive holds the setting.</p>
    </article>
    <p className="ergo-concept">Proposed fit system. Adjustment range, structure and user comfort require testing.</p>
  </div>;
}

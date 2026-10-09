"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDownRight, ChevronDown } from "lucide-react";
import { ScenarioExperience, type Scenario } from "@/components/scenario-experience";

export function ContourField() {
  const contour = "M-140 320C-15 350 15 195 125 217S222 330 343 285 431 96 575 119 661 243 800 199 968 282 1100 217 1218 92 1390 130";
  return <svg className="contour-field" viewBox="0 0 1280 850" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">{Array.from({length:16},(_,index)=><path key={index} d={contour} transform={`translate(0 ${index*26-95})`} opacity={index%4===0?.22:.085} />)}</g>
    <path className="contour-route-base" d="M-40 571C118 597 78 379 247 409S332 616 522 583 493 258 691 294 757 475 932 444 1066 355 1324 514" fill="none" stroke="currentColor" strokeWidth="3" opacity=".16" />
    <path className="contour-route" pathLength="1" d="M-40 571C118 597 78 379 247 409S332 616 522 583 493 258 691 294 757 475 932 444 1066 355 1324 514" fill="none" stroke="currentColor" strokeWidth="3" />
    <circle cx="691" cy="294" r="6" fill="var(--journey-orange)" /><circle cx="691" cy="294" r="16" fill="none" stroke="var(--journey-orange)" strokeDasharray="2 4" />
  </svg>;
}

export function ScrollStatement({motionOn}:{motionOn:boolean}) {
  const ref=useRef<HTMLElement>(null);
  const words="A little support. A world of possibility.".split(" ");
  useEffect(()=>{
    if(!motionOn) return;
    let frame=0;
    const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{const el=ref.current;if(el){const rect=el.getBoundingClientRect();const progress=Math.max(0,Math.min(1,(innerHeight*.85-rect.top)/(innerHeight*.7)));el.style.setProperty("--statement-progress",String(progress*(words.length+1)));}frame=0;});};
    update();addEventListener("scroll",update,{passive:true});addEventListener("resize",update);
    return()=>{cancelAnimationFrame(frame);removeEventListener("scroll",update);removeEventListener("resize",update);};
  },[motionOn,words.length]);
  return <section ref={ref} className="scroll-statement content-width" aria-label="A little support. A world of possibility."><span className="journey-section-label">01 / MORE LIFE IN EVERY STEP</span><p aria-hidden="true">{words.map((word,index)=><span key={index} style={{"--word-index":index} as CSSProperties}>{word} </span>)}</p><ArrowDownRight className="statement-arrow" size={40} strokeWidth={1} aria-hidden="true" /></section>;
}

export function ScenarioJourney({scenarios,motionOn}:{scenarios:Scenario[];motionOn:boolean}) {
  const [active,setActive]=useState(0);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let frame=0;
    const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{const chapters=root.current?.querySelectorAll<HTMLElement>(".journey-chapter");if(chapters?.length){let closest=0;let distance=Infinity;chapters.forEach((el,index)=>{const rect=el.getBoundingClientRect();const d=Math.abs(rect.top+Math.min(rect.height,innerHeight)*.35-innerHeight*.5);if(d<distance){distance=d;closest=index;}});setActive(previous=>previous===closest?previous:closest);}frame=0;});};
    update();addEventListener("scroll",update,{passive:true});addEventListener("resize",update);
    return()=>{cancelAnimationFrame(frame);removeEventListener("scroll",update);removeEventListener("resize",update);};
  },[]);
  return <div ref={root} className="scenario-journey">
    <aside className="journey-media" aria-label="Current journey film">

      <ScenarioExperience key={scenarios[active].id} scenario={scenarios[active]} motionOn={motionOn} />
      <nav className="journey-chapter-nav" aria-label="Journey chapters">{scenarios.map((scenario,index)=><a key={scenario.id} href={`#day-${scenario.id}`} aria-label={`Jump to ${scenario.name}`} aria-current={active===index?"step":undefined}><span>0{index+1}</span><span className="chapter-nav-line" /></a>)}</nav>
      <div className="journey-media-foot"><span>{scenarios[active].name}</span><span>AIRI / EVERYDAY STORIES</span></div>
    </aside>
    <div className="journey-copy-list">{scenarios.map((scenario,index)=><article key={scenario.id} id={`day-${scenario.id}`} className={`journey-chapter ${active===index?"is-current":""}`}>
      <div className="journey-chapter-kicker"><span>0{index+1}</span><scenario.icon size={20} strokeWidth={1.4} /><span>{scenario.name}</span></div>
      <h4>{scenario.title}</h4><p>{scenario.description}</p>
      <ol className="journey-steps">{scenario.steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol>
      <a className="journey-next" href={index<scenarios.length-1?`#day-${scenarios[index+1].id}`:"#how-it-works"}>{index<scenarios.length-1?"Continue the journey":"Explore the system"}</a>
      <div className="journey-mobile-film"><ScenarioExperience scenario={scenario} motionOn={motionOn}/></div>
    </article>)}</div>
  </div>;
}


export function ScrollInvitation() {
  const ref=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const update=()=>{
      const remaining=document.documentElement.scrollHeight-innerHeight-scrollY;
      if(ref.current) ref.current.hidden=remaining<180;
    };
    update(); addEventListener("scroll",update,{passive:true}); addEventListener("resize",update);
    return()=>{removeEventListener("scroll",update);removeEventListener("resize",update);};
  },[]);
  function continueScroll() {
    const sections=[...document.querySelectorAll<HTMLElement>("section[id], article[id^='day-']")];
    const next=sections.find(section=>section.getBoundingClientRect().top>innerHeight*.45);
    next?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
  }
  return <button ref={ref} className="scroll-invitation" onClick={continueScroll} aria-label="Scroll to the next section"><span>There’s more to explore</span><ChevronDown size={16} strokeWidth={1.5} /></button>;
}

import { useEffect, useId, useRef, useState } from "react";
import "./batterySwapScene.css";

export const BATTERY_SWAP_DURATION_MS = 8400;

type Props = { paused: boolean; reducedMotion: boolean; onComplete: () => void };
type SwapStage = "release" | "remove" | "fit" | "ready";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x); };

/** An illustrative, removable-pack concept. Its clock stops with the game's pause menu. */
export default function BatterySwapScene({ paused, reducedMotion, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef(0);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const id = useId().replaceAll(":", "");

  useEffect(() => {
    if (paused || completed.current) return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null) clock.current = Math.min(BATTERY_SWAP_DURATION_MS, clock.current + Math.min(64, now - previous));
      previous = now;
      setElapsed(clock.current);
      if (clock.current >= BATTERY_SWAP_DURATION_MS) {
        completed.current = true;
        onCompleteRef.current();
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const stage: SwapStage = elapsed < 1100 ? "release" : elapsed < 3450 ? "remove" : elapsed < 6500 ? "fit" : "ready";
  const release = reducedMotion ? Number(elapsed >= 550) : ease(elapsed / 750);
  const remove = reducedMotion ? Number(elapsed >= 1700) : ease((elapsed - 1250) / 1250);
  const lower = reducedMotion ? Number(elapsed >= 2800) : ease((elapsed - 2600) / 650);
  const arrive = reducedMotion ? Number(elapsed >= 3900) : ease((elapsed - 3500) / 550);
  const insert = reducedMotion ? Number(elapsed >= 5100) : ease((elapsed - 4350) / 1600);
  const latch = reducedMotion ? Number(elapsed >= 6200) : ease((elapsed - 6000) / 400);
  const withdraw = reducedMotion ? Number(elapsed >= 7000) : ease((elapsed - 6650) / 600);
  const charged = stage === "fit" || stage === "ready";
  const packX = charged ? 180 * (1 - insert) : 180 * remove;
  const packY = charged ? -72 * (1 - arrive) : 82 * lower;
  const packOpacity = charged ? arrive : 1 - lower;
  const handX = 448 + packX + 76 * withdraw;
  const handY = 267 + packY - 32 * withdraw;
  const status = stage === "release" ? "Release the latch" : stage === "remove" ? "Remove the empty pack" : stage === "fit" ? "Fit a charged pack" : "Powered assistance is back";
  const activeStep = stage === "release" || stage === "remove" ? 0 : stage === "fit" ? 1 : 2;

  return <section className="ag-battery-swap-scene" data-swap-stage={stage} data-paused={paused} data-reduced-motion={reducedMotion} aria-label="A helper swaps the walker's battery">
    <div className="ag-swap-heading"><span>A CHARGED SPARE</span><h1>A quick battery swap.</h1></div>
    <figure className="ag-swap-figure">
      <svg viewBox="0 0 820 460" role="img" aria-label={`${status}. A helper releases the pack beneath the walker seat, slides it out, and inserts a charged spare. The hand brakes remain connected.`}>
        <defs>
          <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d1b996"/><stop offset="1" stopColor="#aa9778"/></linearGradient>
          <linearGradient id={`${id}-coat`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bb744b"/><stop offset="1" stopColor="#975a3d"/></linearGradient>
        </defs>
        <ellipse cx="402" cy="408" rx="300" ry="17" fill="#122b244f"/>
        <path d="M60 410H758" stroke="#99ad8b" strokeOpacity=".35"/>
        {/* Far wheels and frame establish a rollator, rather than a two-wheel cart. */}
        <g opacity=".62"><path d="M231 173L145 354M419 178L339 358M185 274L374 280" className="bs-frame" stroke={`url(#${id}-frame)`}/>
          <g className="bs-wheel"><ellipse cx="146" cy="370" rx="23" ry="34"/><ellipse cx="339" cy="373" rx="23" ry="34"/></g>
          <g className="bs-hub"><ellipse cx="146" cy="370" rx="8" ry="15"/><ellipse cx="339" cy="373" rx="8" ry="15"/></g>
        </g>
        <path d="M223 107Q243 96 247 127L276 365M414 112Q434 103 438 135L465 373M251 173L442 179M261 269L453 275" className="bs-frame" stroke={`url(#${id}-frame)`}/>
        <path d="M230 109L421 114" stroke="#b4a282" strokeWidth="9" strokeLinecap="round"/>
        <path d="M194 106Q213 97 237 104M386 111Q408 102 430 109" className="bs-grip"/>
        <path d="M197 121L232 126L235 138M390 126L426 131L429 142" className="bs-handbrake"/>
        <path d="M235 138C196 203 259 278 265 351M429 142C390 210 448 285 454 357" className="bs-cable"/>
        <path d="M222 188L410 193L444 211L256 206Z" fill="#917c5f"/>
        <path d="M256 206L444 211L436 229L264 224Z" fill="#76684f"/>
        <path d="M259 290L451 294L439 335Q360 354 273 329Z" fill="#b2a080"/>
        <path d="M270 302L441 306" stroke="#8d8268" strokeWidth="3"/>
        <text x="355" y="326" className="bs-brand">AIRI</text>
        {/* The open bay remains visible while the removable pack travels to the helper. */}
        <rect x="310" y="237" width="133" height="58" rx="8" fill="#142e28" stroke="#657a60" strokeWidth="3"/>
        <path d="M323 245H430M323 286H430" stroke="#8a967a" strokeWidth="3"/>
        <path d="M324 258V274M333 258V274" stroke="#c5a35f" strokeWidth="4"/>
        <path d="M454 266H592" className="bs-guide" opacity={stage === "remove" || stage === "fit" ? .6 : 0}/>
        <g className="bs-slide-arrow" opacity={stage === "remove" || stage === "fit" ? .85 : 0} transform={charged ? "translate(1040 0) scale(-1 1)" : undefined}>
          <path d="M483 223H557M547 215L557 223L547 231"/>
        </g>
        <g data-swap-pack={charged ? "charged" : "empty"} transform={`translate(${packX} ${packY})`} opacity={packOpacity}>
          <rect x="316" y="242" width="124" height="48" rx="6" fill={charged ? "#73a777" : "#9e886b"} stroke={charged ? "#b2d5a0" : "#c8ad86"} strokeWidth="2"/>
          <rect x="432" y="251" width="16" height="30" rx="4" fill="#213d32"/>
          <path d="M440 257V275" stroke="#acbb99" strokeWidth="3" strokeLinecap="round"/>
          <rect x="348" y="253" width="40" height="22" rx="3" fill="none" stroke="#f2ead0" strokeWidth="2"/>
          <path d="M390 260V268" stroke="#f2ead0" strokeWidth="3"/>
          {charged ? <path d="M355 258V270M364 258V270M373 258V270M382 258V270" stroke="#f2ead0" strokeWidth="5"/> : <path d="M355 258V270" stroke="#d59574" strokeWidth="5"/>}
        </g>
        <g transform={`rotate(${-65 * release * (1 - latch)} 442 242)`}><rect x="435" y="228" width="14" height="23" rx="4" fill="#d6bc89" stroke="#f0dbaf" strokeWidth="1.5"/></g>
        <circle cx="412" cy="165" r="5" fill={stage === "ready" ? "#a8e7a6" : "#666b51"}/>
        {stage === "ready" && <circle cx="412" cy="165" r="12" fill="#b1efab" fillOpacity=".13" stroke="#b1efab" strokeOpacity=".55"/>}
        <g className="bs-wheel"><ellipse cx="276" cy="376" rx="27" ry="39"/><ellipse cx="466" cy="381" rx="27" ry="39"/></g>
        <g className="bs-hub"><ellipse cx="276" cy="376" rx="10" ry="18"/><ellipse cx="466" cy="381" rx="10" ry="18"/></g>
        <path d="M260 344L265 359M449 349L454 365" className="bs-brake-pad"/>
        {/* A visible helper, with one continuous arm following the battery handle. */}
        <path d="M664 308L649 405M711 311L729 405" stroke="#43564a" strokeWidth="38" strokeLinecap="round"/>
        <path d="M628 408H662M712 408H746" stroke="#a99172" strokeWidth="15" strokeLinecap="round"/>
        <path d="M657 162Q689 147 719 171L742 316Q686 334 635 309Z" fill={`url(#${id}-coat)`}/>
        <path d="M674 151L684 176L699 151" fill="#e2c5a4"/>
        <path d="M685 181L688 313" stroke="#d59568" strokeWidth="2"/>
        <ellipse cx="685" cy="124" rx="29" ry="36" fill="#e1bd96"/>
        <path d="M656 123Q646 86 680 85Q714 82 716 113L702 109L695 101Q682 117 659 113Z" fill="#514f3c"/>
        <path d="M674 141Q681 147 689 141" fill="none" stroke="#9d7557" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="666" cy="125" r="2" fill="#514f3c"/>
        <path d="M664 183Q638 200 624 228" stroke="#bc784f" strokeWidth="36" strokeLinecap="round" fill="none"/>
        <path d={`M624 228Q${(624 + handX) / 2} ${handY + 18} ${handX} ${handY}`} stroke="#e1bd96" strokeWidth="21" strokeLinecap="round" fill="none"/>
        <path d="M626 216L613 239" stroke="#e2ac7a" strokeWidth="8" strokeLinecap="round"/>
        <g transform={`translate(${handX} ${handY})`}><ellipse cx="0" cy="0" rx="12" ry="15" fill="#e8c7a1"/><path d="M-8 -7Q-18 -11 -14 -17Q-10 -19 -4 -9" fill="#e8c7a1"/><path d="M-7 2L3 4M-7 7L3 9" stroke="#c39a75" strokeWidth="1.2" strokeLinecap="round"/></g>
        {stage === "ready" && <g transform="translate(546 202)"><circle r="23" fill="#83b181" fillOpacity=".18" stroke="#a6cc96"/><path d="M-10 0L-3 7L11 -8" stroke="#c8e5af" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>}
      </svg>
      <figcaption aria-live="polite" aria-atomic="true"><span className={stage === "ready" ? "is-ready" : ""}/>{status}</figcaption>
    </figure>
    <div className="ag-swap-steps" aria-label="Battery swap progress">{["Remove", "Replace", "Ready"].map((label, index) => <span key={label} aria-current={activeStep === index ? "step" : undefined} className={index <= activeStep ? "is-active" : ""}><i>{index === 2 && activeStep === 2 ? "✓" : index + 1}</i>{label}</span>)}</div>
    <p className="ag-swap-note">No spare? Keep walking with manual brakes.</p>
  </section>;
}

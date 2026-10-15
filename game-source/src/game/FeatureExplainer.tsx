import { useState } from "react";
import { GameIcon } from "./GameIcon";
import AIExplainer from "./AIExplainer";
import ManualExplainer from "./ManualExplainer";
import type { FeatureId, ShowcaseId } from "./types";
import "./featureExplainer.css";
import "./gripExplainer.css";

const ENGINEERING: Record<FeatureId, { steps: [string, string][]; note: string; source?: { title: string; url: string } }> = {
  grips: {
    steps: [["Contact", "A wide palm surface distributes load; fingers can still reach the brake lever."], ["Measure", "Left/right load cells would estimate support load and asymmetry."], ["Combine", "A stable push plus IMU/encoder agreement could permit limited walking assistance. Sudden instability would request braking instead."]],
    note: "Grip-force sensing is proposed; the current research models were not trained on load-cell data. A single-axis cell measures force along its installed axis, not every push direction. Hand load alone cannot establish intent. Fit, calibration, overload protection and user comfort need testing.",
  },
  frame: {
    steps: [["Carry", "Loads travel from the grips through the frame into the wheel contact points."], ["Connect", "Locked joints and braced cross-members resist unwanted flex and folding."], ["Protect", "Replaceable contact surfaces and a separate electronics cover simplify care."]],
    note: "The finish is a design choice. Alloy, tube thickness, joints and load ratings still require structural testing.",
  },
  compute: {
    steps: [["Estimate", "Filter IMU and encoder readings; compare recent movement with expected rolling motion."], ["Decide", "A bounded state machine would select walking assist, braking or holding, using load cells, thresholds and a learned instability signal."], ["Act", "Wheel controllers apply limited motor torque or separate brake actuation, then check feedback and faults."]],
    note: "In this game, Whisper transcribes speech and Qwen chooses a scripted task. The fast safety-control loop shown here is a proposed hardware architecture. IMU/encoder mismatch can suggest slip, but steady sliding or wheel lift can be ambiguous.",
    source: { title: "ST: IMU sensing and fusion", url: "https://newsroom.st.com/media-center/press-item.html/n4362.html" },
  },
  wheels: {
    steps: [["Detect", "Combine the learned IMU risk signal with thresholds and wheel-speed feedback."], ["Ramp", "In powered mode, ramp opposing motor torque within current limits. Manual mode disables electronic braking; the user applies the cable hand brakes."], ["Recheck", "Use feedback to adjust resistance and return to normal only after stable motion."]],
    note: "Disconnecting the drive removes its motor-braking path. Cable hand brakes remain connected and usable in both modes. Motor-generated wheel force also depends on gearing, efficiency and wheel radius. Tire grip limits braking force. Dynamic motor braking alone is not a reliable stationary lock; sitting and standing need a verified holding brake.",
    source: { title: "TI: motor braking and holding", url: "https://e2e.ti.com/support/motor-drivers-group/motor-drivers/f/motor-drivers-forum/1051913/drv8308-stationary-stationary-braking" },
  },
  lidar: {
    steps: [["Scan", "Light pulses estimate range to surfaces ahead and below the front crossbar."], ["Compare", "Track obstacle clearance and changes from the expected ground plane."], ["Slow", "A controller would use speed, sensing delay and available braking to choose a stopping margin."]],
    note: "Missing returns can also mean a poor reading. Sunlight, surfaces, occlusion and mounting angle need testing. The game's visible rays and scan sounds are illustrations.",
    source: { title: "ST: depth sensing for robotics", url: "https://www.st.com/en/imaging-and-photonics-solutions/time-of-flight-sensors.html" },
  },
  adjust: {
    steps: [["Stop", "Change width while stationary and with the user supported."], ["Adjust", "A linked folding mechanism brings both sides inward together."], ["Verify", "Confirm the locks and check clearance and stability before moving again."]],
    note: "The moving squeeze-through is a game concept. A narrower support base changes stability; an occupied narrowing mode needs mechanical and user validation.",
  },
};

function DiagramFrame({ title, children, caption }: { title: string; children: React.ReactNode; caption: string }) {
  return <figure className="ag-engineering-figure"><figcaption><span>{title}</span><small>CONCEPT</small></figcaption>{children}<p className="ag-diagram-caption">{caption}</p></figure>;
}
function GripDiagram() {
  const [mode, setMode] = useState<"push" | "asymmetry" | "support">("push");
  const examples = {
    push: { left: 35, right: 33, title: "Steady push", motion: "Stable motion + wheel agreement", output: "May permit limited assist", detail: "Balanced load is one input; direction and motion must also agree." },
    asymmetry: { left: 60, right: 18, title: "Uneven load", motion: "Changing load + motion check", output: "Reduce assist; assess instability", detail: "Uneven pressure may be intentional. It does not prove a fall." },
    support: { left: 85, right: 80, title: "Support", motion: "Low speed + support request", output: "Confirm hold before support", detail: "Standing support needs a verified holding brake, not motor drag alone." },
  };
  const sample = examples[mode];
  return <DiagramFrame title="A handle with a measurable load path" caption="Proposed cutaway · example forces, not live measurements or training data">
    <svg viewBox="0 0 360 232" role="img" aria-label="Handle cutaway: a soft palm surface loads a rigid carrier and a load cell above the frame tube. A separate mechanical hand-brake lever stays within reach." className="ag-grip-cutaway">
      <path d="M81 64C89 35 105 29 124 38L149 53L190 53Q207 53 211 64L218 77H83Z" className="ag-grip-palm"/>
      <path d="M77 78Q66 78 65 91L65 105Q65 115 79 115H242Q257 114 257 101L251 85Q248 78 235 78Z" className="ag-grip-soft"/>
      <path d="M85 118H239L227 137H104Z" className="ag-grip-carrier"/>
      <rect x="133" y="144" width="69" height="23" rx="4" className="ag-grip-cell"/><path d="M143 155h12l4-6 7 12 6-12 5 6h14" className="ag-grip-bridge"/>
      <path d="M157 173H179V225H157Z" className="ag-grip-stem"/>
      <path d="M228 130L262 137Q271 140 267 148L241 163" className="ag-grip-lever"/><path d="M249 157Q226 182 211 222" className="ag-grip-cable"/>
      <path d="M167 66V145M162 137L167 145L172 137" className="ag-grip-force"/>
      <path d="M114 144H82L54 159M207 154H229" className="ag-grip-leader"/>
      <text x="20" y="166">LOAD CELL</text><text x="20" y="179">under the carrier</text>
      <path d="M240 81L277 56" className="ag-grip-leader"/><text x="279" y="40" textAnchor="end">PALM SURFACE</text>
      <text x="277" y="178" textAnchor="middle">HAND BRAKE</text><path d="M278 167L259 151" className="ag-grip-leader"/>
      <text x="118" y="211" textAnchor="end">FRAME</text><path d="M123 207H153" className="ag-grip-leader"/>
    </svg>
    <div className="ag-grip-mode-tabs" role="group" aria-label="Illustrative handle-load scenarios">{Object.entries(examples).map(([key, value]) => <button key={key} aria-pressed={mode === key} onClick={() => setMode(key as typeof mode)}>{value.title}</button>)}</div>
    <div className="ag-grip-readout" aria-live="polite"><span className="ag-grip-readout-label">Example vertical force</span><div className="ag-grip-forces">{[["LEFT", sample.left], ["RIGHT", sample.right]].map(([side, force]) => <div key={side}><span>{side}<strong>{force} <small>N</small></strong></span><i><b style={{ width: `${force}%` }}/></i></div>)}</div><p>{sample.detail}</p></div>
    <div className="ag-grip-fusion"><div><span><GameIcon name="grips" size={17}/>L / R load</span><b>+</b><span><GameIcon name="motion" size={17}/>IMU</span><b>+</b><span><GameIcon name="wheels" size={17}/>Wheel speed</span></div><i>↓</i><p>{sample.motion}<small>Proposed state / risk estimate</small></p><i>↓</i><strong>{sample.output}<small>Bounded controller · brake override</small></strong></div>
  </DiagramFrame>;
}
function FrameDiagram() {
  const [showLoad, setShowLoad] = useState(true);
  return <DiagramFrame title="The AIRI frame, under load" caption="Line study of the design · loads and materials are illustrative">
    <svg viewBox="0 0 360 236" role="img" aria-label="AIRI walker line drawing: curved front legs, angled rear legs, attached grips and a textile bag. Green paths show handle loads reaching all four wheels." className={showLoad ? "ag-frame-load-active" : ""}>
      <path d="M28 211h300" className="ag-diagram-grid"/>
      <g opacity=".55"><path d="M141 101q-12-5-18 11L83 182M263 100q-12-4-17 11l-37 72M119 136l111 1" className="ag-frame-tubes"/><ellipse cx="80" cy="190" rx="12" ry="18" className="ag-frame-wheel"/><ellipse cx="207" cy="190" rx="12" ry="18" className="ag-frame-wheel"/></g>
      <path d="M127 54q18-6 20 19l17 122M247 57q19-5 21 21l18 117M150 108l122 3M160 156l121 2" className="ag-frame-tubes"/>
      <path d="M111 50q12-7 27-3M235 53q13-7 29-3" className="ag-frame-grips"/>
      <path d="M117 61h21l3 9M242 64h18l3 9" stroke="#445b49" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M137 52l104 3" stroke="#a2a084" strokeWidth="7"/>
      <path d="M155 96l113 3-4 49q-52 9-103-3Z" fill="#cbc4aa" stroke="#999c82" strokeWidth="1.5"/><path d="M157 103l109 3" stroke="#93947c" strokeWidth="2"/><text x="211" y="133" textAnchor="middle">AIRI</text>
      <ellipse cx="164" cy="197" rx="15" ry="22" className="ag-frame-wheel"/><ellipse cx="287" cy="197" rx="15" ry="22" className="ag-frame-wheel"/>
      <ellipse cx="164" cy="197" rx="5" ry="10" fill="#929477"/><ellipse cx="287" cy="197" rx="5" ry="10" fill="#929477"/>
      <g className="ag-frame-load-traces"><path d="M128 25v17m-4-5 4 5 4-5M251 28v17m-4-5 4 5 4-5M145 73l17 111M267 76l17 108M139 105l-48 70M259 108l-42 69"/><path d="m158 177 4 7 3-8m117-2 2 10 4-8m-193-7-4 6 8-2m121-2-3 6 7-2"/></g>
      <text x="190" y="24" textAnchor="middle">HANDLE LOAD</text><path d="M70 75l70 9" className="ag-event-line"/><text x="26" y="70">LOCKED</text><text x="26" y="82">JOINTS</text>
    </svg>
    <button className="ag-load-toggle" onClick={() => setShowLoad(v => !v)} aria-pressed={showLoad}><GameIcon name="frame" size={15}/>{showLoad ? "Load paths on" : "Show load paths"}</button>
    <div className="ag-diagram-tags"><span>Metal frame</span><span>Soft grips</span><span>Textile bag</span></div>
  </DiagramFrame>;
}
function ControlDiagram() {
  const [mode, setMode] = useState<"walk" | "slip" | "hold">("walk");
  const labels = { walk: ["Stable gait + a push request", "Limited forward assist", "↑"], slip: ["Unstable acceleration or rotation", "Ramp brake force", "↓"], hold: ["Sitting or standing support", "Mechanical holding brake", "⊣"] };
  return <DiagramFrame title="Proposed motor-control states" caption="Load alone is not intent. Motion, speed and contact must agree.">
    <div className="ag-diagram-toggle"><button aria-pressed={mode === "walk"} onClick={() => setMode("walk")}>Walking</button><button aria-pressed={mode === "slip"} onClick={() => setMode("slip")}>Instability</button><button aria-pressed={mode === "hold"} onClick={() => setMode("hold")}>Support</button></div>
    <div className="ag-control-flow"><div className="ag-control-inputs ag-four-inputs"><span><GameIcon name="grips" size={19}/>Load cells<small>handle force</small></span><span><GameIcon name="motion" size={19}/>IMU<small>accel + gyro</small></span><span><GameIcon name="wheels" size={19}/>Encoders<small>wheel speed</small></span><span><GameIcon name="lidar" size={19}/>Depth<small>clearance</small></span></div><div className="ag-flow-down">↓</div><div className="ag-control-node"><GameIcon name="compute" size={22}/><span>{labels[mode][0]}<small>state estimate → bounded controller</small></span></div><div className="ag-flow-down">↓</div><div className={`ag-control-output ag-control-mode-${mode}`}><strong>{labels[mode][2]}</strong>{labels[mode][1]}<span>↺ feedback</span></div><div className="ag-voice-lane"><GameIcon name="mic" size={17}/><span>Voice → charge / return task</span><small>separate from the fast motor loop</small></div></div>
  </DiagramFrame>;
}
function BrakeDiagram() {
  const [request, setRequest] = useState(65);
  const amount = request / 100;
  const curve = (kind: "brake"|"speed") => Array.from({length:61},(_,i)=> {
    const t=i/60;
    const brake=amount*(1-Math.exp(-Math.max(0,t-.2)*12))*(1-.65*Math.min(1,Math.max(0,(t-.72)/.28)));
    const speed=Math.max(0,1-Math.pow(Math.max(0,t-.24)/(1-.42*amount),1.4));
    return `${i?"L":"M"}${(24+t*312).toFixed(1)},${(125-(kind==="brake"?brake:speed)*95).toFixed(1)}`;
  }).join(" ");
  return <DiagramFrame title="Powered-mode motor braking" caption="Illustrative normalized curves · no measured forces or timing">
    <div className="ag-chart-legend"><span><i/>Brake request</span><span><i/>Wheel speed</span></div>
    <svg viewBox="0 0 360 154" role="img" aria-label="Illustrative graph: brake request builds smoothly while rolling speed falls">
      {[30,77,125].map(y=><path key={y} d={`M24 ${y}h312`} className="ag-diagram-grid"/>)}
      <path d="M87 20v105" className="ag-event-line"/>
      <path d={`${curve("brake")} L336 125 L24 125 Z`} className="ag-brake-area"/>
      <path d={curve("brake")} className="ag-brake-curve"/>
      <path d={curve("speed")} className="ag-speed-curve"/>
      <text x="24" y="146">ROLL</text><text x="87" y="146" textAnchor="middle">DETECT</text><text x="205" y="146" textAnchor="middle">RAMP</text><text x="336" y="146" textAnchor="end">SETTLE</text>
    </svg>
    <label className="ag-response-slider"><span>Explore the response<small>{request<50?"Gentler request":request<75?"Moderate request":"Firmer request"}</small></span><input aria-label="Illustrative brake request" aria-valuetext={`${request}% — ${request<50?"gentler":request<75?"moderate":"firmer"} illustrative request`} type="range" min="30" max="100" value={request} onChange={e=>setRequest(Number(e.target.value))}/></label>
    <div className="ag-force-relation"><span>Powered-mode motor torque</span><strong>τ ≈ Kₜ × I</strong></div>
  </DiagramFrame>;
}
function DepthDiagram() {
  const [mode, setMode] = useState<"drop"|"wall">("drop");
  return <DiagramFrame title="Two views of the path" caption="Light rays are drawn to explain the sensing geometry">
    <div className="ag-diagram-toggle"><button aria-pressed={mode==="drop"} onClick={()=>setMode("drop")}><GameIcon name="hole" size={15}/>Drop-off</button><button aria-pressed={mode==="wall"} onClick={()=>setMode("wall")}><GameIcon name="wall" size={15}/>Obstacle</button></div>
    <svg viewBox="0 0 360 174" role="img" aria-label={mode==="drop"?"A downward sensor checks expected ground range and detects a deeper surface":"A forward sensor measures distance to an obstacle"}>
      <path d={mode==="drop"?"M15 125h215v35h80v-35h35":"M15 125h330"} className="ag-ground-cut"/>
      {mode==="drop"&&<path d="M230 126h80v34h-80Z" fill="#314b3b" opacity=".12"/>}
      <path d="m75 48-19 68m71-68 17 68M72 48h58M63 86h74" className="ag-frame-tubes"/>
      <circle cx="55" cy="117" r="9" className="ag-frame-wheel"/><circle cx="145" cy="117" r="9" className="ag-frame-wheel"/>
      <rect x="124" y="65" width="15" height="10" rx="3" fill="#2f8061"/>
      {mode==="drop"?<><path d="m138 73 61 51m-61-51 119 86m-119-86 57 18" className="ag-scan-rays"/><path d="M195 124h109" className="ag-event-line"/><text x="217" y="107">EXPECTED FLOOR</text><text x="262" y="170" textAnchor="middle">DEEPER RETURN</text></>:<><rect x="288" y="34" width="27" height="91" fill="#b17f5c"/><path d="M139 70 288 41M139 70h149m-149 0 149 40" className="ag-scan-rays"/><path d="M157 137h121m-116-4-5 4 5 4m111-8 5 4-5 4" className="ag-load-path"/><text x="217" y="156" textAnchor="middle">CLEARANCE</text></>}
    </svg>
  </DiagramFrame>;
}
function WidthDiagram({ folded }: { folded: boolean }) {
  return <DiagramFrame title="Linked adjustment, confirmed lock" caption="Top view · folding concept shown in the 3D model">
    <div className={`ag-width-diagram ${folded?"is-folded":""}`}><span className="ag-width-limit left"/><span className="ag-width-limit right"/><div className="ag-width-frame"><i/><i/><b/><b/><em><GameIcon name="lock" size={20}/></em></div><span className="ag-width-arrow left">→</span><span className="ag-width-arrow right">←</span></div>
    <div className="ag-diagram-tags"><span>Linked joints</span><span>Position check</span><span>Positive lock</span></div>
  </DiagramFrame>;
}
export default function FeatureExplainer({ feature, folded }: { feature: ShowcaseId; folded: boolean }) {
  if (feature === "manual") return <ManualExplainer/>;
  if (feature === "fallAI" || feature === "voiceAI" || feature === "navigationAI" || feature === "findUserAI" || feature === "computeAI") return <AIExplainer feature={feature}/>;
  const info=ENGINEERING[feature];
  return <div className="ag-engineering" key={feature}>
    {feature==="grips"?<GripDiagram/>:feature==="frame"?<FrameDiagram/>:feature==="compute"?<ControlDiagram/>:feature==="wheels"?<BrakeDiagram/>:feature==="lidar"?<DepthDiagram/>:<WidthDiagram folded={folded}/>}
    <h3 className="ag-how-title">How it could work</h3>
    <ol className="ag-engineering-steps">{info.steps.map(([name,body],i)=><li key={name}><span>0{i+1}</span><div><strong>{name}</strong><p>{body}</p></div></li>)}</ol>
    <details className="ag-engineering-notes"><summary>Design notes & engineering basis<GameIcon name="arrow" size={14}/></summary><p>{info.note}</p>{info.source&&<a href={info.source.url} target="_blank" rel="noreferrer">{info.source.title}<GameIcon name="arrow" size={13}/></a>}</details>
  </div>;
}

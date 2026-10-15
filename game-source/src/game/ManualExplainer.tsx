import { useState } from "react";
import { GameIcon } from "./GameIcon";
import "./manualExplainer.css";

type PowerMode = "powered" | "manual" | "empty";
const MODES: { id: PowerMode; title: string; sub: string }[] = [
  { id: "powered", title: "Powered", sub: "Drive connected" },
  { id: "manual", title: "Low battery", sub: "Manual mode" },
  { id: "empty", title: "Zero charge", sub: "Manual only" },
];

function RollatorDrawing({ mode, disconnected }: { mode: PowerMode; disconnected: boolean }) {
  return <svg className="ag-manual-rollator" viewBox="0 0 360 246" role="img" aria-label="Four-wheel rollator with sculpted grips, hand brake levers, cable brakes, a braced frame and a bag. The mechanical brake cables stay connected in every power state.">
    <path d="M27 229H333" className="am-ground"/>
    <g className="am-back-frame"><path d="M137 104Q128 96 122 112L86 186M257 109Q248 101 242 117L207 189M111 146L235 150" className="am-tube"/>
      <ellipse cx="85" cy="192" rx="12" ry="18" className="am-wheel"/><ellipse cx="206" cy="195" rx="12" ry="18" className="am-wheel"/>
      <ellipse cx="85" cy="192" rx="4" ry="8" className="am-hub"/><ellipse cx="206" cy="195" rx="4" ry="8" className="am-hub"/>
    </g>
    <path d="M126 53Q143 48 146 70L163 204M245 58Q261 52 265 77L282 206M150 109L269 115M158 162L276 167" className="am-tube"/>
    <path d="M133 53L249 58" className="am-crossbar"/>
    <path d="M110 49Q124 42 140 47M231 54Q247 47 262 52" className="am-grip"/>
    <path d="M113 61L139 64L141 71M234 66L261 69L263 76" className="am-lever"/>
    <path d="M141 70C112 114 150 145 153 191M263 76C234 120 271 153 273 193" className="am-cable"/>
    <path d="M151 117L269 122L261 167Q212 176 160 162Z" className="am-bag"/><path d="M156 126L264 131" className="am-bag-seam"/>
    <text x="210" y="151" textAnchor="middle" className="am-brand">AIRI</text>
    <rect x="182" y="77" width="48" height="24" rx="5" className={`am-power-pack ${mode === "empty" ? "is-empty" : ""}`}/><rect x="197" y="84" width="18" height="9" rx="1" className="am-pack-outline"/><path d="M216 87V90" className="am-pack-outline"/>
    {mode !== "empty" && <path d={mode === "powered" ? "M200 86V91M204 86V91M208 86V91M212 86V91" : "M200 86V91"} className="am-pack-charge"/>}
    <ellipse cx="163" cy="207" rx="15" ry="22" className="am-wheel"/><ellipse cx="283" cy="209" rx="15" ry="22" className="am-wheel"/>
    <ellipse cx="163" cy="207" rx="5" ry="10" className="am-hub"/><ellipse cx="283" cy="209" rx="5" ry="10" className="am-hub"/>
    <path d="M150 188L154 197M270 191L274 200" className="am-brake-pad"/>
    <circle cx="163" cy="207" r="29" className="am-zoom-ring"/>
    <path d="M135 211L85 224" className="am-callout"/><text x="22" y="221" className="am-label">WHEEL DETAIL ↓</text>
    <path d="M80 32L116 48" className="am-callout"/><text x="23" y="25" className="am-label">HAND BRAKES</text>
    <path d="M308 95L271 114" className="am-callout"/><text x="333" y="85" textAnchor="end" className="am-label">CABLE LINK</text>
    <g className={`am-wheel-motion ${disconnected ? "is-manual" : ""}`}><path d="M301 193Q316 210 302 226M300 221L302 226L308 226"/></g>
  </svg>;
}

function ClutchDrawing({ disconnected }: { disconnected: boolean }) {
  return <div className={`ag-clutch-cutaway ${disconnected ? "is-open no-energy" : "is-engaged has-energy"}`}>
    <div className="ag-clutch-heading"><span>Drive connection · enlarged</span><strong>{disconnected ? "MOTOR DISCONNECTED" : "DRIVE CONNECTED"}</strong></div>
    <svg viewBox="0 0 360 188" role="img" aria-label={`${disconnected ? "The open clutch separates the motor and gearbox from the wheel. Motor assistance and electronic braking are off." : "The engaged clutch joins the powered motor and gearbox to the wheel."} The mechanical cable brake stays connected in both modes.`}>
      <path d="M12 33H274Q306 33 306 102" className="am-cable"/><path d="M20 25H52L57 32M25 38H50" className="am-lever"/>
      <text x="165" y="22" textAnchor="middle" className="am-label">MECHANICAL CABLE · ALWAYS CONNECTED</text>
      <rect x="15" y="82" width="93" height="57" rx="8" className="am-motor-box"/>
      <circle cx="38" cy="110" r="12" className="am-motor-symbol"/><path d="M29 110H47M38 101V119" className="am-motor-symbol"/>
      <text x="75" y="106" textAnchor="middle">MOTOR</text><text x="75" y="119" textAnchor="middle">+ GEAR</text>
      <path d="M109 110H153M204 110H269" className="am-shaft"/>
      <g className="am-clutch-left"><path d="M150 91V129M150 96H163V104H150M150 116H163V124H150"/></g>
      <g className="am-clutch-right"><path d="M191 91V129M191 104H177V112H191M191 124H177V132H191"/></g>
      <path d="M156 150H186M160 146L156 150L160 154M182 146L186 150L182 154" className="am-clutch-gap"/>
      <text x="172" y="171" textAnchor="middle" className="am-label">{disconnected ? "OPEN CLUTCH" : "DRIVE CLUTCH"}</text>
      <circle cx="292" cy="110" r="29" className="am-wheel"/><circle cx="292" cy="110" r="10" className="am-hub"/>
      <path d="M310 87V109" className="am-brake-pad"/>
      {disconnected && <path d="M313 135Q329 119 319 100M315 104L319 100L324 104" className="am-free-roll"/>}
      <text x="61" y="159" textAnchor="middle" className="am-label">ASSIST + DIGITAL</text>
      <text x="61" y="172" textAnchor="middle" className="am-label">{disconnected ? "BRAKING OFF" : "BRAKING ON"}</text>
      <text x="292" y="159" textAnchor="middle" className="am-label">{disconnected ? "MANUAL ROLLING" : "POWERED ROLLING"}</text>
    </svg>
    <p>{disconnected ? "The wheel turns without driving the motor or gearbox. Squeeze the handles to brake." : "Motor assistance and digital braking are available. The cable hand brakes also work."}</p>
  </div>;
}

export default function ManualExplainer() {
  const [mode, setMode] = useState<PowerMode>("powered");
  const [minutes, setMinutes] = useState(20), [activeW, setActiveW] = useState(40), [standbyW, setStandbyW] = useState(.1);
  const disconnected = mode !== "powered";
  const capacityWh = 150, usableWh = capacityWh * .8;
  const dailyWh = activeW * minutes / 60 + standbyW * (24 - minutes / 60);
  const hours = usableWh / dailyWh * 24, targetWh = dailyWh * 100 / 24 / .8;
  const status = mode === "powered" ? "Powered assist + hand brakes" : mode === "empty" ? "No battery. Push and brake by hand." : "Low battery → automatic manual mode";
  return <div className="ag-engineering ag-manual-design" data-power-mode={mode}>

    <div className="ag-ai-status"><i/>PROPOSED MECHANICAL DESIGN</div>
    <figure className="ag-manual-figure"><figcaption><span>Power changes. Hand brakes stay.</span><small>CONCEPT</small></figcaption>
      <div className="ag-power-tabs" role="group" aria-label="Explore battery states">{MODES.map(item => <button key={item.id} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}><strong>{item.title}</strong><small>{item.sub}</small></button>)}</div>
      <RollatorDrawing mode={mode} disconnected={disconnected}/>
      <div className="ag-auto-handoff" aria-live="polite"><GameIcon name={mode === "powered" ? "charge" : "manual"} size={20}/><span>{status}</span></div>
      <ClutchDrawing disconnected={disconnected}/>
    </figure>
    <dl className="ag-manual-capabilities">
      <div><dt>Hand & parking brakes</dt><dd className="is-available">Mechanical · all states</dd></div>
      <div><dt>Digital braking</dt><dd className={disconnected ? "is-unavailable" : "is-available"}>{disconnected ? "Off in manual mode" : "Available"}</dd></div>
      <div><dt>Drive assistance</dt><dd>{mode === "powered" ? "Available" : "Off · push manually"}</dd></div>
    </dl>
    <p className="ag-manual-architecture">Low battery opens the drive clutch. Keep walking manually, or swap the battery to restore power.</p>
    <details className="ag-engineering-notes"><summary>What this design needs<GameIcon name="arrow" size={14}/></summary>
      <p>The cable brake remains connected to the wheel in both modes. Opening the drive clutch removes motor and gearbox drag; bearings and tires still create rolling resistance. Digital braking and motor assistance are off in manual mode.</p>
      <p>A replaceable battery restores powered use when available. With no charged spare, the walker remains manually usable. Sensing and autonomous travel are unavailable at zero power.</p>
      <p>The automatic switch needs a verified stationary hold, clutch-position feedback and controlled release. A low-battery transition is not proof of safe behavior during abrupt power loss. Braking, rolling resistance and power-loss behavior still require hardware testing.</p>
      <a href="https://support.maxongroup.com/hc/en-us/articles/5881942527132-Gears-Self-locking-or-back-drivability" target="_blank" rel="noreferrer">maxon: motor + gear backdrivability ↗</a>
    </details>
    <section className="ag-battery-budget" aria-label="Illustrative battery energy calculator"><span className="ag-kicker">100 H MIXED-USE DESIGN TARGET · NOT MEASURED</span><h3>Explore the energy budget</h3><p>Hypothetical 150 Wh pack · 80% usable for this budget. The remaining 20% is an assumed operating margin.</p>
      <label>Active / awake use per day <strong>{minutes} min</strong><input type="range" min="10" max="120" step="5" value={minutes} aria-label="Daily active awake use" onChange={event => setMinutes(Number(event.target.value))}/></label>
      <label>Total active power <strong>{activeW} W</strong><input type="range" min="20" max="100" step="5" value={activeW} aria-label="Total active battery power" onChange={event => setActiveW(Number(event.target.value))}/></label>
      <label>Standby power <strong>{standbyW.toFixed(1)} W</strong><input type="range" min=".1" max="2" step=".1" value={standbyW} aria-label="Standby battery power" onChange={event => setStandbyW(Number(event.target.value))}/></label>
      <div className="ag-battery-results" aria-live="polite"><span><strong>{Math.round(hours)} h</strong>arithmetic result at these inputs</span><span><strong>{Math.ceil(targetWh)} Wh</strong>nominal capacity for 100 h</span></div>
      <p className="ag-battery-formula">Daily Wh = active W × active hours + standby W × remaining hours<br/>100 h pack = daily Wh × (100 ÷ 24) ÷ 0.8</p>
      <p>Active use includes all awake sensing, computing, driving and clutch power. The 0.1 W standby input assumes sleep/wake hardware; it does not include continuous AI or fall monitoring. Terrain, load, ageing and temperature change runtime. No pack has been selected or tested.</p>
    </section>
  </div>;
}

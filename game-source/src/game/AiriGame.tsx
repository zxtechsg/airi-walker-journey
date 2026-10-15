import { useCallback, useEffect, useRef, useState } from "react";
import GameScene from "./GameScene";
import FeatureViewer from "./FeatureViewer";
import CounterfactualClip from "./CounterfactualClip";
import BatterySwapScene from "./BatterySwapScene";
import { CHALLENGES, SUPPORT_CARDS } from "./content";
import { GameIcon } from "./GameIcon";
import { gameAudio } from "./gameAudio";
import { useGameVoice, type GameVoiceResult } from "./useGameVoice";
import { EMPTY_CONTROLS, type ChallengeId, type CinematicId, type PowerMode, type GameControls, type GamePhase, type GameSceneEvent, type SeatId } from "./types";
import "./game.css";
import "./gamePower.css";

type CardId = ChallengeId | "sit" | "stand";
const isMovement = (phase: GamePhase) => phase === "street" || phase === "apartment";
const STREET_HAZARDS = CHALLENGES.filter(challenge => challenge.id !== "battery");

function MiniMap({ completed, position, manual }: { manual: boolean; completed: ChallengeId[]; position: { x: number; z: number; heading: number } }) {
  const x = (n: number) => 20 + (n + 9) / 18 * 130, y = (n: number) => 18 + (n + 35) / 41 * 157;
  return <div className="ag-map"><div><span>WILLOW LANE</span><small>{completed.filter(id => id !== "battery").length} / {STREET_HAZARDS.length}</small></div><svg viewBox="0 0 170 190" role="img" aria-label="Map of four obstacles along Willow Lane">
    <path d="M22 5h126v180H22Z" fill="#e2d3ad"/><path d="M45 5v180M125 5v180" stroke="#c2b591" strokeWidth="2"/><path d="M85 5v180" stroke="#c2b591" strokeDasharray="5 8"/>
    <path d="M4 14h30v22H4zM137 42h29v27h-29zM5 73h29v33H5zM137 110h29v30h-29zM4 145h30v22H4z" fill="#b9b296"/>
    {STREET_HAZARDS.map(c => <g key={c.id} transform={`translate(${x(c.x)},${y(c.z)})`}><circle r="10" fill={completed.includes(c.id) ? "#647b64" : "#3aa773"} stroke="#f6eaca" strokeWidth="2"/>{completed.includes(c.id) ? <path d="m-4 0 3 3 5-6" fill="none" stroke="#fff1cc" strokeWidth="1.8"/> : <circle r="2.5" fill="#fff1cc"/>}</g>)}
    {manual && <g transform={`translate(${x(-4)},${y(-33)})`}><circle r="11" fill="#fff4d7"/><path d="m-6 0 6-5 6 5v6H-6Z" fill="#34765a"/></g>}
    <g transform={`translate(${x(position.x)},${y(position.z)}) rotate(${-position.heading * 180 / Math.PI})`}><circle r="8" fill="#fff4d7"/><path d="m0-6 4.5 10L0 2l-4.5 2Z" fill="#274d4d"/></g>
  </svg><span className="ag-map-note"><i/>{manual ? "Walk to the home marker" : "Head for the green glow"}</span></div>;
}

export default function AiriGame() {
  const [phase, setPhase] = useState<GamePhase>("title"), [completed, setCompleted] = useState<ChallengeId[]>([]);
  const [card, setCard] = useState<CardId | null>(null), [seat, setSeat] = useState<SeatId>("sofa"), [nearSeat, setNearSeat] = useState<SeatId | null>(null);
  const [paused, setPaused] = useState(false), [help, setHelp] = useState(false), [sound, setSound] = useState(true), [session, setSession] = useState(0);
  const [cinematic, setCinematic] = useState<CinematicId | null>(null), [clipPaused, setClipPaused] = useState(false);
  const [actuation, setActuation] = useState<{ braking: boolean; assist: boolean; power: PowerMode; stage: string }>({ braking: false, assist: false, power: "powered", stage: "" });
  const [ready, setReady] = useState(false), [sceneError, setSceneError] = useState("");
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [position, setPosition] = useState({ x: 0, z: 3, heading: 0 });
  const [lastCommand, setLastCommand] = useState<GameVoiceResult | null>(null);
  const controls = useRef<GameControls>({ ...EMPTY_CONTROLS });
  const phaseRef = useRef(phase), completedRef = useRef(completed), blockedRef = useRef(false), nearRef = useRef(nearSeat);
  phaseRef.current = phase; completedRef.current = completed; nearRef.current = nearSeat; blockedRef.current = paused || help || card !== null || hidden || cinematic !== null;
  const pauseAction = useRef<() => void>(() => {});
  const voiceAction = useRef<() => void>(() => {});
  const onIntent = useCallback((result: GameVoiceResult) => {
    if (blockedRef.current) return;
    if (result.intent === "unknown") return;
    if (result.intent === "dock" && phaseRef.current === "seated") { setLastCommand(result); setPhase("docking"); gameAudio.chime("step"); }
    if (result.intent === "help_stand" && (phaseRef.current === "recall" || phaseRef.current === "seated")) { setLastCommand(result); if (phaseRef.current === "seated") setCard("stand"); else setPhase("returning"); gameAudio.chime("step"); }
  }, []);
  const voice = useGameVoice({ context: blockedRef.current ? "other" : phase === "seated" ? "seated" : phase === "recall" ? "recall" : "other", onIntent });
  voiceAction.current = () => { if (!voice.busy) void (voice.listening ? voice.stopListening() : voice.startListening()); };
  const clearMovement = useCallback(() => { controls.current = { ...EMPTY_CONTROLS }; }, []);
  const reset = useCallback((next: GamePhase = "title") => {
    clearMovement(); voice.clear(); gameAudio.setEnvironment("off"); setCinematic(null); setCompleted([]); setCard(null); setNearSeat(null); setSeat("sofa"); setPaused(false); setHelp(false); setLastCommand(null);
    setActuation({ braking: false, assist: false, power: "powered", stage: "" }); setReady(false); setSceneError(""); setSession(s => s + 1); setPhase(next); setPosition({ x: 0, z: 3, heading: 0 });
  }, [clearMovement, voice.clear]);
  const interact = useCallback(() => {
    if (blockedRef.current || phaseRef.current !== "apartment" || !nearRef.current) return;
    setSeat(nearRef.current); clearMovement(); setPhase("sitting"); gameAudio.chime("step");
  }, [clearMovement]);
  const toggleSound = useCallback(() => { setSound(value => { const next = !value; void gameAudio.start(next); return next; }); }, []);
  pauseAction.current = () => { clearMovement(); voice.clear(); if (help) setHelp(false); else setPaused(value => !value); };
  useEffect(() => {
    document.title = "The Million Dollar Stroll — AIRI";
    const keyMap: Record<string, keyof GameControls> = { KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", Space: "brake" };
    const down = (event: KeyboardEvent) => {
      if (event.code === "Escape" && !event.repeat && (blockedRef.current || !["title", "viewer", "ending"].includes(phaseRef.current))) { event.preventDefault(); pauseAction.current(); return; }
      if (event.target instanceof HTMLElement && (event.target.closest("input,textarea,select") || event.target.isContentEditable)) return;
      if (event.code === "KeyM" && !event.repeat) { toggleSound(); return; }
      if (blockedRef.current) return;
      if (event.code === "Space" && (phaseRef.current === "seated" || phaseRef.current === "recall")) {
        if (event.target instanceof HTMLElement && event.target.closest("button,a,[role='button']")) return;
        event.preventDefault();
        if (!event.repeat) voiceAction.current();
        return;
      }
      const action = keyMap[event.code];
      if (action && isMovement(phaseRef.current)) { event.preventDefault(); controls.current[action] = true; }
      if (event.code === "KeyE" && !event.repeat) { event.preventDefault(); interact(); }
    };
    const up = (event: KeyboardEvent) => { const action = keyMap[event.code]; if (action) controls.current[action] = false; };
    const blur = () => { clearMovement(); gameAudio.suspend(); };
    const focus = () => gameAudio.resume();
    const visibility = () => { setHidden(document.hidden); if (document.hidden) blur(); else focus(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); clearMovement(); gameAudio.dispose(); };
  }, [clearMovement, interact, toggleSound]);
  useEffect(() => { clearMovement(); }, [phase, card, paused, help, cinematic, clearMovement]);
  useEffect(() => { setClipPaused(false); }, [card]);
  useEffect(() => { gameAudio.setEnvironment(["title", "intro", "street"].includes(phase) ? "street" : phase === "viewer" ? "off" : "home"); }, [phase, session]);
  useEffect(() => { gameAudio.setPaused(paused || help || hidden || voice.listening); }, [paused, help, hidden, voice.listening]);
  useEffect(() => {
    if (phase === "intro" || phase === "ending") void gameAudio.narrate(`/airi-walker-journey/game/assets/airi-game/${phase === "intro" ? "intro" : "ending"}-voice.wav`);
    else gameAudio.stopNarration();
    return () => gameAudio.stopNarration();
  }, [phase]);
  useEffect(() => {
    const modal = document.querySelector<HTMLElement>(paused || help ? ".ag-pause-menu" : card ? ".ag-feature-card" : ".ag-no-modal");
    if (!modal) return;
    const previous = document.activeElement;
    const focusable = () => Array.from(modal.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),[tabindex='0']"));
    const first = modal.querySelector<HTMLElement>(".ag-continue") || focusable()[0]; if (first) first.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = focusable(), first = list[0], last = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [card, paused, help]);
  useEffect(() => { if (phase !== "timeJump" || paused || help || hidden) return; const timer = window.setTimeout(() => setPhase("recall"), 1400); return () => clearTimeout(timer); }, [phase, paused, help, hidden]);
  const onEvent = useCallback((event: GameSceneEvent) => {
    if (event.type === "ready") setReady(true);
    else if (event.type === "actuation") setActuation({ braking: event.braking, assist: event.assist, power: event.power, stage: event.stage });
    else if (event.type === "manual-finished" && phaseRef.current === "street") setPhase("batterySwap");
    else if (event.type === "cinematic") setCinematic(event.active ? event.id ?? null : null);
    else if (event.type === "error") { setSceneError(event.message); setCinematic(null); }
    else if (event.type === "position") setPosition({ x: event.x, z: event.z, heading: event.heading });
    else if (event.type === "near-seat") setNearSeat(event.seat);
    else if (event.type === "challenge") {
      if (phaseRef.current !== "street" || completedRef.current.includes(event.id)) return;
      setCinematic(null); setCompleted(value => value.includes(event.id) ? value : [...value, event.id]);
      if (event.id !== "battery") setCard(event.id);
      gameAudio.chime(event.id === "battery" ? "step" : "save");
    } else if (event.type === "sat" && phaseRef.current === "sitting") { setSeat(event.seat); setPhase("seated"); setCard("sit"); gameAudio.chime("save"); }
    else if (event.type === "docked" && phaseRef.current === "docking") { setPhase("timeJump"); gameAudio.chime("step"); }
    else if (event.type === "returned" && phaseRef.current === "returning") { setCard("stand"); gameAudio.chime("save"); }
    else if (event.type === "stood" && phaseRef.current === "standing") { setPhase("ending"); gameAudio.chime("win"); }
  }, []);
  const continueCard = () => {
    if (card === "stand") setPhase("standing");
    setCard(null); gameAudio.chime("step");
  };
  const start = () => { void gameAudio.start(sound); setPhase("intro"); gameAudio.chime("step"); };
  const scenePaused = paused || help || card !== null || hidden;
  const cardCopy = card === "sit" || card === "stand" ? SUPPORT_CARDS[card] : CHALLENGES.find(c => c.id === card);
  const playing = !["title", "viewer", "ending"].includes(phase);
  const voicePhase = phase === "seated" || phase === "recall";
  const nearestObstacle = STREET_HAZARDS.filter(challenge => !completed.includes(challenge.id)).sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z))[0];
  const guideTarget = actuation.power === "manual" ? { x: -4, z: -33 } : nearestObstacle;
  const guideAngle = guideTarget ? Math.atan2(guideTarget.x - position.x, position.z - guideTarget.z) * 180 / Math.PI : 0;
  const chapter = ["title", "intro", "street"].includes(phase) ? "01 / A WALK ON THE WILD SIDE" : "02 / THE COMFORT OF HOME";
  if (phase === "viewer") return <main className={`airi-game ${reducedMotion ? "ag-reduced-motion" : ""}`}><FeatureViewer reducedMotion={reducedMotion} onHome={() => reset()} onReplay={() => { reset("intro"); void gameAudio.start(sound); }}/></main>;
  return <main className={`airi-game ag-phase-${phase} ${cinematic ? "ag-cinematic" : ""} ${reducedMotion ? "ag-reduced-motion" : ""}`} data-phase={phase}>
    <div className="ag-scene"><GameScene phase={phase} paused={scenePaused} completed={completed} seat={seat} session={session} controls={controls} onEvent={onEvent} reducedMotion={reducedMotion}/></div>
    <div className="ag-vignette"/>
    {!cinematic && <header className="ag-header"><button className="ag-wordmark" onClick={() => phase === "title" ? setHelp(true) : pauseAction.current()} aria-label={phase === "title" ? "About AIRI" : "Pause game"}>AIRI<span>KEEP YOUR WORLD OPEN</span></button>
      {playing && <div className="ag-chapter"><i/>{chapter}</div>}
      <nav><button className="ag-icon-button" onClick={toggleSound} aria-label={sound ? "Mute game sound" : "Enable game sound"} aria-pressed={sound}><GameIcon name={sound ? "sound" : "mute"} size={20}/></button><button className="ag-icon-button" onClick={() => { clearMovement(); setHelp(true); }} aria-label="How to play"><GameIcon name="help" size={20}/></button>{playing && <button className="ag-icon-button" onClick={() => pauseAction.current()} aria-label="Pause game"><GameIcon name="pause" size={20}/></button>}</nav>
    </header>}
    {cinematic && <div className="ag-hazard-cinema-bars" aria-hidden="true"/>}
    {!card && !scenePaused && !voicePhase && !(phase === "street" && actuation.power === "manual" && !cinematic) && cinematic !== "battery" && !["title", "intro", "batterySwap", "homeIntro", "timeJump"].includes(phase) && actuation.braking && <div className="ag-brake-signal" role="status"><i/>BRAKE<small>{actuation.power === "manual" ? "MECHANICAL HANDBRAKES" : "WHEEL BRAKE HOLD"}</small></div>}
    {cinematic === "assist" && <div className="ag-power-caption"><span>{actuation.stage === "load" ? "HANDLE LOAD CELLS" : "FORWARD MOTOR ASSIST"}</span><h2>{actuation.stage === "load" ? "Hand pressure detected." : "Motors assist your movement."}</h2></div>}
    {cinematic === "battery" && <div className={`ag-power-transition ag-power-${actuation.stage}`} aria-live="polite">
      <span className="ag-kicker">{actuation.stage === "manual" ? "MANUAL MODE" : "LOW BATTERY"}</span>
      <h2>{actuation.stage === "hold" ? "Switching to manual." : actuation.stage === "disconnect" ? "Motors disengage." : "Keep walking."}</h2>
      <div className="ag-clutch-diagram"><span>MOTOR<br/>{actuation.stage === "hold" ? "CONNECTED" : "OFF"}</span><svg viewBox="0 0 260 72" aria-label="Motor drive disconnects; cable hand brakes stay connected"><path className="ag-clutch-shaft" d="M12 36h75m90 0h71"/><g className="ag-clutch-left"><path d="M88 19h24v34H88zm24 6h13v8h-13m0 6h13v8h-13"/></g><g className="ag-clutch-right"><path d="M148 19h24v34h-24zm-13 6h13v8h-13m0 6h13v8h-13"/></g><circle className="ag-clutch-wheel" cx="226" cy="36" r="24"/><path className="ag-clutch-cable" d="M224 6V-2h-45"/></svg><span>HAND BRAKE<br/>CONNECTED</span></div>
      <p>{actuation.stage === "hold" ? "AIRI switches before power runs out." : actuation.stage === "disconnect" ? "Drive disconnects. Electronic braking turns off." : "Easy to push. Cable hand brakes still work."}</p>
    </div>}

    {phase === "title" && <section className="ag-title-screen"><div className="ag-title-copy"><span className="ag-kicker"><i/>AN UNLIKELY LITTLE ADVENTURE</span><h1>THE MILLION<br/>DOLLAR<br/><span>STROLL.</span></h1><p>A very bad bet.<br/>A very good walker.</p><div className="ag-title-actions"><button className="ag-button ag-button-cream" onClick={start} disabled={!ready || Boolean(sceneError)}>Start game <GameIcon name="arrow"/></button><button className="ag-text-button" onClick={() => setPhase("viewer")}>Meet AIRI <GameIcon name="arrow" size={16}/></button></div><div className="ag-title-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to stroll</span><span>5 min · headphones optional</span></div></div><div className="ag-grandma-tag"><span>MEET ROSE.</span><p>Retired botanist.<br/>Unretired adventurer.</p><GameIcon name="leaf" size={30}/></div></section>}
    {phase === "intro" && <><div className="ag-cinema-bars"/><section className="ag-dialogue ag-offer" aria-label="Opening scene"><span className="ag-kicker">A SUSPICIOUSLY GENEROUS STRANGER</span><h2>“One million dollars.<br/>If you can make her stumble.”</h2><p>He clearly hasn't met Rose. Or her walker.</p><div><button className="ag-button ag-button-cream" onClick={() => { setPhase("street"); gameAudio.chime("step"); }}>You're on. <GameIcon name="arrow"/></button><span>A terrible idea. An excellent demonstration.</span></div></section></>}
    {phase === "street" && !cinematic && <>
      {!scenePaused && <section className="ag-voice-invite ag-action-prompt ag-street-prompt" aria-label="Current objective">
        <h1>{actuation.power === "manual" ? "Keep walking." : "Overcome all four obstacles"}</h1>
        <p>{actuation.power === "manual" ? "Follow the home marker." : "Find each green marker. Try to make Rose stumble."}</p>
        {actuation.power === "manual" && <div className={`ag-manual-brake-hint ${actuation.braking ? "is-braking" : ""}`} role="status"><span>{actuation.braking ? "Hand brake on" : <>Press <kbd>SPACE</kbd> to brake</>}</span><small>{actuation.braking ? "Release Space to keep walking." : "Hold to keep the wheels stopped."}</small></div>}
        {guideTarget && <div className={`ag-wayfinder ${actuation.power === "manual" ? "is-manual" : ""}`} aria-label={`Direction to ${actuation.power === "manual" ? "home" : nearestObstacle?.name}`}><svg viewBox="0 0 48 48" aria-hidden="true" style={{ transform: `rotate(${guideAngle}deg)` }}><path d="M24 39V9m-10 11L24 9l10 11"/></svg><span>{actuation.power === "manual" ? "Home" : "Nearest obstacle"}</span></div>}
      </section>}
      <aside className="ag-objective"><span className="ag-kicker">{actuation.power === "manual" ? "MANUAL MODE" : "YOUR PROGRESS"}</span>
        {actuation.power !== "manual" && <div className="ag-progress-dots">{STREET_HAZARDS.map(c => <span key={c.id} className={completed.includes(c.id) ? "done" : ""} title={c.name}><GameIcon name={completed.includes(c.id) ? "check" : c.id} size={18}/></span>)}<small>{completed.filter(id => id !== "battery").length} / {STREET_HAZARDS.length} attempts</small></div>}
        <div className={`ag-power-badge ${actuation.power === "manual" ? "manual" : ""}`}><GameIcon name="battery" size={19}/>{actuation.power === "manual" ? "0% · MANUAL MODE" : "POWERED ASSIST"}{actuation.power === "manual" && <small>No power needed. Swap the battery when ready.</small>}</div>{actuation.braking && <div className="ag-mobile-brake-label">BRAKE<small>{actuation.power === "manual" ? "MECHANICAL HANDBRAKES" : "WHEEL BRAKE HOLD"}</small></div>}
      </aside>
      <MiniMap completed={completed} position={position} manual={actuation.power === "manual"}/>

      <div className="ag-wager"><span>THE WAGER</span><strong>$1,000,000</strong><small>Grandma status <i/> Unbothered</small></div>
    </>}
    {phase === "batterySwap" && <BatterySwapScene paused={paused || help || hidden} reducedMotion={reducedMotion} onComplete={() => setPhase("homeIntro")}/>}
    {phase === "homeIntro" && <section className="ag-interlude"><span className="ag-kicker">STILL ON HER FEET.</span><h1>A well-earned<br/><em>cup of tea.</em></h1><p>The street didn't work. Perhaps a simple seat<br/>will finally outsmart this walker.</p><button className="ag-button ag-button-cream" onClick={() => { setNearSeat(null); setPhase("apartment"); }}>Take us home <GameIcon name="home"/></button></section>}
    {phase === "apartment" && <>
      {!scenePaused && <section className="ag-voice-invite ag-action-prompt" aria-label="Choose a seat"><h1>{nearSeat ? "Take a seat." : "Choose a seat."}</h1><p>{nearSeat ? `Rose is beside the ${nearSeat}.` : "Walk to the sofa or chair."}</p>{nearSeat ? <button className="ag-voice-space ag-seat-action" onClick={interact}><kbd>E</kbd> Sit on the {nearSeat}<GameIcon name="arrow" size={19}/></button> : <div className="ag-seat-choices"><span><GameIcon name="seat" size={18}/>Sofa</span><span><GameIcon name="seat" size={18}/>Chair</span></div>}</section>}
      <div className="ag-home-location"><GameIcon name="home" size={17}/><span>ROSE'S PLACE<small>Tea is always a good idea.</small></span></div>
    </>}
    {phase === "sitting" && <div className="ag-scene-caption"><span>SUPPORT MODE</span><h2>Easy does it, Rose.</h2><p>Steady wheels. A seat at her own pace.</p></div>}
    {voicePhase && !scenePaused && <div className={`ag-voice-invite ag-action-prompt ${voice.listening ? "is-listening" : ""}`}>
      <h1>{voice.listening ? "Listening…" : voice.busy ? "One moment…" : "Type to control"}</h1>
      <button className="ag-voice-space" onClick={() => voiceAction.current()} disabled={voice.busy || !voice.available} aria-label={voice.listening ? "Finish voice command" : "Start voice control"} aria-keyshortcuts="Space"><kbd>SPACE</kbd><span>{voice.listening ? "to send" : "to speak"}</span><GameIcon name={voice.listening ? "check" : "mic"} size={19}/></button>
      <p>{voice.available ? voice.listening ? "Press Space again when you're done." : phase === "seated" ? 'Try “Go charge”.' : 'Try “Help me out”.' : "Type a request below, or choose an example."}</p>
    </div>}
    {voicePhase && !card && <section className="ag-voice-card" aria-label="Talk to AIRI"><div className="ag-voice-heading"><span className="ag-voice-mark"><GameIcon name={phase === "seated" ? "charge" : "mic"} size={23}/></span><div><span className="ag-kicker">{phase === "seated" ? "ROSE RESTS. AIRI RECHARGES." : "READY FOR ANOTHER STROLL?"}</span><h2>{phase === "seated" ? "Send AIRI to charge." : "Call your companion back."}</h2></div></div><p>{phase === "seated" ? "Ask AIRI to charge, or help you stand." : "Ask AIRI to come over and help you get up."}</p>
      <form onSubmit={event => { event.preventDefault(); void voice.submitText(); }}><button type="button" className={`ag-mic ${voice.listening ? "listening" : ""}`} onClick={() => void (voice.listening ? voice.stopListening() : voice.startListening())} disabled={voice.busy || !voice.available} aria-label={voice.listening ? "Finish speaking" : "Speak to AIRI"} title={voice.available ? "Local speech recognition" : "Type a command below; microphone unavailable"}><GameIcon name={voice.listening ? "check" : "mic"} size={23}/></button><input aria-label="Command for AIRI" placeholder={phase === "seated" ? "Hey AIRI, go charge…" : "AIRI, come help me up…"} value={voice.text} onChange={event => voice.setText(event.target.value)} maxLength={500} disabled={voice.busy || voice.listening}/><button className="ag-send" type="submit" disabled={voice.busy || voice.listening || !voice.text.trim()} aria-label="Send command"><GameIcon name="arrow" size={22}/></button></form>
      <div className="ag-voice-status" aria-live="polite">{voice.listening ? <span className="ag-listening"><i/><i/><i/><i/><i/>Listening… Space or ✓ to send</span> : voice.busy ? <span className="ag-thinking"><i/>Processing your request…</span> : voice.error ? <span className="ag-voice-error">{voice.error}</span> : <span>{voice.available ? "Press Space, click the mic, or type." : "Type a request, or use a phrase below."}</span>}</div>
      <div className="ag-voice-examples"><span>TRY SAYING</span>{(phase === "seated" ? ["Go charge", "Top up your battery", "Help me up"] : ["Help me out", "Come back to me"]).map(text => <button key={text} onClick={() => { voice.setText(text); void voice.submitText(text); }} disabled={voice.busy || voice.listening}>“{text}”</button>)}</div><small className="ag-voice-local">Browser demo · text controls · no AI inference</small>
    </section>}
    {(phase === "docking" || phase === "returning") && <div className="ag-scene-caption"><span>{phase === "docking" ? "AUTONOMOUS CHARGING" : "RETURN TO ROSE"}</span><h2>{phase === "docking" ? "Going to the charger." : "Returning to Rose."}</h2>{lastCommand && <p>“{lastCommand.text}”<small>{lastCommand.source === "local_instruct" ? "Qwen 3.5 · local intent model" : "Browser command match"}</small></p>}{phase === "docking" && <p className="ag-charge-design-note"><strong>100-hour battery-life target</strong>Mixed use · runtime to be validated</p>}</div>}
    {phase === "timeJump" && <section className="ag-time-jump"><span className="ag-kicker">ONE CUP OF TEA LATER</span><h1>20 minutes later.</h1><div className="ag-clock"><i/></div><p>Rose is recharged, too.</p></section>}
    {phase === "standing" && <div className="ag-scene-caption"><span>STANDING SUPPORT</span><h2>Holding the wheels<br/>while Rose stands.</h2><p>AIRI holds steady while Rose rises.</p></div>}
    {phase === "ending" && <section className="ag-ending"><div className="ag-confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * -.37}s`, background: ["#e1b764", "#c76e45", "#84967c", "#f4e2b9"][i % 4], transform: `rotate(${i * 37}deg)` }}/>)}</div><span className="ag-kicker">THE RESULTS ARE IN.</span><h1>CONGRATS!<br/><span>YOU FAILED.</span></h1><p>You didn't win a million dollars.<br/>But Rose got home safe. We'll take it.</p><div className="ag-scoreboard"><span><strong>0</strong>falls</span><span><strong>$0</strong>winnings</span><span><strong>1</strong>very smug grandma</span></div><button className="ag-button ag-button-cream" onClick={() => setPhase("viewer")}>Meet the walker behind it all <GameIcon name="arrow"/></button><button className="ag-text-button" onClick={() => reset("intro")}>Try your luck again</button></section>}
    {card && cardCopy && <div className="ag-card-shade"><section className={`ag-feature-card ${card !== "sit" && card !== "stand" && card !== "battery" ? "ag-with-preview" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ag-save-title">
      {card !== "sit" && card !== "stand" && card !== "battery" && <div className="ag-feature-preview"><div className="ag-preview-heading"><span>WITHOUT ASSISTANCE</span>{!reducedMotion && <button onClick={() => setClipPaused(v => !v)} aria-label={clipPaused ? "Play illustration" : "Pause illustration"}><GameIcon name={clipPaused ? "play" : "pause"} size={15}/></button>}</div><CounterfactualClip challenge={card} reducedMotion={reducedMotion} paused={clipPaused || paused || help || hidden}/><div className="ag-save-pipeline"><span><GameIcon name={card === "ice" ? "motion" : card === "gap" ? "pause" : "lidar"} size={19}/>{card === "gap" ? "Pause" : "Sense"}</span><i>→</i><span><GameIcon name={card === "gap" ? "adjust" : "compute"} size={19}/>{card === "gap" ? "Narrow" : "Assess"}</span><i>→</i><span><GameIcon name={card === "gap" ? "lock" : "wheels"} size={19}/>{card === "gap" ? "Lock" : "Brake"}</span></div></div>}
      <div className="ag-card-story"><span className="ag-save-seal"><GameIcon name={card === "sit" ? "seat" : card === "stand" ? "grips" : card} size={31}/></span><span className="ag-kicker">{cardCopy.feature}</span><h2 id="ag-save-title">{cardCopy.title}</h2><p>{cardCopy.body}</p><blockquote>{cardCopy.quote}</blockquote><button className="ag-button ag-button-rust ag-continue" onClick={continueCard} autoFocus>{card === "stand" ? "Help Rose stand" : card === "sit" ? "Let AIRI recharge" : card === "battery" ? "Keep walking manually" : completed.filter(id => id !== "battery").length === STREET_HAZARDS.length ? "Continue walking" : "I'll try something else"}<GameIcon name="arrow" size={19}/></button><small>A concept brought to life through play.</small></div>
    </section></div>}
    {isMovement(phase) && !scenePaused && !cinematic && <><div className="ag-keyboard-hint"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>{phase === "apartment" && <span><kbd>E</kbd> Sit</span>}{actuation.power === "manual" && <span><kbd>SPACE</kbd> Handbrake</span>}<span><kbd>ESC</kbd> Pause</span></div><div className="ag-touch-pad" aria-label="Movement controls">{([['forward','↑'],['left','←'],['back','↓'],['right','→']] as const).map(([action,label]) => <button key={action} className={`ag-touch-${action}`} aria-label={`Move ${action}`} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controls.current[action] = true; }} onPointerUp={() => { controls.current[action] = false; }} onPointerCancel={() => { controls.current[action] = false; }} onLostPointerCapture={() => { controls.current[action] = false; }}>{label}</button>)}</div>{actuation.power === "manual" && <button className="ag-touch-brake" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controls.current.brake = true; }} onPointerUp={() => { controls.current.brake = false; }} onPointerCancel={() => { controls.current.brake = false; }} onLostPointerCapture={() => { controls.current.brake = false; }}>Hold brake</button>}</>}
    {(paused || help) && <div className="ag-menu-shade"><section className="ag-pause-menu" role="dialog" aria-modal="true" aria-labelledby="ag-menu-title"><button className="ag-menu-close" onClick={() => { setPaused(false); setHelp(false); }} aria-label="Close menu"><GameIcon name="close"/></button><GameIcon name="leaf" size={35}/><span className="ag-kicker">TAKE THE SCENIC PAUSE.</span><h2 id="ag-menu-title">{help ? "A very good bad idea." : "No rush, Rose."}</h2><p>{help ? "Explore the street. Try the glowing obstacles. Then help Rose sit, send AIRI to charge and call it back with a text command." : "The million dollars can wait a moment."}</p><div className="ag-how-keys"><span><kbd>W A S D</kbd> or arrows to walk</span><span><kbd>E</kbd> sit · <kbd>SPACE</kbd> manual brake / type when seated</span><span><kbd>M</kbd> sound · <kbd>ESC</kbd> pause</span></div><label className="ag-motion-setting"><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/>Less camera motion</label><button className="ag-button ag-button-rust" onClick={() => { setPaused(false); setHelp(false); }} autoFocus>{phase === "title" ? "Got it" : "Back to the stroll"}<GameIcon name="arrow" size={18}/></button>{phase !== "title" && <button className="ag-text-button" onClick={() => reset()}>Back to the title</button>}<small>This is a fictional game showing proposed AIRI features. The scripted saves aren't evidence of real-world fall prevention.</small></section></div>}
    {!ready && !sceneError && <div className="ag-loading"><span className="ag-loading-sun"/><span>Finding the scenic route…</span></div>}
    {sceneError && <div className="ag-loading ag-error" role="alert"><GameIcon name="leaf" size={38}/><h2>The world couldn't open.</h2><p>{sceneError}</p><button className="ag-button ag-button-cream" onClick={() => window.location.reload()}>Try again</button><button className="ag-text-button" onClick={() => setPhase("viewer")}>Explore the walker</button></div>}
    {phase === "title" && <footer className="ag-title-footer"><a href="../">← AIRI website</a><span>Browser demo · text commands</span><button onClick={() => setHelp(true)}>How to play <GameIcon name="arrow" size={14}/></button></footer>}
    {playing && !cinematic && !["intro", "batterySwap", "homeIntro", "timeJump"].includes(phase) && <span className="ag-concept-mark">AIRI CONCEPT GAME</span>}
  </main>;
}

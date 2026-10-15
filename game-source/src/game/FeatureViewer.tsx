import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createWalker } from "./models";
import { FEATURES, PHYSICAL_FEATURES } from "./content";
import { GameIcon } from "./GameIcon";
import FeatureExplainer from "./FeatureExplainer";
import type { FeatureId, ShowcaseId } from "./types";
import "./featureTour.css";

export default function FeatureViewer({ onReplay, onHome, reducedMotion = false }: { onReplay: () => void; onHome: () => void; reducedMotion?: boolean }) {
  const [selected, setSelected] = useState<ShowcaseId>("grips"), [folded, setFolded] = useState(false), [rotating, setRotating] = useState(!reducedMotion), [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null), dots = useRef(new Map<FeatureId, HTMLButtonElement>());
  const copy = useRef<HTMLElement>(null), detail = useRef<HTMLDivElement>(null);
  const tourStart = useRef<HTMLDivElement>(null), index = useRef<HTMLDetailsElement>(null);
  const state = useRef({ selected, folded, rotating, reducedMotion }); state.current = { selected, folded, rotating, reducedMotion };
  const feature = FEATURES.find(f => f.id === selected)!;
  const featureIndex = FEATURES.findIndex(f => f.id === selected);
  const previous = FEATURES[featureIndex - 1], next = FEATURES[featureIndex + 1];
  const selectFeature = (id: ShowcaseId) => {
    setSelected(id);
    if (index.current) index.current.open = false;
    requestAnimationFrame(() => {
      if (window.innerWidth <= 700) tourStart.current?.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" });
      else copy.current?.scrollTo({ top: Math.max(0, (tourStart.current?.offsetTop ?? 0) - 12), behavior: "instant" });
    });
  };
  useEffect(() => {
    const target = host.current;
    if (!target) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError("The 3D view couldn't start. The design reference is shown below."); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute("aria-label", "AIRI concept model. Drag to rotate. Scroll to zoom. Choose a numbered feature.");
    renderer.domElement.setAttribute("role", "img"); target.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#ddd5b9"); scene.fog = new THREE.Fog("#ddd5b9", 7, 18);
    const camera = new THREE.PerspectiveCamera(37, 1, .02, 40); camera.position.set(1.9, 1.55, -2.65);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .65, 0);
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.5; controls.maxDistance = 5;
    controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI * .49; controls.autoRotateSpeed = .45;
    controls.addEventListener("start", () => setRotating(false));
    const walker = createWalker(); scene.add(walker.group);
    const hemi = new THREE.HemisphereLight("#fff2cb", "#5c7770", 3); scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff0cc", 4.2); sun.position.set(-3, 6, -4); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -3; sun.shadow.camera.right = 3; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3; sun.shadow.normalBias = .014;
    scene.add(sun); const rim = new THREE.DirectionalLight("#fff9e7", 2); rim.position.set(4, 3, 2); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: "#d3caac", roughness: .98 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.009; floor.receiveShadow = true; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.94, .95, 96), new THREE.MeshBasicMaterial({ color: "#a89e7f", side: THREE.DoubleSide, transparent: true, opacity: .5 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .002; scene.add(ring);
    const point = new THREE.Vector3(); let frame = 0, last = performance.now(), fold = 0;
    const resize = () => { const w = target.clientWidth, h = target.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(target); resize();
    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      controls.autoRotate = state.current.rotating;
      fold += ((state.current.folded ? 1 : 0) - fold) * (state.current.reducedMotion ? 1 : Math.min(1, dt * 5));
      walker.setFold(fold); walker.setBraking(state.current.selected === "wheels"); walker.animate(dt, 0);
      controls.update();
      for (const item of PHYSICAL_FEATURES) {
        const dot = dots.current.get(item.anchor); if (!dot) continue;
        point.copy(walker.hotspots[item.anchor]);
        walker.group.localToWorld(point); point.project(camera);
        const x = (point.x * .5 + .5) * target.clientWidth, y = (-point.y * .5 + .5) * target.clientHeight;
        dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        dot.style.visibility = point.z > 1 || point.z < -1 ? "hidden" : "visible";
      }
      renderer.render(scene, camera); frame = requestAnimationFrame(draw);
    };
    const lost = (event: Event) => { event.preventDefault(); setError("3D was interrupted. Return to the title and reopen the viewer."); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
      const textures = new Set<THREE.Texture>();
      materials.forEach(m => Object.values(m).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }));
      textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  return <section className="ag-viewer" aria-label="Explore the AIRI walker">
    <header className="ag-viewer-header"><button className="ag-wordmark" onClick={onHome} aria-label="Back to game title">AIRI<span>KEEP YOUR WORLD OPEN</span></button><span className="ag-viewer-overline">MECHANICS · SENSING · CONTROL</span><button className="ag-pill ag-pill-dark" onClick={onReplay}>Play again <GameIcon name="rotate" size={15}/></button></header>
    <div className="ag-viewer-body"><aside className="ag-feature-copy ag-technical-copy" ref={copy}>
      <span className="ag-kicker">DESIGN & CONTROL</span><h1>AIRI design.<br/><em>How it works.</em></h1>
      <div ref={tourStart} className="ag-feature-tour-anchor"/>
      <nav className="ag-feature-tour" aria-label="Feature tour">
      <div className="ag-feature-groups" aria-label="Feature categories"><button aria-pressed={feature.group === "design"} onClick={() => selectFeature("grips")}>The design <span>{FEATURES.filter(f => f.group === "design").length}</span></button><button aria-pressed={feature.group === "ai"} onClick={() => selectFeature("fallAI")}><GameIcon name="compute" size={15}/>The intelligence <span>{FEATURES.filter(f => f.group === "ai").length}</span></button></div>
      <div className="ag-feature-pager">
        <button disabled={!previous} onClick={() => previous && selectFeature(previous.id)} aria-label={previous ? `Previous feature: ${previous.label}` : "Previous feature"} aria-controls="ag-current-feature"><GameIcon name="arrow" size={19}/><span>Previous<small>{previous?.label ?? "Start of tour"}</small></span></button>
        <span className="ag-tour-count" aria-live="polite">{featureIndex + 1}<small>/ {FEATURES.length}</small></span>
        <button disabled={!next} onClick={() => next && selectFeature(next.id)} aria-label={next ? `Next feature: ${next.label}` : "Next feature"} aria-controls="ag-current-feature"><span>Next<small>{next?.label ?? "End of tour"}</small></span><GameIcon name="arrow" size={19}/></button>
      </div></nav>
      <details className="ag-feature-index" ref={index}><summary>Jump to a feature <GameIcon name="arrow" size={15}/></summary><div className="ag-feature-tabs" aria-label="Walker features">{FEATURES.filter(f => f.group === feature.group).map(f => <button key={f.id} onClick={() => selectFeature(f.id)} aria-pressed={selected === f.id}><span>{String(FEATURES.indexOf(f) + 1).padStart(2, "0")}</span><GameIcon name={f.id} size={19}/>{f.label}<GameIcon name="arrow" size={15}/></button>)}</div></details>
      <div className="ag-feature-detail" id="ag-current-feature" key={selected} ref={detail}><span className="ag-feature-number">{String(featureIndex + 1).padStart(2, "0")} / {feature.eyebrow}</span><h2>{feature.title}</h2><p>{feature.body}</p></div>
      {selected === "adjust" && <button className="ag-button ag-button-rust ag-fold-button" onClick={() => setFolded(v => !v)}>{folded ? "Open the frame" : "See it narrow"}<GameIcon name="gap" size={18}/></button>}
      <FeatureExplainer feature={selected} folded={folded}/>
    </aside><div className="ag-model-wrap"><div className="ag-model-canvas" ref={host}/>
      <div className="ag-hotspots">{PHYSICAL_FEATURES.map((f, i) => <button ref={el => { if (el) dots.current.set(f.anchor, el); else dots.current.delete(f.anchor); }} className={feature.anchor === f.anchor ? "selected" : ""} key={f.id} onClick={() => selectFeature(f.id)} aria-label={`Explore ${f.label}`} aria-pressed={selected === f.id}><span>{i + 1}</span><small>{feature.anchor === f.anchor ? feature.label : f.label}</small></button>)}</div>
      {feature.group === "ai" && <div className="ag-ai-model-label"><GameIcon name={selected} size={20}/><span>{feature.label}<small>{selected === "voiceAI" ? "Whisper → Qwen → allowed task" : selected === "fallAI" ? "Synthetic + real data → validation" : selected === "findUserAI" ? "Locate → confirm → approach" : selected === "computeAI" ? "Task compute + independent control" : "Goal → localization → path planning"}</small></span></div>}
      <div className="ag-model-caption"><span>DRAG TO ROTATE · SCROLL TO ZOOM</span><button onClick={() => setRotating(v => !v)} aria-pressed={rotating}><GameIcon name={rotating ? "pause" : "rotate"} size={15}/>{rotating ? "Pause turntable" : "Turntable"}</button></div>
      {error && <div className="ag-model-error" role="alert"><img src="/airi-walker-journey/game/assets/airi-game/reference-walker.webp" alt="AIRI design reference: champagne frame, fabric bag and four wheels"/><p>{error}</p></div>}
    </div></div><footer className="ag-viewer-footer"><span>DESIGN CONCEPT · SCRIPTED GAMEPLAY · REAL-WORLD PERFORMANCE NOT VALIDATED</span><span>Hardware concept · software prototype <GameIcon name="leaf" size={16}/></span></footer>
  </section>;
}

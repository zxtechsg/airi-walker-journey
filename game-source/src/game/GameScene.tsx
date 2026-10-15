import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createGrandma, createVillain, createWalker, WALKER_WHEEL_LAYOUT, WALKER_WHEEL_RADIUS } from "./models";
import { createApartment, createSky, createStreet } from "./gameWorld";
import { gameAudio } from "./gameAudio";
import { advanceDrivePose, approachAngle, apartmentCollision, batteryUnlocked, clamp, DOCK, ease, MANUAL_EXIT, SEATS, STREET_OBJECTIVES, streetCollision, shouldTriggerWall, wallContactDistance, WALL_OBSTACLE } from "./gamePhysics";
import type { ChallengeId, CinematicId, GamePhase, GameSceneEvent, GameSceneProps, PowerMode, SeatId } from "./types";
export { STREET_TARGETS } from "./gameWorld";

type ChallengeAction = { id: CinematicId; elapsed: number; duration: number; start: THREE.Vector3; target: THREE.Vector3; heading: number; cameraStart: THREE.Vector3; lookStart: THREE.Vector3; cues: Set<string> };
type CinematicShot = "approach" | "danger" | "brakes" | "fold" | "passage" | "recover" | "load" | "assist" | "hold" | "disconnect" | "manual";
function shotFor(action: ChallengeAction): CinematicShot {
  if (action.id === "assist") return action.elapsed < 2.8 ? "load" : "assist";
  if (action.id === "battery") return action.elapsed < 2.2 ? "hold" : action.elapsed < 5 ? "disconnect" : "manual";
  if (action.id === "gap") return action.elapsed < .7 ? "approach" : action.elapsed < 2.8 ? "fold" : action.elapsed < 7.6 ? "passage" : "recover";
  return action.elapsed < .9 ? "approach" : action.elapsed < 1.8 ? "danger" : action.elapsed < 3.1 ? "brakes" : "recover";
}
const INDOORS = new Set<GamePhase>(["homeIntro", "apartment", "sitting", "seated", "docking", "timeJump", "recall", "returning", "standing", "ending"]);
const ZERO_CONTROLS = { forward: false, back: false, left: false, right: false, interact: false, brake: false };
const forward = (angle: number) => new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
const smooth = (dt: number, speed: number) => 1 - Math.exp(-dt * speed);

function createInterventionFX(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = "walker-intervention-effects"; scene.add(group);
  const beamsArray = new Float32Array(9 * 6), dotArray = new Float32Array(9 * 3);
  const beamsGeometry = new THREE.BufferGeometry(); beamsGeometry.setAttribute("position", new THREE.BufferAttribute(beamsArray, 3));
  const beams = new THREE.LineSegments(beamsGeometry, new THREE.LineBasicMaterial({ color: 0x3bff92, toneMapped: false, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending })); beams.frustumCulled = false; group.add(beams);
  const dotsGeometry = new THREE.BufferGeometry(); dotsGeometry.setAttribute("position", new THREE.BufferAttribute(dotArray, 3));
  const dots = new THREE.Points(dotsGeometry, new THREE.PointsMaterial({ color: 0xb0ffd1, toneMapped: false, size: .055, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending })); dots.frustumCulled = false; group.add(dots);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), new THREE.MeshBasicMaterial({ color: 0x70ffac, toneMapped: false })); group.add(sensor);
  const arcs = new THREE.Group(); arcs.name = "opposing-brake-torque-arrows"; group.add(arcs);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff433d, toneMapped: false });
  const arcGlow = new THREE.MeshBasicMaterial({ color: 0xff433d, toneMapped: false, transparent: true, opacity: .17, depthWrite: false, blending: THREE.AdditiveBlending });
  const contactMaterial = new THREE.MeshBasicMaterial({ color: 0xff433d, toneMapped: false });
  const contactGlow = new THREE.MeshBasicMaterial({ color: 0xff433d, toneMapped: false, transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false });
  const grip = new THREE.Group(); grip.name = "four-wheel-grip-force"; group.add(grip);
  const arrowHeads: THREE.Mesh[] = [];
  const arcRadius = WALKER_WHEEL_RADIUS + .045;
  for (const wheel of WALKER_WHEEL_LAYOUT) {
    const sign = Math.sign(wheel.x);
    const arrow = new THREE.Group(); arrow.position.set(wheel.x + sign * .075, wheel.y, wheel.z); arcs.add(arrow);
    // A fixed upper arc stays above the road. Only its arrowhead travels along it.
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) { const angle = -1.4 + 2.8 * i / 36; points.push(new THREE.Vector3(0, Math.cos(angle) * arcRadius, Math.sin(angle) * arcRadius)); }
    const curve = new THREE.CatmullRomCurve3(points);
    arrow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 36, .009, 7, false), arrowMaterial));
    arrow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 36, .018, 7, false), arcGlow));
    const head = new THREE.Mesh(new THREE.ConeGeometry(.027, .064, 8), arrowMaterial); arrow.add(head); arrowHeads.push(head);
    const contact = new THREE.Group(); contact.position.set(wheel.x + sign * .085, .065, wheel.z); grip.add(contact);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .27, 8), contactMaterial); shaft.rotation.x = Math.PI / 2; shaft.position.z = .145; contact.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.042, .11, 8), contactMaterial); tip.rotation.x = Math.PI / 2; tip.position.z = .335; contact.add(tip);
    const pad = new THREE.Mesh(new THREE.RingGeometry(.15, .175, 32), contactGlow); pad.rotation.x = -Math.PI / 2; pad.position.y = -.025; contact.add(pad);
  }
  const forwardArrow = new THREE.Group(); forwardArrow.name = "single-forward-assistance"; group.add(forwardArrow);
  const assistMaterial = new THREE.MeshBasicMaterial({ color: 0x4dff70, toneMapped: false, side: THREE.DoubleSide });
  const assistShape = new THREE.Shape(); assistShape.moveTo(-.065, 0); assistShape.lineTo(.065, 0); assistShape.lineTo(.065, .39); assistShape.lineTo(.22, .39); assistShape.lineTo(0, .83); assistShape.lineTo(-.22, .39); assistShape.lineTo(-.065, .39); assistShape.closePath();
  const assistGlyph = new THREE.Mesh(new THREE.ShapeGeometry(assistShape), assistMaterial);
  assistGlyph.rotation.x = -Math.PI / 2 + .3; assistGlyph.position.set(0, 1.22, -.65); forwardArrow.add(assistGlyph);
  const narrow = new THREE.Group(); narrow.name = "frame-compression-inward-arrows"; group.add(narrow);
  const narrowMaterial = new THREE.MeshBasicMaterial({ color: 0x79ffd1, toneMapped: false });
  for (const sign of [-1, 1]) {
    const arrow = new THREE.Group(); arrow.position.set(sign * .68, 1.12, .35); narrow.add(arrow);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .19, 10), narrowMaterial);
    shaft.rotation.z = sign * Math.PI / 2; shaft.position.x = -sign * .095; arrow.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.065, .13, 10), narrowMaterial);
    tip.rotation.z = sign * Math.PI / 2; tip.position.x = -sign * .255; arrow.add(tip);
  }
  const loadCells = new THREE.Group(); loadCells.name = "handle-load-cell-highlights"; group.add(loadCells);
  for (const x of [-.30, .30]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.055, .008, 8, 28), new THREE.MeshBasicMaterial({ color: 0x6dffb3, toneMapped: false })); ring.position.set(x, 1.045, .217); ring.rotation.x = Math.PI / 2; loadCells.add(ring); }
  const sprayArray = new Float32Array(14 * 3), sprayGeometry = new THREE.BufferGeometry(); sprayGeometry.setAttribute("position", new THREE.BufferAttribute(sprayArray, 3));
  const spray = new THREE.Points(sprayGeometry, new THREE.PointsMaterial({ color: 0xe5fbff, size: .035, transparent: true, opacity: .75, depthWrite: false })); spray.frustumCulled = false; group.add(spray);
  return { group, beams, dots, sensor, arcs, arrowHeads, arcRadius, grip, arrowMaterial, arcGlow, contactMaterial, contactGlow, forwardArrow, narrow, loadCells, spray, beamsArray, dotArray, sprayArray };
}

/** Fully local, deterministic feature game. No hardware or safety model is called. */
export default function GameScene(props: GameSceneProps) {
  const mount = useRef<HTMLDivElement>(null), live = useRef(props);
  const [failure, setFailure] = useState<string | null>(null);
  live.current = props;

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    setFailure(null);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      const message = "This browser could not start 3D. Try a browser with WebGL enabled.";
      setFailure(message); live.current.onEvent({ type: "error", message }); return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute("aria-label", "AIRI third person adventure. Use W A S D or arrow keys to move.");
    renderer.domElement.setAttribute("role", "img"); element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe6c99e); scene.fog = new THREE.Fog(0xd3c8a5, 26, 87); createSky(scene);
    const camera = new THREE.PerspectiveCamera(49, 1, .07, 180);
    const ambient = new THREE.HemisphereLight(0xf7e5c2, 0x52756b, 2.35); scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffdc9c, 3.1); sun.position.set(-16, 25, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 75; sun.shadow.bias = -.00045; sun.shadow.normalBias = .035;
    scene.add(sun); scene.add(sun.target);
    const street = createStreet(), home = createApartment(); scene.add(street.group, home.group); home.group.visible = false;
    let holeOpened = false, holeReveal = 0;
    let powerMode: PowerMode = "powered", assistSeen = false, manualFinished = false;
    const effects = createInterventionFX(scene);
    const grandma = createGrandma(), walker = createWalker(), villain = createVillain(); scene.add(grandma.group, walker.group, villain.group);
    villain.group.position.set(.25, 0, -.6); villain.group.visible = false;
    const player = new THREE.Vector3(0, 0, 3), walkerPosition = new THREE.Vector3(0, 0, 2.35);
    const cameraTarget = new THREE.Vector3(0, 1, 2), desiredCamera = new THREE.Vector3(), desiredTarget = new THREE.Vector3();
    let heading = 0, walkerHeading = 0, elapsed = 0, phaseElapsed = 0, previousPhase: GamePhase | null = null;
    let pending: ChallengeAction | null = null, nearSeat: SeatId | null = null, activeSeat: SeatId = live.current.seat;
    let sitAmount = 0, lean = 0, stumble = 0, sideLean = 0, fold = 0, braking = false, speed = 0, rootReady = false, disposed = false;
    let frame = 0, lastTime = 0, positionTick = 0, phaseEmitted = false, driveSpeed = 0, lastWheelDirection = 1;
    let route: { x: number; z: number; reverse?: boolean }[] = [];
    const completed = new Set<ChallengeId>(live.current.completed);
    let phaseOrigin = player.clone(), walkerOrigin = walkerPosition.clone(), sittingOriginHeading = 0;
    const cameraReady = { value: false };
    const emit = (event: GameSceneEvent) => { if (!disposed) live.current.onEvent(event); };
    const setNearSeat = (seat: SeatId | null) => { if (seat !== nearSeat) { nearSeat = seat; emit({ type: "near-seat", seat }); } };
    const syncWalker = () => { walkerPosition.copy(player).addScaledVector(forward(heading), .65); walkerHeading = heading; };
    const clearControls = () => { Object.assign(live.current.controls.current, ZERO_CONTROLS); };
    const visibility = () => { if (document.hidden) clearControls(); lastTime = 0; };
    window.addEventListener("blur", clearControls); document.addEventListener("visibilitychange", visibility);
    const lostContext = (event: Event) => { event.preventDefault(); const message = "The 3D view paused. Reload the page to continue."; setFailure(message); emit({ type: "error", message }); };
    renderer.domElement.addEventListener("webglcontextlost", lostContext);
    const resize = () => {
      if (disposed) return;
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    function enterPhase(phase: GamePhase) {
      phaseElapsed = 0; phaseEmitted = false; phaseOrigin = player.clone(); walkerOrigin = walkerPosition.clone(); sittingOriginHeading = heading; pending = null; driveSpeed = 0;
      const indoors = INDOORS.has(phase); street.group.visible = !indoors; home.group.visible = indoors;
      villain.group.visible = phase === "intro"; grandma.group.visible = phase !== "intro";
      scene.fog = indoors ? new THREE.Fog(0xcfc4a3, 26, 80) : new THREE.Fog(0xd3c8a5, 26, 87);
      sun.intensity = indoors ? 2.2 : 3.1; ambient.intensity = indoors ? 2.4 : 2.35;
      if (phase === "street" && (previousPhase === "title" || previousPhase === "intro" || !previousPhase)) {
        player.set(0, 0, 3); heading = 0; syncWalker(); cameraReady.value = false; sitAmount = 0;
      }
      if ((phase === "homeIntro" || phase === "apartment") && !INDOORS.has(previousPhase ?? "title")) {
        powerMode = "powered"; player.set(0, 0, 4); heading = 0; sitAmount = 0; syncWalker(); cameraReady.value = false;
      }
      if (phase === "sitting") { activeSeat = live.current.seat; phaseOrigin = player.clone(); sittingOriginHeading = heading; setNearSeat(null); }
      if (phase === "docking") route = [{ x: walkerPosition.x, z: .55 }, { x: DOCK.x, z: .55 }, { x: DOCK.x, z: DOCK.z }];
      if (phase === "returning") { const seat = SEATS[activeSeat]; route = [{ x: DOCK.x, z: .55, reverse: true }, { x: seat.x, z: .55 }, { x: seat.x, z: seat.z + .65, reverse: true }]; }
      if (phase === "standing") { phaseOrigin = player.clone(); walkerOrigin = walkerPosition.clone(); }
      if (phase === "intro") { walkerPosition.set(0, 0, 2.1); walkerHeading = 0; }
      if (phase !== "apartment") setNearSeat(null);
      previousPhase = phase;
    }
    function startChallenge(id: CinematicId) {
      if (pending || (id !== "assist" && completed.has(id))) return;
      const target = player.clone();
      if (id === "ice") target.addScaledVector(forward(heading), 1.2);
      else if (id === "hole") target.addScaledVector(forward(heading), .32);
      else if (id === "wall") {
        const direction = forward(heading), currentWalker = player.clone().addScaledVector(direction, .65);
        const contact = wallContactDistance(currentWalker.x, currentWalker.z, direction.x, direction.z);
        target.addScaledVector(direction, Math.max(0, Math.min(.3, (contact ?? 0) - .08)));
        const stoppedWalker = target.clone().addScaledVector(direction, .65), centre = new THREE.Vector3(WALL_OBSTACLE.x, 0, WALL_OBSTACLE.z);
        const clearance = WALL_OBSTACLE.radius + WALL_OBSTACLE.clearance + .06;
        if (stoppedWalker.distanceTo(centre) < clearance) target.copy(stoppedWalker.sub(centre).normalize().multiplyScalar(clearance).add(centre).addScaledVector(direction, -.65));
      }
      else if (id === "gap") target.set(4, 0, player.z > -25 ? -27.35 : -22.65);
      else if (id === "assist") { target.addScaledVector(forward(heading), .65); assistSeen = true; }
      else if (id === "battery") powerMode = "reserve";
      pending = { id, elapsed: 0, duration: id === "gap" ? 8.8 : id === "assist" ? 5.4 : id === "battery" ? 8 : 5, start: player.clone(), target, heading, cameraStart: camera.position.clone(), lookStart: cameraTarget.clone(), cues: new Set() };
      clearControls(); emit({ type: "cinematic", active: true, id });
    }
    function cueAt(action: ChallengeAction, at: number, cue: "lidar" | "brake" | "slip" | "motor" | "fold") {
      if (action.elapsed >= at && !action.cues.has(cue)) { action.cues.add(cue); gameAudio.cue(cue); }
    }
    function checkChallenge(dx: number, dz: number) {
      if (Math.hypot(dx, dz) < .001 || pending) return;
      const wx = walkerPosition.x + dx, wz = walkerPosition.z + dz;
      const toward = (x: number, z: number) => (x - walkerPosition.x) * dx + (z - walkerPosition.z) * dz > 0;
      if (!completed.has("hole") && Math.hypot(wx + 4, wz + 5) < 2.1 && toward(-4, -5)) startChallenge("hole");
      else if (!completed.has("wall") && shouldTriggerWall(player.x - Math.sin(heading) * .65, player.z - Math.cos(heading) * .65, dx, dz, heading)) startChallenge("wall");
      else if (!completed.has("ice") && ((wx + 3) / 1.9) ** 2 + ((wz + 17) / 2.35) ** 2 < 1) startChallenge("ice");
      else if (!completed.has("gap") && Math.abs(wx - 4) < 1.1 && Math.abs(wz + 25) < 2.4 && toward(4, -25)) startChallenge("gap");
    }
    function movePlayer(dt: number, indoors: boolean) {
      const controls = live.current.controls.current;
      let dx = Number(controls.right) - Number(controls.left), dz = Number(controls.back) - Number(controls.forward);
      const length = Math.hypot(dx, dz); speed = 0;
      if (powerMode === "manual" && controls.brake) { braking = true; return; }
      if (!length) return;
      if (!indoors && !assistSeen) { startChallenge("assist"); return; }
      dx /= length; dz /= length;
      const targetHeading = Math.atan2(-dx, -dz); heading = approachAngle(heading, targetHeading, smooth(dt, 11));
      const distance = dt * (indoors ? 1.65 : powerMode === "manual" ? 2.15 : 2.65); dx *= distance; dz *= distance;
      if (!indoors) checkChallenge(dx, dz);
      if (pending) return;
      const collision = indoors ? apartmentCollision : streetCollision;
      const fx = -Math.sin(heading) * .65, fz = -Math.cos(heading) * .65;
      const canGo = (x: number, z: number) => !collision(x, z) && !collision(x + fx, z + fz);
      const oldX = player.x, oldZ = player.z;
      if (canGo(player.x + dx, player.z + dz)) { player.x += dx; player.z += dz; }
      else if (canGo(player.x + dx, player.z)) player.x += dx;
      else if (canGo(player.x, player.z + dz)) player.z += dz;
      speed = Math.hypot(player.x - oldX, player.z - oldZ) / Math.max(dt, .001);
      if (speed < .1 && powerMode !== "manual") braking = true;
      syncWalker();
      if (!indoors && powerMode === "manual" && completed.has("battery") && !manualFinished && Math.hypot(player.x - MANUAL_EXIT.x, player.z - MANUAL_EXIT.z) < 1.15) { manualFinished = true; clearControls(); emit({ type: "manual-finished" }); }
    }
    function driveRoute(dt: number) {
      speed = 0;
      if (!route.length) return true;
      const next = advanceDrivePose({ x: walkerPosition.x, z: walkerPosition.z, heading: walkerHeading, speed: driveSpeed }, route[0], dt);
      walkerPosition.set(next.x, 0, next.z); walkerHeading = next.heading; driveSpeed = speed = next.speed;
      if (next.arrived) { route.shift(); driveSpeed = 0; }
      return route.length === 0;
    }
    function updatePhase(dt: number, phase: GamePhase) {
      braking = false; lean = 0; stumble = 0; sideLean = 0; speed = 0;
      if (phase === "title") { heading = -.28; player.set(0, 0, 3); syncWalker(); sitAmount = 0; }
      else if (phase === "intro") { walker.animate(dt, 0); }
      else if (phase === "street" && !live.current.paused) {
        if (pending) {
          const action = pending; action.elapsed += dt; const t = action.elapsed;
          if (action.id === "assist") {
            const fraction = clamp((t - 2.8) / 1.6, 0, 1); player.lerpVectors(action.start, action.target, ease(fraction));
            speed = .65 / 1.6 * 6 * fraction * (1 - fraction); cueAt(action, 2.8, "motor");
          } else if (action.id === "battery") {
            braking = true; powerMode = t < 5 ? "reserve" : "manual";
            cueAt(action, .25, "brake"); cueAt(action, 2.4, "fold");
          } else if (action.id === "gap") {
            const fraction = clamp((t - 2.8) / 4.8, 0, 1), pass = ease(fraction); const direction = action.target.z < action.start.z ? 0 : Math.PI;
            fold = ease((t - .9) / 1.5) * (1 - ease((t - 7.6) / .95)); heading = approachAngle(heading, direction, smooth(dt, 6));
            player.x = THREE.MathUtils.lerp(action.start.x, 4, ease(t / .7)); player.z = THREE.MathUtils.lerp(action.start.z, action.target.z, pass);
            speed = Math.abs(action.target.z - action.start.z) / 4.8 * 6 * fraction * (1 - fraction);
            cueAt(action, .95, "fold"); cueAt(action, 2.85, "motor");
          } else if (action.id === "ice") {
            const slide = ease(t / 1.85); const sway = Math.sin(Math.PI * clamp((t - .4) / 2.3, 0, 1));
            player.lerpVectors(action.start, action.target, slide);
            heading = action.heading; lean = sway * 1.0; sideLean = 0; stumble = sway * .76;
            braking = t >= 1.55; speed = t < 1.85 ? Math.max(0, Math.sin(Math.PI * t / 1.85)) * 1.8 : 0;
            cueAt(action, .65, "slip"); cueAt(action, 1.55, "brake");
          } else {
            player.lerpVectors(action.start, action.target, ease(t / 1.6));
            const alarm = Math.sin(Math.PI * clamp((t - .5) / 2.4, 0, 1));
            lean = alarm * .65; stumble = alarm * .6; braking = t >= 1.55;
            speed = t < 1.6 ? .5 * Math.sin(Math.PI * t / 1.6) : 0;
            cueAt(action, .4, "lidar"); cueAt(action, 1.55, "brake");
          }
          syncWalker();
          if (t >= action.duration) {
            pending = null; if (action.id !== "assist") completed.add(action.id); fold = 0; lean = 0; stumble = 0; sideLean = 0; speed = 0;
            emit({ type: "cinematic", active: false, id: action.id }); if (action.id !== "assist") emit({ type: "challenge", id: action.id });
          }
        } else {
          fold = 0;
          // The fourth feature card must close before the battery handoff begins.
          if (batteryUnlocked(completed) && !completed.has("battery")) startChallenge("battery");
          else movePlayer(dt, false);
        }
      } else if (phase === "apartment" && !live.current.paused) {
        movePlayer(dt, true);
        let closest: SeatId | null = null, best = 1.75;
        for (const [id, seat] of Object.entries(SEATS)) { const distance = Math.hypot(player.x - seat.x, player.z - (seat.z + .6)); if (distance < best) { closest = id as SeatId; best = distance; } }
        setNearSeat(closest);
      } else if (phase === "sitting") {
        const seat = SEATS[activeSeat]; const turn = ease(phaseElapsed / 1.1), settle = ease((phaseElapsed - 1.25) / 1.5);
        player.lerpVectors(phaseOrigin, new THREE.Vector3(seat.x, 0, seat.z), turn); heading = approachAngle(sittingOriginHeading, Math.PI, turn);
        sitAmount = settle; braking = phaseElapsed >= 1.1; speed = phaseElapsed < 1.1 ? .6 : 0;
        walkerPosition.lerpVectors(walkerOrigin, new THREE.Vector3(seat.x, 0, seat.z + .65), turn); walkerHeading = approachAngle(sittingOriginHeading, Math.PI, turn);
        if (phaseElapsed > 3.05 && !phaseEmitted) { phaseEmitted = true; emit({ type: "sat", seat: activeSeat }); }
      } else if (["seated", "timeJump", "recall"].includes(phase)) { sitAmount = 1; heading = Math.PI; braking = phase === "seated"; }
      else if (phase === "docking" || phase === "returning") {
        sitAmount = 1; const arrived = driveRoute(dt);
        if (arrived) { walkerHeading = approachAngle(walkerHeading, phase === "docking" ? 0 : Math.PI, smooth(dt, 8)); braking = true;
          if (!phaseEmitted && Math.abs(Math.atan2(Math.sin(walkerHeading - (phase === "docking" ? 0 : Math.PI)), Math.cos(walkerHeading - (phase === "docking" ? 0 : Math.PI)))) < .08) { phaseEmitted = true; emit({ type: phase === "docking" ? "docked" : "returned" }); }
        }
      } else if (phase === "standing") {
        const stand = ease((phaseElapsed - .6) / 3.15); sitAmount = 1 - stand; lean = Math.sin(stand * Math.PI) * .24; braking = true; heading = Math.PI;
        // Set the brake first, then rise over planted feet. The support never rolls away.
        player.copy(phaseOrigin).addScaledVector(forward(Math.PI), .278 * stand); walkerPosition.copy(walkerOrigin); walkerHeading = Math.PI;
        if (phaseElapsed > 4.25 && !phaseEmitted) { phaseEmitted = true; emit({ type: "stood" }); }
      } else if (phase === "ending") { sitAmount = 0; braking = true; }
    }
    function updateCamera(dt: number, phase: GamePhase) {
      const indoors = INDOORS.has(phase);
      if (phase === "street" && pending) {
        const action = pending, t = action.elapsed, facing = forward(action.heading), right = new THREE.Vector3(Math.cos(action.heading), 0, -Math.sin(action.heading));
        const from = player.clone().addScaledVector(facing, .45); from.y = .8;
        const side = player.clone().addScaledVector(right, 3.1).addScaledVector(facing, -.65); side.y = 1.65;
        const hazard = action.id === "assist" ? { x: player.x, z: player.z } : STREET_OBJECTIVES[action.id];
        if (live.current.reducedMotion) {
          if (action.id === "gap") {
            desiredCamera.copy(action.start).addScaledVector(facing, -2.5); desiredCamera.x = 4; desiredCamera.y = 6.8;
            desiredTarget.set(4, .7, -25);
          } else {
            desiredCamera.copy(action.start).addScaledVector(right, 4.1).addScaledVector(facing, -1.0); desiredCamera.y = 2.0;
            desiredTarget.copy(action.start).lerp(action.target, .45).addScaledVector(facing, .6); desiredTarget.y = .7;
          }
        } else if (action.id === "assist" || action.id === "battery") {
          // Hold the hands before a continuous move down to the drive; no camera cut.
          const handToDrive = action.id === "assist" ? ease((t - 2.3) / 1.05) : 1;
          const close = walkerPosition.clone().addScaledVector(right, THREE.MathUtils.lerp(1.05, 1.4, handToDrive)).addScaledVector(facing, -.8);
          close.y = THREE.MathUtils.lerp(1.3, .62, handToDrive);
          const focus = walkerPosition.clone(); focus.y = action.id === "battery" ? -.12 : THREE.MathUtils.lerp(1.04, .24, handToDrive);
          desiredCamera.copy(action.cameraStart).lerp(close, ease(t / .75)); desiredTarget.copy(action.lookStart).lerp(focus, ease(t / .75));
          const recoverAt = action.id === "assist" ? 4.45 : 6.9;
          const recoverLength = action.id === "assist" ? .95 : 1.1;
          if (t > recoverAt) { desiredCamera.lerp(new THREE.Vector3(player.x, 4.2, player.z + 6.7), ease((t - recoverAt) / recoverLength)); desiredTarget.lerp(new THREE.Vector3(player.x, 1, player.z - 1.8), ease((t - recoverAt) / recoverLength)); }
        } else if (action.id === "gap") {
          // Centre the view in the corridor so both frame sides and inward arrows stay readable.
          const foldedShot = walkerPosition.clone().addScaledVector(facing, 2.4); foldedShot.x = 4; foldedShot.y = 3.5;
          const foldTarget = walkerPosition.clone(); foldTarget.y = .88;
          // Stay on the corridor centreline and above the rails so neither hedge
          // hides Rose or the compressed frame as the pair passes through.
          const passageShot = player.clone().addScaledVector(facing, -3.2); passageShot.x = 4; passageShot.y = 3.8;
          desiredCamera.copy(action.cameraStart).lerp(foldedShot, ease(t / .85)); desiredTarget.copy(action.lookStart).lerp(foldTarget, ease(t / .85));
          if (t > 2.65) { const blend = ease((t - 2.65) / .95); desiredCamera.lerp(passageShot, blend); desiredTarget.lerp(from, blend); }
          if (t > 7.8) { desiredCamera.lerp(new THREE.Vector3(player.x, 4.2, player.z + 6.7), ease((t - 7.8) / 1)); desiredTarget.lerp(new THREE.Vector3(player.x, 1, player.z - 1.8), ease((t - 7.8) / 1)); }
        } else {
          const dangerTarget = walkerPosition.clone().lerp(new THREE.Vector3(hazard.x, 0, hazard.z), action.id === "hole" ? .38 : .22); dangerTarget.y = action.id === "hole" ? .15 : .62;
          const dangerCamera = player.clone().addScaledVector(right, 3.25).addScaledVector(facing, .2); dangerCamera.y = action.id === "hole" ? 2.1 : 1.5;
          const wheelTarget = walkerPosition.clone().addScaledVector(right, .31).addScaledVector(facing, -.28); wheelTarget.y = .18;
          const wheelCamera = walkerPosition.clone().addScaledVector(right, 1.06).addScaledVector(facing, -1.05); wheelCamera.y = .47;
          desiredCamera.copy(action.cameraStart).lerp(side, ease(t / .85)); desiredTarget.copy(action.lookStart).lerp(from, ease(t / .85));
          if (t > .85) { desiredCamera.lerp(dangerCamera, ease((t - .85) / .65)); desiredTarget.lerp(dangerTarget, ease((t - .85) / .65)); }
          if (t > 1.75) { desiredCamera.lerp(wheelCamera, ease((t - 1.75) / .55)); desiredTarget.lerp(wheelTarget, ease((t - 1.75) / .55)); }
          if (t > 3.0) { desiredCamera.lerp(side, ease((t - 3.0) / .75)); desiredTarget.lerp(from, ease((t - 3.0) / .75)); }
          if (t > 4.2) { desiredCamera.lerp(new THREE.Vector3(player.x, 4.2, player.z + 6.7), ease((t - 4.2) / .8)); desiredTarget.lerp(new THREE.Vector3(player.x, 1, player.z - 1.8), ease((t - 4.2) / .8)); }
        }
      } else if (phase === "intro") {
        desiredCamera.set(0, 1.5, 2.6); desiredTarget.set(.1, 1.3, -.5);
        if (!live.current.reducedMotion) desiredCamera.y += Math.sin(elapsed * .8) * .018;
      } else if (phase === "title") {
        const drift = live.current.reducedMotion ? 0 : Math.sin(elapsed * .11) * .8;
        desiredCamera.set(5.7 + drift, 3.7, 8.5);
        if (camera.aspect < .85) desiredTarget.set(-2, 2.65, 2);
        else desiredTarget.set(-6.6, .5, .25);
      } else if (indoors && phase !== "apartment" && phase !== "homeIntro") {
        const seat = SEATS[activeSeat];
        if (["docking", "timeJump", "recall", "returning"].includes(phase)) { desiredCamera.set(7.4, 6.7, 9.3); desiredTarget.set(.2, .8, -1.55); }
        else if (phase === "standing") { desiredCamera.set(seat.x + 2.7, 2.1, seat.z + 3.4); desiredTarget.set(seat.x, .25, seat.z + .35); }
        else { desiredCamera.set(seat.x + 3.9, 3.4, 3.6); desiredTarget.set(seat.x, .85, seat.z + .6); }
      } else if (indoors) {
        desiredCamera.set(clamp(player.x * .45, -1.8, 1.8), 5.4, 8.4); desiredTarget.set(player.x * .45, .55, -.8);
      } else {
        desiredCamera.set(player.x, 4.2, player.z + 6.7); desiredTarget.set(player.x, 1, player.z - 1.8);
      }
      if (!cameraReady.value || (live.current.reducedMotion && !pending)) { camera.position.copy(desiredCamera); cameraTarget.copy(desiredTarget); cameraReady.value = true; }
      else { camera.position.lerp(desiredCamera, smooth(dt, 5)); cameraTarget.lerp(desiredTarget, smooth(dt, 6)); }
      camera.lookAt(cameraTarget);
    }
    function updateEffects(phase: GamePhase, dt: number) {
      const inside = INDOORS.has(phase), world = inside ? home : street;
      for (const [id, halo] of Object.entries(street.halos)) {
        const done = completed.has(id as ChallengeId), available = id !== "battery"; halo.visible = available; const material = halo.material as THREE.MeshBasicMaterial;
        material.color.setHex(done ? 0x69bd87 : 0x43ff69); material.opacity = done ? .3 : .9 + Math.sin(elapsed * 1.8) * .08;
        for (const child of halo.children) if (child instanceof THREE.Mesh) (child.material as THREE.MeshBasicMaterial).opacity = done ? .12 : .65;
        const marker = street.group.getObjectByName(`marker-${id}`);
        if (marker) { marker.visible = !done && available; marker.rotation.y = elapsed * .5; marker.position.y = (id === "wall" ? 2 : 1.7) + Math.sin(elapsed * 1.8) * .12; }
      }
      for (const [id, halo] of Object.entries(home.halos)) { halo.visible = phase === "apartment" || phase === "homeIntro"; (halo.material as THREE.MeshBasicMaterial).opacity = nearSeat === id ? .95 : .45 + Math.sin(elapsed * 2) * .12; }
      if (street.exit) street.exit.visible = powerMode === "manual" && completed.has("battery");
      const active = braking && !pending && powerMode !== "manual";
      world.lidar.position.set(walkerPosition.x, .08, walkerPosition.z);
      const pulse = (elapsed * 1.4) % 1; world.lidar.scale.setScalar(.55 + pulse * 2.6);
      (world.lidar.material as THREE.MeshBasicMaterial).opacity = active ? (1 - pulse) * .7 : 0;
      const holeDistance = Math.hypot(player.x + 4, player.z + 5);
      if (phase === "street" && (holeDistance < 5.5 || completed.has("hole"))) holeOpened = true;
      if (holeOpened) holeReveal = Math.min(1, holeReveal + dt * 1.55);
      if (street.holeCover) { street.holeCover.position.y = -3.2 * ease(holeReveal); street.holeCover.rotation.z = Math.sin(holeReveal * Math.PI) * .10; street.holeCover.visible = holeReveal < .99; }
      const lidarActive = pending && (pending.id === "hole" || pending.id === "wall") && pending.elapsed > .35 && pending.elapsed < 3.15;
      effects.beams.visible = effects.dots.visible = effects.sensor.visible = Boolean(lidarActive);
      if (lidarActive && pending) {
        const sensorOrigin = walkerPosition.clone().addScaledVector(forward(walkerHeading), .239); sensorOrigin.y = .783; effects.sensor.position.copy(sensorOrigin);
        const sweep = Math.sin(pending.elapsed * 2.8) * .18;
        for (let i = 0; i < 9; i++) {
          let endpoint: THREE.Vector3;
          if (pending.id === "wall") {
            const angle = Math.atan2(sensorOrigin.z - WALL_OBSTACLE.z, sensorOrigin.x - WALL_OBSTACLE.x) + (i - 4) * .10 + sweep * .35;
            const radius = WALL_OBSTACLE.radius - .025;
            endpoint = new THREE.Vector3(WALL_OBSTACLE.x + Math.cos(angle) * radius, .24 + (i % 3) * .36, WALL_OBSTACLE.z + Math.sin(angle) * radius);
          }
          else {
            const angle = Math.atan2(sensorOrigin.z + 5, sensorOrigin.x + 4) + (i - 4) * .12 + sweep;
            const radius = i % 2 ? 1.24 : 1.06; endpoint = new THREE.Vector3(-4 + Math.cos(angle) * radius, i % 2 ? .015 : -.26, -5 + Math.sin(angle) * radius);
          }
          effects.beamsArray.set([sensorOrigin.x, sensorOrigin.y, sensorOrigin.z, endpoint.x, endpoint.y, endpoint.z], i * 6);
          const pulse = (pending.elapsed * 1.8 + i * .075) % 1; const dot = sensorOrigin.clone().lerp(endpoint, pulse); effects.dotArray.set([dot.x, dot.y, dot.z], i * 3);
        }
        effects.beams.geometry.attributes.position.needsUpdate = true; effects.dots.geometry.attributes.position.needsUpdate = true;
      }
      const assisting = powerMode === "powered" && !braking && Math.abs(speed) > .08;
      const torqueDirection = braking ? lastWheelDirection : -Math.sign(speed || 1);
      const featureBrake = Boolean(pending && (["hole", "wall", "ice"].includes(pending.id) || (pending.id === "battery" && pending.elapsed < 2.2))) || ["sitting", "standing"].includes(phase);
      const manualBrake = phase === "street" && powerMode === "manual" && braking && !pending;
      const detailedBraking = braking && (featureBrake || manualBrake);
      const featureAssist = pending?.id === "assist" && assisting;
      effects.arcs.visible = detailedBraking || featureAssist;
      effects.arrowMaterial.color.setHex(braking ? 0xff433d : 0x4dff70); effects.arcGlow.color.copy(effects.arrowMaterial.color);
      effects.arcs.position.copy(walkerPosition); effects.arcs.rotation.y = walkerHeading;
      // Opposing torque travels along the upper arc; it never dips below the road.
      effects.arcs.children.forEach((arrow, index) => {
        const wheel = WALKER_WHEEL_LAYOUT[index], sign = Math.sign(wheel.x);
        arrow.position.x = wheel.x * (1 - .3 * fold) + sign * .075;
        const angle = (-1.35 + ((elapsed * .95 + index * .07) % 1) * 2.7) * torqueDirection;
        const head = effects.arrowHeads[index]; head.position.set(0, Math.cos(angle) * effects.arcRadius, Math.sin(angle) * effects.arcRadius);
        head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -Math.sin(angle) * torqueDirection, Math.cos(angle) * torqueDirection));
      });
      effects.grip.visible = detailedBraking;
      effects.contactMaterial.color.setHex(braking ? 0xff433d : 0x4dff70); effects.contactGlow.color.copy(effects.contactMaterial.color);
      effects.grip.position.copy(walkerPosition); effects.grip.rotation.y = walkerHeading;
      effects.grip.children.forEach((contact, index) => { const wheel = WALKER_WHEEL_LAYOUT[index]; contact.position.x = wheel.x * (1 - .3 * fold) + Math.sign(wheel.x) * .085; contact.rotation.y = braking ? (lastWheelDirection > 0 ? 0 : Math.PI) : speed < 0 ? 0 : Math.PI; });
      effects.forwardArrow.visible = assisting && !featureAssist;
      effects.forwardArrow.position.copy(walkerPosition); effects.forwardArrow.rotation.y = walkerHeading + (speed < 0 ? Math.PI : 0);
      effects.narrow.visible = pending?.id === "gap" && pending.elapsed >= .65 && pending.elapsed < 2.8;
      effects.narrow.position.copy(walkerPosition); effects.narrow.rotation.y = walkerHeading;
      effects.narrow.children.forEach((arrow, index) => { const sign = index ? 1 : -1; arrow.position.x = sign * (.68 - .09 * fold - .018 * Math.sin((pending?.elapsed ?? 0) * 4)); });
      effects.loadCells.visible = pending?.id === "assist" && pending.elapsed < 3.1; effects.loadCells.position.copy(walkerPosition); effects.loadCells.rotation.y = walkerHeading;
      const slipping = pending?.id === "ice" && pending.elapsed > .55 && pending.elapsed < 2.05; effects.spray.visible = Boolean(slipping);
      if (slipping && pending) {
        const right = new THREE.Vector3(Math.cos(walkerHeading), 0, -Math.sin(walkerHeading)), ahead = forward(walkerHeading);
        for (let i = 0; i < 14; i++) { const t = (pending.elapsed * 1.8 + i * .17) % 1; const particle = walkerPosition.clone().addScaledVector(right, (i % 2 ? 1 : -1) * (.29 + t * .18)).addScaledVector(ahead, .2 - t * .5); effects.sprayArray.set([particle.x, .055 + Math.sin(t * Math.PI) * .15, particle.z], i * 3); }
        effects.spray.geometry.attributes.position.needsUpdate = true;
      }
      if (home.dockLight) { const material = home.dockLight.material as THREE.MeshStandardMaterial; material.emissiveIntensity = ["timeJump", "recall"].includes(phase) ? 1 + Math.sin(elapsed * 2) * .4 : .25; }
    }
    let debugSnapshot: Readonly<Record<string, unknown>> = {};
    Object.defineProperty(window, "__airiGame", { configurable: true, get: () => debugSnapshot });
    function tick(time: number) {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      if (document.hidden) { lastTime = 0; return; }
      const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : .016; lastTime = time;
      elapsed += dt; const current = live.current; const phase = current.phase;
      for (const id of current.completed) completed.add(id);
      if (phase !== previousPhase) enterPhase(phase);
      if (!current.paused) phaseElapsed += dt;
      // Story overlays pause all active motion; purely cosmetic ambience may continue.
      if (!current.paused || phase === "title" || phase === "intro") updatePhase(dt, phase);
      else { speed = 0; }
      if (Math.abs(speed) > .05) lastWheelDirection = Math.sign(speed);
      grandma.group.position.copy(player); grandma.group.rotation.y = heading;
      const heldGrip = (side: number) => new THREE.Vector3(side * .30, 1.045, .217).applyAxisAngle(new THREE.Vector3(0, 1, 0), walkerHeading).add(walkerPosition).sub(player).applyAxisAngle(new THREE.Vector3(0, 1, 0), -heading);
      const hands = phase === "standing" || phase === "ending" ? { left: heldGrip(-1), right: heldGrip(1) } : undefined;
      grandma.pose({ walk: speed > .1 && !["docking", "returning"].includes(phase) ? Math.min(speed / 2, 1) : 0, time: elapsed, sit: sitAmount, lean, stumble, sideLean, fold, hands, reach: sitAmount > .95 && !["sitting", "standing"].includes(phase) ? 0 : 1 });
      walker.group.position.copy(walkerPosition); walker.group.rotation.y = walkerHeading; walker.setFold(fold); walker.setPowered(powerMode !== "manual"); walker.setBraking(braking); walker.animate(dt, speed);
      villain.animate(elapsed); updateEffects(phase, dt); updateCamera(dt, phase);
      const sunTargetZ = INDOORS.has(phase) ? -1 : player.z - 5; sun.position.set(-16, 25, sunTargetZ + 17); sun.target.position.set(0, 0, sunTargetZ);
      renderer.render(scene, camera);
      if (!rootReady) { rootReady = true; emit({ type: "ready" }); }
      positionTick += dt;
      if (positionTick > .12) {
        positionTick = 0;
        debugSnapshot = Object.freeze({ phase, phaseElapsed, position: Object.freeze({ x: player.x, z: player.z, heading }), walkerPosition: Object.freeze({ x: walkerPosition.x, z: walkerPosition.z, heading: walkerHeading }), wheelSpeed: speed, routeRemaining: route.length, completed: Object.freeze([...completed]), nearSeat, pending: pending?.id ?? null, powerMode, batteryPercent: powerMode === "manual" ? 0 : powerMode === "reserve" ? 3 : 80, assistSeen, manualFinished, motorAssist: powerMode === "powered" && !braking && Math.abs(speed) > .08, braking, brakeWheels: braking && effects.arcs.visible ? effects.arcs.children.length : 0, assistWheels: !braking && effects.arcs.visible ? effects.arcs.children.length : 0, gripArrows: effects.grip.visible ? effects.grip.children.length : 0, frontAssistArrow: effects.forwardArrow.visible, narrowArrows: effects.narrow.visible ? effects.narrow.children.length : 0, loadCellHighlights: effects.loadCells.visible, cameraPosition: Object.freeze({ x: camera.position.x, y: camera.position.y, z: camera.position.z }), fold, holeOpen: holeOpened, holeDepth: 2.8, cinematic: Object.freeze({ active: Boolean(pending), id: pending?.id ?? null, shot: pending ? shotFor(pending) : null, elapsed: pending?.elapsed ?? 0, duration: pending?.duration ?? 0 }), sit: sitAmount, drawCalls: renderer.info.render.calls, objectives: STREET_OBJECTIVES, wallObstacle: WALL_OBSTACLE, ready: rootReady });
        emit({ type: "actuation", braking, assist: powerMode === "powered" && !braking && Math.abs(speed) > .08, power: powerMode, stage: pending ? shotFor(pending) : "" });
        if (phase === "street" || phase === "apartment") emit({ type: "position", x: player.x, z: player.z, heading });
      }
    }
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true; cancelAnimationFrame(frame); clearControls(); observer.disconnect(); window.removeEventListener("blur", clearControls); document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lostContext);
      const geometries = new Set<THREE.BufferGeometry>(), allMaterials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(node => { if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) { geometries.add(node.geometry); const list = Array.isArray(node.material) ? node.material : [node.material]; for (const material of list) { allMaterials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); } } });
      for (const geometry of geometries) geometry.dispose(); for (const material of allMaterials) material.dispose(); for (const texture of textures) texture.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      delete (window as unknown as Record<string, unknown>).__airiGame;
    };
  }, [props.session]);

  return <div className="airi-scene" ref={mount} data-testid="airi-game-scene">{failure && <div role="alert" className="airi-scene-error">{failure}</div>}</div>;
}

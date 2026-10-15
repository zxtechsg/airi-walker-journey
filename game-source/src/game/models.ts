import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { FeatureId } from "./types";

/** Original, procedural AIRI art; proportions reference the supplied product image. */
const TAU = Math.PI * 2;
const up = new THREE.Vector3(0, 1, 0);
const clamp = (n: number) => THREE.MathUtils.clamp(n, 0, 1);
const mat = (color: THREE.ColorRepresentation, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
function mesh(geo: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, pos?: number[], scale?: number[]) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function ball(parent: THREE.Object3D, material: THREE.Material, pos: number[], scale: number[], segments = 16) {
  return mesh(new THREE.SphereGeometry(1, segments, 12), material, parent, pos, scale);
}
function box(parent: THREE.Object3D, material: THREE.Material, pos: number[], size: number[]) {
  return mesh(new THREE.BoxGeometry(...size as [number, number, number]), material, parent, pos);
}
function roundedBox(parent: THREE.Object3D, material: THREE.Material, pos: number[], size: number[], radius: number) {
  return mesh(new RoundedBoxGeometry(size[0],size[1],size[2],2,radius),material,parent,pos);
}
function pipe(parent: THREE.Object3D, material: THREE.Material, points: number[][], radius: number, smooth = true) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])), false, "centripetal");
  return mesh(new THREE.TubeGeometry(path, Math.max(8, points.length * 5), radius, smooth ? 10 : 6, false), material, parent);
}
function rod(parent: THREE.Object3D, material: THREE.Material, a: number[], b: number[], radius: number, endRadius = radius) {
  const va = new THREE.Vector3(...a as [number, number, number]), vb = new THREE.Vector3(...b as [number, number, number]);
  const length = va.distanceTo(vb);
  const m = mesh(new THREE.CylinderGeometry(endRadius, radius, length, 12), material, parent);
  m.position.copy(va).add(vb).multiplyScalar(.5); m.quaternion.setFromUnitVectors(up, vb.sub(va).normalize()); return m;
}
function label(text: string, color: string, width = 256, height = 64) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = width; c.height = height;
  const cx = c.getContext("2d"); if (!cx) return null;
  cx.clearRect(0, 0, width, height); cx.fillStyle = color; cx.textAlign = "center"; cx.textBaseline = "middle";
  cx.font = `500 ${Math.floor(height * .54)}px Arial`; cx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}

// Batch rigid pieces by material; animation pivots remain separate scene objects.
function batchRigid(root: THREE.Object3D, moving = new Set<THREE.Object3D>()) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  function collect(node: THREE.Object3D) {
    if (moving.has(node)) return;
    if (node instanceof THREE.Mesh && !Array.isArray(node.material)) {
      const bucket = batches.get(node.material) ?? []; bucket.push(node); batches.set(node.material, bucket);
    }
    for (const child of node.children) collect(child);
  }
  for (const child of root.children) collect(child);
  for (const [material, pieces] of batches) {
    if (pieces.length < 2) continue;
    let copies = pieces.map(piece => piece.geometry.clone().applyMatrix4(inverse.clone().multiply(piece.matrixWorld)));
    if(copies.some(geometry=>!geometry.index)&&copies.some(geometry=>geometry.index)){
      copies=copies.map(geometry=>{if(!geometry.index)return geometry;const flat=geometry.toNonIndexed();geometry.dispose();return flat;});
    }
    const geometry = mergeGeometries(copies);
    for (const copy of copies) copy.dispose();
    if (!geometry) continue;
    for (const piece of pieces) { piece.removeFromParent(); piece.geometry.dispose(); }
    const combined = mesh(geometry, material, root); combined.name = "Batched sculptural detail";
  }
}

export const WALKER_WHEEL_RADIUS = .123;
export const WALKER_WHEEL_LAYOUT = [
  { side: -1, x: -.30, y: .125, z: -.28 }, { side: 1, x: .30, y: .125, z: -.28 },
  { side: -1, x: -.30, y: .125, z: .28 }, { side: 1, x: .30, y: .125, z: .28 },
] as const;

export function createWalker(): {
  group: THREE.Group; setFold(amount: number): void; setBraking(active: boolean): void; setPowered(active: boolean): void;
  animate(dt: number, speed: number): void; hotspots: Record<FeatureId, THREE.Vector3>;
} {
  const group = new THREE.Group(); group.name = "AIRI smart walker";
  const frame = mat("#c9b69b", .34, .48), highlight = mat("#e6d6b9", .42, .25);
  const graphite = mat("#343b39", .57, .2), rubber = mat("#252c2b", .96), honey = mat("#4a514b", .95);
  const grip = mat("#7b6254", .88), basket = mat("#a69c88", 1), seam = mat("#c2b7a0", 1);
  const sensor = mat("#141f23", .22, .25), lens = mat("#61cdbd", .19, .25);
  const brakeLight = new THREE.MeshStandardMaterial({ color: "#3b7e6e", emissive: "#237e68", emissiveIntensity: .35, roughness: .45 });
  const sides: { group: THREE.Group; sign: number }[] = [], wheels: THREE.Group[] = [], brakeLevers: THREE.Group[] = [];
  // The side frames translate inward during folding, while the fabric basket compresses.
  for (const sign of [-1, 1]) {
    const side = new THREE.Group(); side.name = sign < 0 ? "Left frame" : "Right frame"; group.add(side); side.position.x = sign * .30;
    sides.push({ group: side, sign });
    pipe(side, frame, [[0,.19,-.29],[0,.37,-.24],[0,.70,-.12],[0,.94,.02],[0,1.015,.13]], .025);
    pipe(side, frame, [[0,.18,.29],[0,.36,.24],[0,.65,.10],[0,.73,-.10]], .023);
    // A closed palm pad sits on a cast carrier that joins the upright directly.
    // Its rear contact surface remains at the grandma rig's handle position.
    roundedBox(side,highlight,[0,1.005,.140],[.067,.053,.188],.018);
    rod(side,graphite,[0,.956,.100],[0,1.013,.145],.030);
    const gripOutline=new THREE.Shape();gripOutline.moveTo(-.029,-.111);
    gripOutline.quadraticCurveTo(0,-.128,.029,-.111);gripOutline.lineTo(.041,-.040);
    gripOutline.quadraticCurveTo(.057,.057,.044,.103);gripOutline.quadraticCurveTo(0,.132,-.044,.103);
    gripOutline.quadraticCurveTo(-.057,.057,-.041,-.040);gripOutline.closePath();
    const palmPad=mesh(new THREE.ExtrudeGeometry(gripOutline,{depth:.028,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:3,steps:1}),grip,side,[0,1.039,.135]);
    palmPad.rotation.x=Math.PI/2;palmPad.name="Solid sculpted palm grip";
    ball(side,grip,[0,1.040,.181],[.047,.019,.073]);
    ball(side,grip,[sign*.020,1.032,.181],[.037,.019,.071]);
    // A real hinge and a separate curved lever are readable below the grip.
    const lever=new THREE.Group();side.add(lever);lever.position.set(0,.997,.040);brakeLevers.push(lever);
    lever.name=sign<0?"Left hand brake lever":"Right hand brake lever";
    pipe(lever,graphite,[[0,0,0],[0,-.034,.035],[0,-.042,.115],[0,-.029,.182]],.011);
    pipe(lever,highlight,[[0,-.041,.071],[0,-.042,.116],[0,-.032,.165]],.004);
    rod(side,graphite,[-.037,.997,.040],[.037,.997,.040],.012);
    for(const s of [-1,1]){const pin=mesh(new THREE.CylinderGeometry(.009,.009,.005,12),highlight,side,[s*.039,.997,.040]);pin.rotation.z=Math.PI/2;}
    pipe(side,graphite,[[sign*.020,.995,.036],[sign*.024,.938,.020],[sign*.025,.83,-.045],[sign*.025,.72,-.11]],.003);
    for (const z of [-.28,.28]) {
      const fork = new THREE.Group(); side.add(fork); fork.position.set(0,.125,z);
      rod(fork, graphite, [0,.13,0],[0,.01,0], .026);
      rod(fork, graphite, [.046,.075,0],[.046,0,0], .011);
      rod(fork, graphite, [-.046,.075,0],[-.046,0,0], .011);
      const wheel = new THREE.Group(); wheel.name = z < 0 ? "Powered front wheel" : "Powered rear wheel"; fork.add(wheel); wheels.push(wheel);
      const tire = mesh(new THREE.TorusGeometry(.096,.027,10,28), rubber, wheel); tire.rotation.y = Math.PI / 2;
      // Cut-out-like tire cells: paired rows catch light without an expensive mesh boolean.
      for (const sideSign of [-1, 1]) {
        const ring = mesh(new THREE.TorusGeometry(.094,.017,6,28), honey, wheel, [sideSign * .020,0,0]); ring.rotation.y = Math.PI / 2;
        for (let i = 0; i < 18; i++) {
          const angle = i / 18 * TAU;
          const hole = mesh(new THREE.CylinderGeometry(.008,.008,.004,6), rubber, wheel, [sideSign * .037,Math.sin(angle)*.096,Math.cos(angle)*.096]);
          hole.rotation.z = Math.PI / 2;
        }
        const hub = mesh(new THREE.CylinderGeometry(.066,.066,.009,28), frame, wheel, [sideSign * .030,0,0]); hub.rotation.z = Math.PI / 2;
        const cap = mesh(new THREE.CylinderGeometry(.028,.028,.012,20), graphite, wheel, [sideSign * .036,0,0]); cap.rotation.z = Math.PI / 2;
        const light = mesh(new THREE.TorusGeometry(.046,.0035,6,24), brakeLight, wheel, [sideSign * .037,0,0]); light.rotation.y = Math.PI / 2;
      }
      // The axle is fixed to the fork; only the tyre and hub rotate.
      rod(fork, graphite, [-.046,0,0],[.046,0,0], .010);
    }
    for (const y of [.48,.82]) {
      const z = y < .6 ? -.205 : -.045;
      rod(side, highlight, [0,y-.026,z-.008],[0,y+.026,z+.012], .029);
      box(side, graphite, [sign*.026,y,z], [.004,.024,.011]);
    }
    rod(side, graphite, [0,.20,.27],[0,.27,.257], .027);
    rod(side, graphite, [0,.20,-.28],[0,.27,-.267], .027);
    pipe(side, seam, [[-.008,.71,-.11],[-.008,.71,.11],[-.008,.52,.09]], .013);
  }
  const cross = new THREE.Group(); group.add(cross);
  rod(cross, frame, [-.30,.45,-.20],[.30,.45,-.20], .026);
  rod(cross, graphite, [-.28,.40,.18],[.28,.40,.18], .014);
  rod(cross, frame, [-.30,.99,.16],[.30,.99,.16], .021);
  rod(cross, graphite, [-.075,.99,.16],[.075,.99,.16], .024);
  // Fabric basket: a trapezoidal sewn body rather than a hard box.
  const fabricGroup = new THREE.Group(); fabricGroup.name = "Fabric carry basket"; cross.add(fabricGroup);
  const shape = new THREE.Shape(); shape.moveTo(-.244,.47); shape.lineTo(.244,.47); shape.lineTo(.265,.69); shape.quadraticCurveTo(.265,.73,.23,.73); shape.lineTo(-.23,.73); shape.quadraticCurveTo(-.265,.73,-.265,.69); shape.closePath();
  const basketGeo = new THREE.ExtrudeGeometry(shape, { depth:.205, bevelEnabled:true, bevelSize:.014, bevelThickness:.014, bevelSegments:2, steps:1 });
  mesh(basketGeo, basket, fabricGroup, [0,0,-.158]);
  pipe(fabricGroup, seam, [[-.235,.49,-.174],[.235,.49,-.174],[.249,.70,-.174]], .003);
  pipe(fabricGroup, seam, [[-.249,.70,-.174],[-.235,.49,-.174]], .003);
  const seat = ball(cross, seam, [0,.747,-.035], [.285,.022,.15]); seat.name = "Padded seat";
  const nameplate = label("A I R I", "#635f53");
  if (nameplate) { const brand = mesh(new THREE.PlaneGeometry(.17,.045), nameplate, fabricGroup, [0,.552,-.175]); brand.rotation.y = Math.PI; }
  // The depth pod is seated in the front rail, with a downward-facing lens bar.
  for(const s of [-1,1])rod(cross,highlight,[s*.16,.746,-.120],[s*.085,.778,-.185],.021);
  const depthPod=new THREE.Group();cross.add(depthPod);depthPod.position.set(0,.790,-.183);depthPod.rotation.x=-.12;depthPod.name="Integrated depth sensor housing";
  roundedBox(depthPod,frame,[0,0,0],[.242,.084,.078],.023);
  roundedBox(depthPod,graphite,[0,0,-.040],[.209,.056,.014],.018);
  roundedBox(depthPod,sensor,[0,0,-.049],[.185,.036,.006],.013);
  for(const x of [-.065,.065]){
    const bezel=mesh(new THREE.TorusGeometry(.013,.003,6,20),graphite,depthPod,[x,0,-.054]);
    bezel.name="Depth lens bezel";ball(depthPod,lens,[x,0,-.056],[.010,.010,.003]);
  }
  roundedBox(depthPod,lens,[0,0,-.054],[.025,.008,.003],.002);
  // A low-profile compute enclosure bridges the handle crossbar.
  const compute=roundedBox(cross,graphite,[0,.998,.160],[.154,.057,.063],.019);compute.name="Protected compute enclosure";
  roundedBox(cross,highlight,[0,1.021,.160],[.125,.008,.045],.004);
  roundedBox(cross,brakeLight,[0,1.027,.170],[.049,.004,.006],.002);
  const hotspots: Record<FeatureId,THREE.Vector3> = {
    grips: new THREE.Vector3(-.30,1.045,.18), frame: new THREE.Vector3(.30,.57,-.17),
    compute: new THREE.Vector3(0,.99,.16), wheels: new THREE.Vector3(.34,.13,.28),
    lidar: new THREE.Vector3(0,.790,-.239), adjust: new THREE.Vector3(-.30,.82,-.045),
  };
  for (const wheel of wheels) batchRigid(wheel);
  for (const lever of brakeLevers) batchRigid(lever);
  for (const side of sides) batchRigid(side.group, new Set([...wheels,...brakeLevers]));
  batchRigid(cross);
  let braking = false, powered = true, elapsed = 0;
  return { group, hotspots,
    setFold(amount) { const fold = clamp(amount), scale = 1 - fold * .30; for (const s of sides) s.group.position.x = s.sign * .30 * scale; cross.scale.x = scale; hotspots.grips.x = -.30 * scale; hotspots.frame.x = .30 * scale; hotspots.wheels.x = .30 * scale + .04; hotspots.adjust.x = -.30 * scale; },
    setPowered(active) { powered = active; },
    setBraking(active) { braking = active; brakeLight.color.set(active ? "#ed5347" : "#3b7e6e"); brakeLight.emissive.set(active ? "#ee3325" : "#237e68"); for(const lever of brakeLevers)lever.rotation.x=active?-.16:0; },
    animate(dt,speed) { elapsed += dt; for (const wheel of wheels) wheel.rotation.x -= speed * dt / WALKER_WHEEL_RADIUS; brakeLight.emissiveIntensity = !powered ? 0 : braking ? .9 + Math.sin(elapsed*7)*.16 : .35; },
  };
}

/** Jointed grandma with a cloth silhouette, expressive face and hands on the grips. */
export type GrandmaPoseOptions = { walk: number; time: number; sit: number; lean: number; reach?: number; fold?: number; stumble?: number; sideLean?: number; hands?: { left: THREE.Vector3; right: THREE.Vector3 } };
export function createGrandma(): { group: THREE.Group; pose(options: GrandmaPoseOptions): void } {
  const group = new THREE.Group(); group.name = "Grandma Rose";
  const skin = mat("#d49b78", .94), cheek = mat("#ce8871", 1), hair = mat("#d7d5cb", .99), hairShade = mat("#a8aca4", 1);
  const cardigan = mat("#b56a49", .98), knit = mat("#d49c69", .98), shirt = mat("#e9d9b6", 1);
  const trousers = mat("#526965", .98), shoe = mat("#59443b", .92), sole = mat("#d2b58d", 1);
  const eyes = mat("#3c2d27", .8), spectacles = mat("#6b5c43", .3, .5), lips = mat("#985941", 1);
  const hips = new THREE.Group(); group.add(hips); hips.position.y = .84;
  ball(hips, trousers, [0,0,0], [.19,.13,.12]);
  const torso = new THREE.Group(); hips.add(torso);
  const cloth = new THREE.LatheGeometry([new THREE.Vector2(.18,0),new THREE.Vector2(.208,.07),new THREE.Vector2(.217,.22),new THREE.Vector2(.18,.34),new THREE.Vector2(.125,.365)], 20);
  mesh(cloth, cardigan, torso, [0,.015,0], [1,1,.68]);
  ball(torso, shirt, [0,.25,-.131], [.08,.115,.013]);
  pipe(torso, knit, [[-.08,.35,-.09],[-.075,.26,-.15],[-.025,.14,-.145],[-.025,.02,-.125]], .012);
  pipe(torso, knit, [[.08,.35,-.09],[.075,.26,-.15],[.025,.14,-.145],[.025,.02,-.125]], .012);
  for (const y of [.05,.115,.18]) ball(torso, spectacles, [0,y,-.153], [.008,.008,.004], 10);
  // Hem, pockets and stitch edging add shape from the third-person camera.
  const hem = mesh(new THREE.TorusGeometry(.182,.011,6,28), knit, torso, [0,.025,0], [1,.68,1]); hem.rotation.x = Math.PI / 2;
  for (const side of [-1,1]) {
    pipe(torso, knit, [[side*.09,.14,-.128],[side*.15,.14,-.10],[side*.14,.06,-.113],[side*.09,.06,-.139]], .005);
    ball(torso, cardigan, [side*.192,.28,0], [.074,.081,.075]);
  }
  rod(torso, skin, [0,.35,0],[0,.43,0], .055);
  const head = new THREE.Group(); head.position.set(0,.50,-.012); torso.add(head);
  ball(head, skin, [0,0,0], [.125,.15,.112], 20);
  // Soft jaw, ears, cheeks, nose and a small curved smile.
  ball(head, skin, [0,-.075,-.018], [.090,.080,.082]);
  for (const side of [-1,1]) {
    ball(head, skin, [side*.124,-.008,0], [.022,.035,.018]);
    ball(head, cheek, [side*.073,-.043,-.089], [.030,.016,.011]);
    ball(head, eyes, [side*.047,.015,-.108], [.010,.013,.005], 12);
    ball(head, shirt, [side*.044,.019,-.113], [.003,.004,.002], 8);
    const ring = mesh(new THREE.TorusGeometry(.036,.0035,6,22), spectacles, head, [side*.049,.012,-.119]); ring.scale.y = .88;
    pipe(head, spectacles, [[side*.086,.016,-.115],[side*.121,.021,-.064],[side*.128,.008,-.012]], .003);
    pipe(head, hairShade, [[side*.025,.060,-.100],[side*.049,.066,-.107],[side*.072,.060,-.097]], .005);
    ball(head, spectacles, [side*.133,-.032,-.004], [.007,.009,.006], 10);
  }
  pipe(head, spectacles, [[-.014,.018,-.120],[0,.024,-.125],[.014,.018,-.120]], .0028);
  ball(head, skin, [0,-.011,-.12], [.020,.034,.028]);
  pipe(head, lips, [[-.032,-.064,-.100],[-.017,-.073,-.111],[0,-.076,-.115],[.017,-.073,-.111],[.032,-.064,-.100]], .0035);
  const cap = mesh(new THREE.SphereGeometry(.134,20,12,0,TAU,0,1.73), hair, head, [0,.035,.014], [1,1.0,.89]);
  cap.name = "Silver swept hair";
  for (let i=0;i<5;i++) {
    const x=(i-2)*.037;
    pipe(head, i%2 ? hairShade : hair, [[x,.151,.035],[x*.96,.137,-.049],[x*.88,.100,-.100]], .007);
  }
  // Broad bun at the back is readable throughout third-person gameplay.
  ball(head, hair, [0,.059,.125], [.086,.080,.066], 16);
  const bun = mesh(new THREE.TorusGeometry(.047,.008,6,20), hairShade, head, [0,.063,.183]); bun.scale.y=.82;
  pipe(head, knit, [[-.065,.037,.153],[0,.007,.18],[.065,.037,.153]], .005);
  const legs: { side: number; upper: THREE.Group; lower: THREE.Group; foot: THREE.Group }[] = [];
  for (const side of [-1,1]) {
    const upper = new THREE.Group(); hips.add(upper); upper.position.set(side*.097,-.02,0); upper.name = side < 0 ? "Rose left thigh" : "Rose right thigh";
    rod(upper,trousers,[0,0,0],[0,-.365,0],.071,.075);
    ball(upper,trousers,[0,-.35,0],[.068,.073,.064]);
    const lower = new THREE.Group(); upper.add(lower); lower.position.y=-.35;
    rod(lower,trousers,[0,0,0],[0,-.405,0],.049,.066);
    const cuff = mesh(new THREE.CylinderGeometry(.053,.054,.027,12), knit, lower, [0,-.392,0]); cuff.scale.z=.92;
    const foot = new THREE.Group(); lower.add(foot); foot.position.set(0,-.444,-.027); foot.name = side < 0 ? "Rose left shoe" : "Rose right shoe";
    ball(foot,shoe,[0,.023,-.025],[.067,.048,.112]);
    ball(foot,sole,[0,-.008,-.025],[.069,.018,.113]);
    for (let l=0;l<3;l++) rod(foot,knit,[-.030,.063,-.008-l*.016],[.030,.063,-.008-l*.016],.0025);
    legs.push({side,upper,lower,foot});
  }
  const arms = [-1,1].map(side => {
    const rig = new THREE.Group(); group.add(rig);
    const upper = mesh(new THREE.CylinderGeometry(.064,.051,1,14),cardigan,rig);
    const elbow = ball(rig,cardigan,[0,0,0],[.051,.055,.051]);
    const fore = mesh(new THREE.CylinderGeometry(.052,.037,1,14),cardigan,rig);
    const wrist = ball(rig,knit,[0,0,0],[.039,.026,.037]);
    const palm = new THREE.Group(); rig.add(palm); palm.name = side < 0 ? "Rose left hand" : "Rose right hand";
    ball(palm,skin,[0,0,0],[.039,.023,.049]);
    for(let f=0;f<4;f++) pipe(palm,skin,[[side*(-.026+f*.017),.006,-.023],[side*(-.026+f*.017),-.006,-.044],[side*(-.026+f*.017),-.023,-.039]],.0065);
    ball(palm,skin,[-side*.032,-.004,.012],[.016,.014,.028]);
    return {side,upper,elbow,fore,wrist,palm};
  });
  const vA = new THREE.Vector3(),vB=new THREE.Vector3(),direction=new THREE.Vector3();
  const shoulder=new THREE.Vector3(),elbowPos=new THREE.Vector3(),handPos=new THREE.Vector3();
  function positionLimb(m:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){direction.copy(b).sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=direction.length();m.quaternion.setFromUnitVectors(up,direction.normalize());}
  let smoothedReach = 1, lastPoseTime = 0, gait = 0, walking = 0;
  const thighLength = .35, shinLength = Math.hypot(.444, .027), ankleOffset = Math.atan2(.027, .444);
  const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
  function pose({walk,time,sit,lean,reach=1,fold=0,stumble=0,sideLean=0,hands}: GrandmaPoseOptions){
    const poseDt = Math.min(.05, Math.max(0, time - lastPoseTime)); lastPoseTime = time;
    const s = clamp(sit), l = clamp(lean), catchBalance = clamp(stumble), side = THREE.MathUtils.clamp(sideLean,-1,1);
    const targetWalk = clamp(Math.abs(walk)) * (1-s);
    walking += (targetWalk-walking) * (1-Math.exp(-poseDt*(targetWalk>walking ? 5 : 7)));
    smoothedReach += (clamp(reach)-smoothedReach) * (1-Math.exp(-poseDt*8));
    // Phase belongs to the feet, not to wall-clock time. Starting/stopping never snaps a stride.
    gait += poseDt * (4.7+walking*1.3) * Math.min(1,walking*7);
    const w = walking*(1-s), sway = Math.sin(gait)*w;
    hips.position.set(sway*.009,.84-s*.26-w*.027+Math.cos(gait*2)*w*.005-catchBalance*.045,s*.06);
    hips.rotation.set(0,sway*.014,sway*.014+side*.020);
    torso.rotation.set(-.06-l*.17-catchBalance*.16+s*.04, -sway*.018, -sway*.017+side*.09);
    head.rotation.set(.035+l*.10+catchBalance*.08,sway*.012,Math.sin(time*.65)*.008-sway*.012-side*.04);
    // Two-link leg IK plants each stance foot, lifts the swing foot and keeps sitting feet on the floor.
    for(const leg of legs){
      const phase = ((gait/TAU+(leg.side>0?.5:0))%1+1)%1;
      const stance = phase<.62, progress = stance ? phase/.62 : (phase-.62)/.38;
      const footPath = stance ? -.135+progress*.27 : .135-ease(progress)*.27;
      const lift = stance ? 0 : Math.sin(Math.PI*progress)*.067*w;
      const heel = stance ? .13*(1-ease(progress/.18))-.18*ease((progress-.76)/.24) : -.16*(1-ease(progress/.35))+.10*Math.sin(progress*Math.PI);
      const pitch = heel*w;
      const footZ = -.027-s*.278+footPath*w;
      const soleSupport = .008*Math.cos(pitch)-.025*Math.sin(pitch)+Math.hypot(.018*Math.cos(pitch),.113*Math.sin(pitch));
      const footY = soleSupport+lift+.002;
      const down = hips.position.y+leg.upper.position.y-footY, ahead = -(footZ-hips.position.z);
      const distance = THREE.MathUtils.clamp(Math.hypot(down,ahead),.12,thighLength+shinLength-.0001);
      const hipAngle = Math.atan2(ahead,down)+Math.acos(THREE.MathUtils.clamp((thighLength*thighLength+distance*distance-shinLength*shinLength)/(2*thighLength*distance),-1,1));
      const knee = Math.PI-Math.acos(THREE.MathUtils.clamp((thighLength*thighLength+shinLength*shinLength-distance*distance)/(2*thighLength*shinLength),-1,1));
      leg.upper.rotation.x=hipAngle;
      leg.lower.rotation.x=-knee-ankleOffset;
      leg.foot.rotation.x=-leg.upper.rotation.x-leg.lower.rotation.x+pitch;
      leg.foot.rotation.z=-hips.rotation.z;
    }
    for(const a of arms){
      shoulder.set(a.side*.21,.29,0).applyEuler(torso.rotation).add(torso.position).applyEuler(hips.rotation).add(hips.position);
      elbowPos.set(a.side*.245+sway*.006,1.00-s*.13-catchBalance*.025,-.18-l*.03-catchBalance*.02);
      handPos.set(a.side*.30*(1-clamp(fold)*.30),1.045-s*.01,-.433);
      if (hands) { handPos.copy(a.side<0?hands.left:hands.right); elbowPos.lerpVectors(shoulder,handPos,.52); elbowPos.y-=.085; elbowPos.z+=.025; }
      const resting = (1-smoothedReach)*s;
      elbowPos.x = THREE.MathUtils.lerp(elbowPos.x,a.side*.20,resting);
      elbowPos.y = THREE.MathUtils.lerp(elbowPos.y,.78,resting);
      elbowPos.z = THREE.MathUtils.lerp(elbowPos.z,-.06,resting);
      handPos.x = THREE.MathUtils.lerp(handPos.x,a.side*.10,resting);
      handPos.y = THREE.MathUtils.lerp(handPos.y,.64,resting);
      handPos.z = THREE.MathUtils.lerp(handPos.z,-.22,resting);
      vA.copy(shoulder);vB.copy(elbowPos);positionLimb(a.upper,vA,vB);a.elbow.position.copy(elbowPos);
      positionLimb(a.fore,elbowPos,handPos);a.wrist.position.copy(handPos);a.palm.position.copy(handPos);a.palm.rotation.x=-.08+s*.3;
    }
  }
  batchRigid(head); batchRigid(torso, new Set([head]));
  for (const leg of legs) { batchRigid(leg.foot); batchRigid(leg.lower, new Set([leg.foot])); batchRigid(leg.upper, new Set([leg.lower])); }
  for (const arm of arms) batchRigid(arm.palm);
  pose({walk:0,time:0,sit:0,lean:0});return {group,pose};
}

export function createVillain(): { group: THREE.Group; animate(time: number): void } {
  const group=new THREE.Group();group.name="The suspiciously generous stranger";
  const suit=mat("#33454a",.96),lapel=mat("#46595d",.91),shirt=mat("#eee0c5",1),tie=mat("#a9533b",.92);
  const skin=mat("#bd8a62",.94),hair=mat("#493b32",.98),shoe=mat("#493b32",.65),gold=mat("#d7ad56",.32,.45);
  const torso=new THREE.Group();group.add(torso);torso.position.y=.91;
  const body=new THREE.LatheGeometry([new THREE.Vector2(.17,0),new THREE.Vector2(.19,.08),new THREE.Vector2(.23,.40),new THREE.Vector2(.19,.47)],16);
  mesh(body,suit,torso,[0,0,0],[1,1,.64]);
  // Flat tailoring follows the jacket surface; lapels are cloth panels, not tubes.
  function jacketFront(x:number,y:number){
    const radius=y<.08?THREE.MathUtils.lerp(.17,.19,clamp(y/.08)):y<.40?THREE.MathUtils.lerp(.19,.23,(y-.08)/.32):THREE.MathUtils.lerp(.23,.19,clamp((y-.40)/.07));
    return Math.sqrt(Math.max(.001,radius*radius-x*x))*.64;
  }
  function tailoring(points:number[][],material:THREE.Material,offset=.008){
    const outline=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
    const base=new THREE.ShapeGeometry(outline),source=base.toNonIndexed(),vertices=source.getAttribute("position"),positions:number[]=[],uvs:number[]=[],normals:number[]=[];
    // Subdivide the panels so their interiors follow the chest, too. A single
    // flat triangle would disappear through the jacket's curved front.
    const steps=5;
    for(let i=0;i<vertices.count;i+=3){
      const at=(u:number,v:number)=>[vertices.getX(i)*(1-u-v)+vertices.getX(i+1)*u+vertices.getX(i+2)*v,vertices.getY(i)*(1-u-v)+vertices.getY(i+1)*u+vertices.getY(i+2)*v];
      const put=(p:number[])=>{
        positions.push(p[0],p[1],jacketFront(p[0],p[1])+offset);uvs.push(p[0],p[1]);
        const normal=new THREE.Vector3(-(jacketFront(p[0]+.001,p[1])-jacketFront(p[0]-.001,p[1]))/.002,-(jacketFront(p[0],p[1]+.001)-jacketFront(p[0],p[1]-.001))/.002,1).normalize();
        normals.push(normal.x,normal.y,normal.z);
      };
      for(let row=0;row<steps;row++)for(let column=0;column<steps-row;column++){
        put(at(row/steps,column/steps));put(at((row+1)/steps,column/steps));put(at(row/steps,(column+1)/steps));
        if(row+column<steps-1){put(at((row+1)/steps,column/steps));put(at((row+1)/steps,(column+1)/steps));put(at(row/steps,(column+1)/steps));}
      }
    }
    base.dispose();source.dispose();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute("normal",new THREE.Float32BufferAttribute(normals,3));
    return mesh(geometry,material,torso);
  }
  tailoring([[-.065,.468],[.065,.468],[.033,.306],[0,.258],[-.033,.306]],shirt);
  for(const side of [-1,1]){
    const points=[[-.061,.470],[-.132,.451],[-.172,.387],[-.132,.372],[-.150,.343],[-.017,.191],[-.037,.322]];
    tailoring(points.map(([x,y])=>[x*side,y]),lapel,.012).name="Notched suit lapel";
    tailoring([[side*.006,.465],[side*.057,.486],[side*.077,.431],[side*.031,.405]],shirt,.020);
  }
  tailoring([[-.014,.410],[.014,.410],[.021,.270],[0,.238],[-.021,.270]],tie,.022);
  tailoring([[0,.430],[.018,.413],[.012,.391],[-.012,.391],[-.018,.413]],tie,.026);
  for(const y of [.106,.176])ball(torso,gold,[0,y,jacketFront(0,y)+.006],[.006,.006,.003]);
  // A pocket welt, folded square and centre seam complete a coherent jacket.
  tailoring([[-.157,.298],[-.075,.298],[-.075,.287],[-.157,.287]],lapel,.012);
  tailoring([[-.145,.299],[-.125,.319],[-.109,.304],[-.091,.316],[-.084,.299]],shirt,.013);
  pipe(torso,lapel,[[0,.015,.113],[0,.070,.125],[0,.185,.139]],.002);
  for(const side of [-1,1]){
    rod(group,suit,[side*.105,.95,0],[side*.105,.48,0],.080,.082);
    rod(group,suit,[side*.105,.50,0],[side*.105,.10,0],.058,.071);
    ball(group,shoe,[side*.105,.065,.045],[.076,.061,.14]);
    ball(torso,suit,[side*.208,.397,0],[.083,.086,.079]);
    ball(torso,suit,[side*.27,.08,.02],[.061,.062,.06]);
    rod(torso,suit,[side*.22,.40,0],[side*.27,.08,.02],.062,.082);
    rod(torso,suit,[side*.27,.08,.02],[side*.29,-.14,.05],.041,.06);
    rod(torso,shirt,[side*.29,-.14,.05],[side*.29,-.17,.05],.044);
    ball(torso,skin,[side*.29,-.20,.05],[.042,.065,.039]);
  }
  rod(torso,skin,[0,.46,0],[0,.55,0],.054);
  const head=new THREE.Group();torso.add(head);head.position.set(0,.66,0);
  ball(head,skin,[0,0,0],[.13,.16,.112],20);
  ball(head,skin,[0,-.075,.02],[.105,.083,.09]);
  const cap=mesh(new THREE.SphereGeometry(.137,16,10,0,TAU,0,1.32),hair,head,[0,.045,-.006],[1,1,.91]);cap.rotation.z=-.1;
  for(const side of [-1,1])ball(head,hair,[side*.118,.023,-.024],[.015,.048,.045]);
  for(const side of [-1,1]){
    ball(head,skin,[side*.13,-.005,0],[.019,.033,.024]);
    ball(head,hair,[side*.047,.017,.105],[.011,.014,.006]);
    pipe(head,hair,[[side*.025,.055,.108],[side*.051,.067,.102],[side*.077,.061,.093]],.006);
  }
  ball(head,skin,[0,-.013,.116],[.023,.035,.035]);
  pipe(head,hair,[[-.039,-.069,.097],[0,-.077,.112],[.043,-.059,.094]],.0035);
  // A briefcase is part of the silhouette, with a gold clasp and a raised handle.
  const briefcase=new THREE.Group();torso.add(briefcase);briefcase.position.set(.29,-.39,.05);
  box(briefcase,lapel,[0,0,0],[.085,.27,.34]);
  pipe(briefcase,shoe,[[0,.15,-.06],[0,.21,-.05],[0,.21,.05],[0,.15,.06]],.012);
  box(briefcase,gold,[.046,.055,0],[.007,.03,.045]);
  batchRigid(head);batchRigid(briefcase);batchRigid(torso,new Set([head,briefcase]));batchRigid(group,new Set([torso]));
  return {group,animate(time){torso.rotation.z=Math.sin(time*1.3)*.012;head.rotation.y=Math.sin(time*.65)*.07;briefcase.rotation.x=Math.sin(time*1.5)*.025;}};
}

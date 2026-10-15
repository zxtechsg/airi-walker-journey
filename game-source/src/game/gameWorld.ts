import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DOCK, STREET_OBJECTIVES, WALL_OBSTACLE } from "./gamePhysics";
import type { ChallengeId } from "./types";

const palette = { pavement: 0xc6b79b, curb: 0xddcbb0, coral: 0xbc6853, rust: 0x99513e, gold: 0xc9904f, green: 0x456b61, dark: 0x284d4b, cream: 0xebd7b7, wood: 0x865f48, ink: 0x354746, leaf: 0x6c855d };
const materials = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number, roughness = .95) {
  let material = materials.get(color);
  if (!material) { material = new THREE.MeshStandardMaterial({ color, roughness }); materials.set(color, material); }
  return material;
}
export function box(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
  mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, height: number, color: number, top = radius, sides = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, height, sides), mat(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, color: number, sy = 1) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), mat(color));
  mesh.position.set(x, y, z); mesh.scale.y = sy; mesh.castShadow = true; parent.add(mesh); return mesh;
}
function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width: number, color = "#e8d4ae", background = "#35504c") {
  const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 128;
  const context = canvas.getContext("2d")!; context.fillStyle = background; context.fillRect(0, 0, 768, 128);
  context.fillStyle = color; context.font = "500 49px Georgia"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(text, 384, 68, 700);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 6), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function plant(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  cylinder(parent, x, .2 * scale, z, .3 * scale, .4 * scale, palette.rust, .38 * scale);
  sphere(parent, x, .58 * scale, z, .42 * scale, palette.leaf, 1.2);
}
function lamp(parent: THREE.Object3D, x: number, z: number) {
  cylinder(parent, x, 1.5, z, .055, 3, palette.ink, .04, 8);
  box(parent, x + .23, 3.05, z, .55, .06, .09, palette.ink);
  box(parent, x + .45, 2.96, z, .32, .15, .32, palette.cream);
}
function tree(parent: THREE.Object3D, x: number, z: number, size: number, color: number) {
  cylinder(parent, x, size * .45, z, size * .07, size * .9, palette.wood, size * .04, 7);
  sphere(parent, x, size * .93, z, size * .49, color, 1.18);
}
function house(parent: THREE.Object3D, x: number, z: number, width: number, depth: number, height: number, color: number, side: number, name: string) {
  const home = new THREE.Group(); parent.add(home); home.position.set(x, 0, z);
  // Storefronts face the street; all details share this local frame.
  home.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  box(home, 0, height / 2, 0, width, height, depth, color);
  box(home, 0, height + .12, 0, width + .25, .24, depth + .25, palette.cream);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(width * .77, 1.25, 4), mat(palette.rust));
  roof.rotation.y = Math.PI / 4; roof.position.y = height + .8; roof.scale.z = depth / width; roof.castShadow = true; home.add(roof);
  const front = depth / 2 + .018;
  box(home, -.55, .95, front, width * .45, 1.7, .05, palette.dark);
  box(home, width * .29, .95, front, .82, 1.85, .05, palette.wood);
  box(home, width * .29, 1.23, front + .04, .62, 1.05, .02, 0x738f84);
  for (const shift of [-.78, .78]) {
    box(home, shift, height - 1.05, front, .75, .96, .045, palette.cream);
    box(home, shift, height - 1.05, front + .03, .59, .8, .015, 0x6c8175);
    box(home, shift, height - 1.05, front + .05, .035, .82, .02, palette.cream);
  }
  const awning = box(home, -.2, 2.04, front + .45, width - .2, .12, .95, side > 0 ? palette.gold : palette.green);
  awning.rotation.x = .13;
  label(home, name, -.1, 2.6, front + .05, width - .3);
  plant(home, -width / 2 + .24, front + .65, .75);
}
// Bake immutable scenery by material to keep the full village inexpensive to render.
function batchScenery(group: THREE.Group, exclude: THREE.Object3D[]) {
  group.updateWorldMatrix(true, true);
  const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; cast: boolean; receive: boolean }>();
  group.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node instanceof THREE.InstancedMesh || Array.isArray(node.material)) return;
    let parent: THREE.Object3D | null = node;
    while (parent) { if (exclude.includes(parent)) return; parent = parent.parent; }
    const key = `${node.material.uuid}-${node.castShadow}-${node.receiveShadow}`;
    let batch = batches.get(key);
    if (!batch) { batch = { material: node.material, geometries: [], meshes: [], cast: node.castShadow, receive: node.receiveShadow }; batches.set(key, batch); }
    let geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    if (geometry.index) { const indexed = geometry; geometry = geometry.toNonIndexed(); indexed.dispose(); }
    batch.geometries.push(geometry); batch.meshes.push(node);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (geometry) { const mesh = new THREE.Mesh(geometry, batch.material); mesh.castShadow = batch.cast; mesh.receiveShadow = batch.receive; group.add(mesh); for (const old of batch.meshes) { old.removeFromParent(); old.geometry.dispose(); } }
    for (const old of batch.geometries) old.dispose();
  }
}
export const HOLE_OUTLINE = Array.from({ length: 22 }, (_, index) => {
  const angle = index / 22 * Math.PI * 2;
  const radius = 1.29 + Math.sin(index * 2.13) * .09 + Math.cos(index * 4.1) * .06;
  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
});
/** Both layers have a real aperture; the cover is a separate retracting mesh. */
export function createGroundSurface(width: number, depth: number, centerZ: number, y: number, color: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -centerZ - depth / 2); shape.lineTo(width / 2, -centerZ - depth / 2);
  shape.lineTo(width / 2, -centerZ + depth / 2); shape.lineTo(-width / 2, -centerZ + depth / 2); shape.closePath();
  const aperture = new THREE.Path();
  HOLE_OUTLINE.forEach((point, index) => { if (!index) aperture.moveTo(-4 + point.x, 5 - point.y); else aperture.lineTo(-4 + point.x, 5 - point.y); });
  aperture.closePath(); shape.holes.push(aperture);
  const surface = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(color)); surface.rotation.x = -Math.PI / 2; surface.position.y = y;
  surface.receiveShadow = true; surface.name = "ground-with-real-aperture"; return surface;
}
function createPit() {
  const pit = new THREE.Group(); pit.name = "below-grade-hole"; pit.position.set(-4, 0, -5);
  const positions: number[] = [], colors: number[] = [];
  const stone = new THREE.Color(0x766f5c), earth = new THREE.Color(0x574c38), deep = new THREE.Color(0x24352e);
  for (let i = 0; i < HOLE_OUTLINE.length; i++) {
    const a = HOLE_OUTLINE[i], b = HOLE_OUTLINE[(i + 1) % HOLE_OUTLINE.length];
    for (let layer = 0; layer < 3; layer++) {
      const top = [.021, -.18, -.85][layer], bottom = [-.18, -.85, -2.8][layer];
      const topScale = [1, 1, .94][layer], bottomScale = [1, .94, .74][layer];
      const verts = [[a.x * topScale, top, a.y * topScale], [b.x * topScale, top, b.y * topScale], [a.x * bottomScale, bottom, a.y * bottomScale], [b.x * topScale, top, b.y * topScale], [b.x * bottomScale, bottom, b.y * bottomScale], [a.x * bottomScale, bottom, a.y * bottomScale]];
      for (const vertex of verts) { positions.push(...vertex); const shade = (layer === 0 ? stone : layer === 1 ? earth : deep).clone().multiplyScalar(.83 + (i % 3) * .09); colors.push(shade.r, shade.g, shade.b); }
    }
    // Fractured paving chips sit flush with the lip; there is no raised circular rim.
    const edge = new THREE.Vector3(b.x - a.x, 0, b.y - a.y); const midpoint = new THREE.Vector3((a.x + b.x) / 2, .035, (a.y + b.y) / 2).multiplyScalar(1.04);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(edge.length() * .62, .045, .12), mat(i % 2 ? 0xb1a68e : palette.pavement));
    chip.position.copy(midpoint); chip.rotation.y = -Math.atan2(edge.z, edge.x); chip.rotation.z = Math.sin(i) * .08; chip.receiveShadow = true; pit.add(chip);
  }
  const walls = new THREE.BufferGeometry(); walls.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); walls.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); walls.computeVertexNormals();
  const lining = new THREE.Mesh(walls, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })); lining.receiveShadow = true; pit.add(lining);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(1.22, 22), new THREE.MeshBasicMaterial({ color: 0x101e1a })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -2.81; pit.add(bottom);
  const cover = new THREE.Group(); cover.name = "retracting-road-cover";
  const coverShape = new THREE.Shape(); HOLE_OUTLINE.forEach((point, index) => { if (!index) coverShape.moveTo(point.x, -point.y); else coverShape.lineTo(point.x, -point.y); }); coverShape.closePath();
  const cap = new THREE.Mesh(new THREE.ShapeGeometry(coverShape), mat(palette.pavement)); cap.rotation.x = -Math.PI / 2; cap.position.y = .027; cap.receiveShadow = true; cover.add(cap); pit.add(cover);
  return { pit, cover };
}
function glowTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128; const context = canvas.getContext("2d")!;
  const radial = context.createRadialGradient(64, 64, 5, 64, 64, 64); radial.addColorStop(0, "rgba(132,255,141,.18)"); radial.addColorStop(.72, "rgba(102,255,130,.03)"); radial.addColorStop(.88, "rgba(133,255,146,.48)"); radial.addColorStop(1, "rgba(102,255,130,0)");
  context.fillStyle = radial; context.fillRect(0, 0, 128, 128); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
export type World = { group: THREE.Group; halos: Record<string, THREE.Mesh>; hole: THREE.Group; holeCover?: THREE.Group; ice: THREE.Mesh; lidar: THREE.Mesh; dockLight?: THREE.Mesh; exit?: THREE.Group };
export function createStreet(): World {
  const group = new THREE.Group(); group.name = "street-world";
  group.add(createGroundSurface(90, 100, -12, -.04, 0x9caa83));
  group.add(createGroundSurface(17.7, 50, -12, .02, palette.pavement));
  box(group, -9.6, .06, -12, 1.65, .22, 48, palette.curb, false);
  box(group, 9.6, .06, -12, 1.65, .22, 48, palette.curb, false);
  // Cobble inlays add street texture without a material download or hundreds of calls.
  const cobbles = new THREE.InstancedMesh(new THREE.BoxGeometry(.38, .025, .6), mat(0xaeaa94), 240);
  const transform = new THREE.Object3D(); let index = 0;
  for (let row = 0; row < 40; row++) for (const x of [-8.4, -8, -.28, .28, 8, 8.4]) {
    transform.position.set(x + (row % 2) * .06, .027, 7 - row * 1.18); transform.updateMatrix(); cobbles.setMatrixAt(index++, transform.matrix);
  }
  cobbles.receiveShadow = true; group.add(cobbles);
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    house(group, side * 12, 2 - i * 8, 5.1 + (i % 2) * .6, 3.6, 4.4 + (i % 3) * .55, [palette.coral, palette.gold, palette.green, 0xae8670, 0xd4b98e][(i + (side + 1)) % 5], side, ["THE CORNER STORE", "EVERGREEN", "LITTLE SUN CAFÉ", "THE READING ROOM", "MORNING MARKET"][i]);
    lamp(group, side * 8.8, 4 - i * 8);
    plant(group, side * 9, 1.3 - i * 8, 1.1);
  }
  // Receding woods and angular mountains form a calm, readable horizon.
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1; const x = side * (18 + ((i * 7) % 12)); const z = 7 - i * 2.25;
    tree(group, x, z, 4 + (i % 3), [0x557560, 0x496a5d, 0x69816a][i % 3]);
  }
  for (let i = 0; i < 13; i++) {
    tree(group, -25 + i * 4.2, -44 - (i % 3), 5 + i % 3, 0x4f746a);
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(18 + (i % 3) * 4, 20 + (i % 4) * 5, 5), mat(i % 2 ? 0x79988b : 0x8eaa98));
    mountain.position.set(-75 + i * 13, 5, -77 - (i % 3) * 7); mountain.rotation.y = i; group.add(mountain);
  }
  // Small lived-in details along the verge.
  for (const [x, z] of [[-7.1, -12], [7.2, -19], [-7.1, -27]]) {
    box(group, x, .52, z, 1.6, .14, .6, palette.wood); box(group, x, .9, z + .25, 1.6, .68, .1, palette.wood);
    for (const dx of [-.55, .55]) box(group, x + dx, .28, z, .09, .5, .5, palette.ink);
  }
  // Physical obstacles remain visible after their feature has been discovered.
  const { pit: hole, cover: holeCover } = createPit(); group.add(hole);
  const wall = new THREE.Group(); wall.name = "circular-masonry-wall"; wall.position.set(WALL_OBSTACLE.x, 0, WALL_OBSTACLE.z); group.add(wall);
  cylinder(wall, 0, WALL_OBSTACLE.height / 2, 0, WALL_OBSTACLE.radius - .04, WALL_OBSTACLE.height, 0xa7745d, WALL_OBSTACLE.radius - .04, 64);
  cylinder(wall, 0, WALL_OBSTACLE.height + .055, 0, WALL_OBSTACLE.radius, .11, 0xd7c1a1, WALL_OBSTACLE.radius, 64);
  for (let course = 0; course < 5; course++) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(WALL_OBSTACLE.radius - .035, .009, 6, 64), mat(0x8d604f));
    seam.rotation.x = Math.PI / 2; seam.position.y = .12 + course * .29; wall.add(seam);
    for (let brick = 0; brick < 20; brick++) {
      const angle = (brick + (course % 2) * .5) / 20 * Math.PI * 2;
      cylinder(wall, Math.cos(angle) * (WALL_OBSTACLE.radius - .035), .265 + course * .29, Math.sin(angle) * (WALL_OBSTACLE.radius - .035), .009, .27, 0x8d604f, .009, 6);
    }
  }
  const iceShape = new THREE.Shape();
  for (let i = 0; i < 42; i++) { const angle = i / 42 * Math.PI * 2; const r = 1 + Math.sin(i * 1.8) * .055; const x = Math.cos(angle) * 1.9 * r, y = Math.sin(angle) * 2.35 * r; if (!i) iceShape.moveTo(x, y); else iceShape.lineTo(x, y); } iceShape.closePath();
  const iceGeometry = new THREE.ExtrudeGeometry(iceShape, { depth: .014, bevelEnabled: true, bevelThickness: .003, bevelSize: .022, bevelSegments: 1, steps: 1 });
  const ice = new THREE.Mesh(iceGeometry, new THREE.MeshPhysicalMaterial({ color: 0x77bfcf, roughness: .055, metalness: .18, clearcoat: 1, clearcoatRoughness: .03, transparent: true, opacity: .8, side: THREE.DoubleSide }));
  ice.rotation.x = -Math.PI / 2; ice.position.set(-3, .031, -17); ice.receiveShadow = true; group.add(ice);
  const frost = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(iceShape.getPoints().map(point => new THREE.Vector3(point.x, point.y, .02))), new THREE.LineBasicMaterial({ color: 0xd8f5f6, transparent: true, opacity: .8 })); ice.add(frost);
  const cracks: number[] = [];
  for (let i = 0; i < 8; i++) { const angle = i * 2.4; const x = Math.cos(angle) * .5, y = Math.sin(angle) * .6; const endX = Math.cos(angle) * 1.65, endY = Math.sin(angle) * 2.04; cracks.push(x, y, .021, x * .6 + endX * .4 + .12, y * .6 + endY * .4, .021, x * .6 + endX * .4 + .12, y * .6 + endY * .4, .021, endX, endY, .021); }
  const crackGeometry = new THREE.BufferGeometry(); crackGeometry.setAttribute("position", new THREE.Float32BufferAttribute(cracks, 3)); ice.add(new THREE.LineSegments(crackGeometry, new THREE.LineBasicMaterial({ color: 0xebfbff, transparent: true, opacity: .65 })));
  for (const [x, y, angle] of [[-.6, .2, -.6], [.55, -.5, -.6], [.1, 1.1, -.6]]) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(.1, 1.05), new THREE.MeshBasicMaterial({ color: 0xf4ffff, transparent: true, opacity: .5, depthWrite: false })); glint.position.set(x, y, .023); glint.rotation.z = angle; ice.add(glint);
  }
  for (const x of [3.23, 4.77]) { box(group, x, .86, -25, .94, 1.72, 3.4, palette.green); box(group, x, 1.77, -25, 1.05, .15, 3.52, palette.cream); }
  // Open pergola rails preserve the narrow passage while keeping its folding
  // demonstration visible from the overhead follow camera.
  for (const z of [-26.7, -23.3]) box(group, 4, 2.4, z, 2.5, .12, .12, palette.wood);
  for (const x of [2.9, 5.1]) for (const z of [-26.6, -23.4]) box(group, x, 1.2, z, .1, 2.4, .1, palette.wood);
  const halos: Record<string, THREE.Mesh> = {}; const objectiveGlow = glowTexture();
  for (const [id, target] of Object.entries(STREET_OBJECTIVES)) {
    if (id === "battery") continue;
    const ring = new THREE.Mesh(new THREE.RingGeometry(id === "gap" ? 2.2 : 2.25, id === "gap" ? 2.26 : 2.31, 64), new THREE.MeshBasicMaterial({ color: 0x43ff69, toneMapped: false, side: THREE.DoubleSide, transparent: true, opacity: .95, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(target.x, .065, target.z); group.add(ring); halos[id] = ring;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ map: objectiveGlow, color: 0x2eff4c, toneMapped: false, transparent: true, opacity: .65, depthWrite: false, side: THREE.DoubleSide })); glow.position.z = .003; ring.add(glow);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshStandardMaterial({ color: 0x38ff67, emissive: 0x08b92b, emissiveIntensity: 1.3 }));
    marker.position.set(target.x, id === "wall" ? 2 : 1.7, target.z); marker.name = `marker-${id}`; group.add(marker);
  }
  const lidar = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0x65e0c2, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false })); lidar.rotation.x = -Math.PI / 2; group.add(lidar);
  const exit = new THREE.Group(); exit.name = "manual-home-exit"; exit.position.set(-4, 0, -33); exit.visible = false; group.add(exit);
  const exitRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.18, 48), new THREE.MeshBasicMaterial({ color: 0x65ff9a, toneMapped: false, side: THREE.DoubleSide, transparent: true, opacity: .85 })); exitRing.rotation.x = -Math.PI / 2; exitRing.position.y = .07; exit.add(exitRing);
  for (const x of [-.6, .6]) box(exit, x, .7, 0, .08, 1.4, .08, palette.wood);
  box(exit, 0, 1.45, 0, 1.4, .16, .12, palette.wood);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.9, .55, 4), mat(0xb85d3f)); roof.rotation.y = Math.PI / 4; roof.position.y = 1.8; exit.add(roof);
  batchScenery(group, [hole, ice, lidar, exit, ...Object.values(halos), ...group.children.filter(child => child.name.startsWith("marker-"))]);
  return { group, halos, hole, holeCover, ice, lidar, exit };
}
export function createApartment(): World {
  const group = new THREE.Group(); group.name = "apartment-world";
  box(group, 0, -.16, 0, 10.7, .3, 11, 0xaa7b56, false);
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(.025, .012, 10.7), mat(0x926846), 22); const object = new THREE.Object3D();
  for (let i = 0; i < 22; i++) { object.position.set(-5.2 + i * .5, .001, 0); object.updateMatrix(); boards.setMatrixAt(i, object.matrix); } group.add(boards);
  box(group, 0, 1.6, -5.2, 10.7, 3.2, .18, 0xe3cfac);
  box(group, -5.28, 1.6, 0, .18, 3.2, 10.6, 0xc5c4a4);
  box(group, 5.28, .35, -.7, .18, .7, 9.3, 0xe3cfac);
  box(group, 0, .09, -5.04, 10.5, .15, .07, 0xf0dfc4);
  box(group, -5.14, .09, 0, .07, .15, 10.5, 0xf0dfc4);
  box(group, -.1, .016, .2, 6.1, .025, 4.2, 0xb8ba93, false);
  box(group, -.1, .032, .2, 5.72, .014, 3.82, 0xd4ceb0, false);
  for (let i = 0; i < 5; i++) box(group, -.1, .045, -1.35 + i * .8, 5.4, .005, .025, 0xb5b79b, false);
  // Sofa faces +Z; grandma sits against this backrest.
  box(group, -2.3, .19, -2.94, 2.9, .36, .84, 0x4d7771);
  box(group, -2.3, .71, -3.31, 2.9, .68, .25, 0x426961);
  for (const x of [-3.65, -.95]) box(group, x, .49, -2.78, .22, .46, 1.34, 0x426961);
  for (const x of [-3, -1.6]) { box(group, x, .41, -2.86, 1.3, .10, .68, 0x5b837a); const cushion = box(group, x, .73, -3.07, .63, .46, .18, x < -2 ? 0xd4b26b : 0xb8745d); cushion.rotation.z = x < -2 ? .17 : -.12; }
  // A second, visibly distinct seat offers a genuine choice.
  box(group, 2.25, .19, -2.94, 1.16, .36, .84, 0xbf815c);
  box(group, 2.25, .72, -3.27, 1.16, .7, .2, 0xb77354);
  for (const x of [1.66, 2.84]) box(group, x, .49, -2.76, .13, .46, 1.27, 0x8a624c);
  box(group, 2.25, .41, -2.86, .98, .10, .68, 0xd09669);
  for (const [x, z] of [[-3.5, -2.4], [-1.1, -2.4], [1.82, -2.4], [2.68, -2.4]]) cylinder(group, x, .14, z, .05, .25, 0x574e3c, .05, 8);
  // Window, framed landscape, shelving, plants and reading lamp.
  box(group, -1, 2, -5.08, 3.2, 1.85, .04, 0x496c68);
  box(group, -1, 2, -5.04, 2.92, 1.58, .025, 0xb7d0bc);
  for (const x of [-1.08, -.92]) box(group, x, 2, -5.01, .055, 1.65, .04, 0xf0dfc4);
  box(group, -1, 2, -5.0, 3, .07, .04, 0xf0dfc4);
  box(group, -2.8, 2.1, -4.96, .48, 2.02, .08, 0xcbac7b);
  box(group, .8, 2.1, -4.96, .48, 2.02, .08, 0xcbac7b);
  box(group, 2.3, 2.15, -5.05, 1.2, .95, .06, palette.wood);
  box(group, 2.3, 2.15, -5.0, 1.06, .81, .015, 0x799a80);
  const art = new THREE.Mesh(new THREE.CircleGeometry(.26, 24), new THREE.MeshBasicMaterial({ color: 0xe5b67a })); art.position.set(2.47, 2.29, -4.98); group.add(art);
  box(group, -4.45, .86, 2.2, .8, 1.72, 2.2, 0x93694c);
  for (const y of [.35, .87, 1.4]) { box(group, -4.01, y, 2.2, .04, .07, 2.05, 0xc6a778); for (let n = 0; n < 7; n++) box(group, -4.06, y + .2, 1.42 + n * .24, .17, .36 + (n % 2) * .06, .16, [0x5f7d70, 0xbd8b61, 0xdec999][n % 3]); }
  plant(group, -4.2, -4.25, 1.35); plant(group, 4.4, 2.8, 1.5);
  cylinder(group, .05, 1.12, -3.7, .045, 2.24, palette.ink);
  cylinder(group, .05, 2.12, -3.7, .48, .52, 0xe1bf80, .24, 12);
  cylinder(group, .05, .035, -3.7, .28, .07, palette.ink);
  // Dock is on the back-right wall, reachable via the clear foreground.
  box(group, DOCK.x, .08, DOCK.z, .95, .13, 1.05, 0x4d6861);
  box(group, DOCK.x, .42, DOCK.z - .48, .95, .72, .13, 0x5b786e);
  const dockLight = box(group, DOCK.x, .55, DOCK.z - .4, .45, .04, .03, 0x9cd6ae, false);
  (dockLight.material as THREE.MeshStandardMaterial).emissive.setHex(0x75b791); (dockLight.material as THREE.MeshStandardMaterial).emissiveIntensity = .5;
  label(group, "AIRI", DOCK.x, 1.05, -5.06, .6, "#496c62", "#e3cfac");
  const halos: Record<string, THREE.Mesh> = {};
  for (const [id, x] of [["sofa", -2.3], ["chair", 2.25]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.84, .89, 48), new THREE.MeshBasicMaterial({ color: 0xf5d28b, side: THREE.DoubleSide, transparent: true, opacity: .75, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .06, -1.15); group.add(ring); halos[id] = ring;
  }
  const lidar = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0x65e0c2, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false })); lidar.rotation.x = -Math.PI / 2; group.add(lidar);
  batchScenery(group, [lidar, dockLight, ...Object.values(halos)]);
  return { group, halos, hole: new THREE.Group(), ice: new THREE.Mesh(), lidar, dockLight };
}
export function createSky(scene: THREE.Scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { high: { value: new THREE.Color(0xb3cac0) }, low: { value: new THREE.Color(0xe8c99f) } },
    vertexShader: "varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.); vWorld=p.xyz; gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader: "uniform vec3 high; uniform vec3 low; varying vec3 vWorld; void main(){float t=clamp(normalize(vWorld).y*.9+.15,0.,1.); gl_FragColor=vec4(mix(low,high,t),1.);}",
  })); scene.add(sky);
}
export const STREET_TARGETS = Object.entries(STREET_OBJECTIVES).filter(([id]) => id !== "battery").map(([id, { x, z }]) => ({ id: id as ChallengeId, x, z }));

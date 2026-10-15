import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createGrandma } from "./models";
import type { ChallengeId as AllChallengeIds } from "./types";
import "./counterfactual.css";

type ChallengeId = Exclude<AllChallengeIds, "battery">;
type Props = { challenge: ChallengeId; reducedMotion?: boolean; paused?: boolean; title?: string };
const descriptions: Record<ChallengeId,string> = {
  hole: "Illustration: an ordinary walker rolls into a hole and Rose begins to fall forward into the opening. The scene freezes before impact.",
  ice: "Illustration: an ordinary walker slides forward across ice and Rose loses her footing, beginning to fall forward. The scene freezes before impact.",
  wall: "Illustration: an ordinary walker bumps into a wall and Rose pitches forward. The scene stops before a fall.",
  gap: "Illustration: an ordinary walker is too wide for a narrow passage and cannot get through.",
};
const smooth = (n:number) => { const t=THREE.MathUtils.clamp(n,0,1);return t*t*(3-2*t); };
const material = (color:THREE.ColorRepresentation,roughness=.88) => new THREE.MeshStandardMaterial({color,roughness});
function add(parent:THREE.Object3D,geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0) {
  const item=new THREE.Mesh(geometry,mat);item.position.set(x,y,z);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
}
function tube(parent:THREE.Object3D,mat:THREE.Material,a:number[],b:number[],radius:number){
  const va=new THREE.Vector3(a[0],a[1],a[2]),vb=new THREE.Vector3(b[0],b[1],b[2]);
  const item=add(parent,new THREE.CylinderGeometry(radius,radius,va.distanceTo(vb),10),mat);
  item.position.copy(va).add(vb).multiplyScalar(.5);item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return item;
}
/** An intentionally plain rollator: no AIRI branding, sensors or brake lights. */
function ordinaryWalker(){
  const group=new THREE.Group(),frame=new THREE.Group();group.add(frame);
  const aluminium=material("#929b90",.45),rubber=material("#3c4941"),fabric=material("#b8aa8c"),wheels:THREE.Mesh[]=[];
  for(const side of [-1,1]){
    const x=side*.30;
    tube(frame,aluminium,[x,.14,-.28],[x,1.025,.15],.024);
    tube(frame,aluminium,[x,.14,.28],[x,.73,-.03],.023);
    tube(frame,rubber,[x,1.045,.25],[x,1.045,.03],.035);
    for(const z of [-.28,.28]){
      tube(frame,aluminium,[x,.12,z],[x,.26,z],.018);
      const wheel=add(group,new THREE.CylinderGeometry(.115,.115,.055,16),rubber,x,.115,z);wheel.rotation.z=Math.PI/2;wheels.push(wheel);
    }
  }
  tube(frame,aluminium,[-.3,.53,-.12],[.3,.53,-.12],.022);
  tube(frame,aluminium,[-.3,.76,.02],[.3,.76,.02],.022);
  add(frame,new THREE.BoxGeometry(.5,.23,.21),fabric,0,.59,-.05);
  const buckets=new Map<THREE.Material,THREE.Mesh[]>();frame.updateMatrixWorld(true);
  frame.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const items=buckets.get(o.material)??[];items.push(o);buckets.set(o.material,items);}});
  for(const [mat,items] of buckets){const copies=items.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const merged=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(merged){items.forEach(o=>{o.geometry.dispose();o.removeFromParent();});add(frame,merged,mat);}}
  return {group,spin(distance:number){for(const wheel of wheels)wheel.rotateY(-distance/.115);}};
}
function makeFloor(scene:THREE.Scene,challenge:ChallengeId){
  const floorMat=material("#d5c7a3"),edgeMat=material("#b99669"),deepMat=material("#5c6a59");
  const shape=new THREE.Shape();shape.moveTo(-2.5,-2.5);shape.lineTo(2.5,-2.5);shape.lineTo(2.5,2.6);shape.lineTo(-2.5,2.6);shape.closePath();
  if(challenge==="hole"){
    // An actual opening in the ground mesh, with recessed sides and a lower floor.
    const opening=new THREE.Path();opening.absarc(0,.72,.51,0,Math.PI*2,true);shape.holes.push(opening);
    const sides=new THREE.CylinderGeometry(.51,.47,.84,40,6,true),positions=sides.getAttribute("position"),colors:number[]=[];
    for(let i=0;i<positions.count;i++){const color=new THREE.Color("#34473c").lerp(new THREE.Color("#b69a70"),(positions.getY(i)+.42)/.84);colors.push(color.r,color.g,color.b);}
    sides.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    add(scene,sides,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),0,-.42,-.72);
    const bottom=add(scene,new THREE.CircleGeometry(.475,40),deepMat,0,-.841,-.72);bottom.rotation.x=-Math.PI/2;
    const rim=add(scene,new THREE.TorusGeometry(.52,.040,8,40),edgeMat,0,.01,-.72);rim.rotation.x=Math.PI/2;
  }
  const floor=add(scene,new THREE.ShapeGeometry(shape),floorMat,0,-.004,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  if(challenge==="ice"){
    const patch=add(scene,new THREE.CircleGeometry(.82,32),new THREE.MeshStandardMaterial({color:"#a3c7c4",roughness:.2,metalness:.1,transparent:true,opacity:.83}),0,.007,-.44);patch.rotation.x=-Math.PI/2;patch.scale.x=1.28;
    const glint=material("#e3e7ce",.3);
    for(const [x,z,length] of [[-.38,-.65,.42],[.28,-.22,.36],[.16,-.91,.28]]){const line=add(scene,new THREE.BoxGeometry(length,.006,.018),glint,x,.016,z);line.rotation.y=-.55;}
  }
  if(challenge==="wall"){
    const radius=.70, centerZ=-1.305;
    const wall=add(scene,new THREE.CylinderGeometry(radius,radius,1.13,48),material("#b67f58"),0,.565,centerZ);
    add(scene,new THREE.CylinderGeometry(.74,.74,.065,48),material("#d7c1a1"),0,1.16,centerZ);
    for(let row=0;row<4;row++){
      const seam=add(scene,new THREE.TorusGeometry(radius+.004,.006,4,48),edgeMat,0,.17+row*.25,centerZ);seam.rotation.x=Math.PI/2;
      for(let i=0;i<12;i++){
        const angle=(i+(row%2)*.5)*Math.PI/6;
        const joint=add(scene,new THREE.BoxGeometry(.012,.23,.008),edgeMat,Math.sin(angle)*(radius+.005),.29+row*.25,centerZ+Math.cos(angle)*(radius+.005));joint.rotation.y=angle;
      }
    }
    wall.name="A round masonry wall";
  }
  if(challenge==="gap"){
    const wall=material("#648579"),cap=material("#b7b992");
    for(const side of [-1,1]){add(scene,new THREE.BoxGeometry(.62,1.20,.9),wall,side*.60,.60,-.70);add(scene,new THREE.BoxGeometry(.66,.06,.94),cap,side*.60,1.23,-.70);}
  }
}

/** Original illustrative loops; scripted counterfactuals, not a fall/biomechanics simulation. */
export default function CounterfactualClip({challenge,reducedMotion=false,paused=false,title}:Props){
  const host=useRef<HTMLDivElement>(null),current=useRef({paused,reducedMotion});current.current={paused,reducedMotion};
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const element=host.current;if(!element)return;setFailed(false);
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"low-power"});}catch{setFailed(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.domElement.setAttribute("aria-hidden","true");element.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#e5d9b7");scene.fog=new THREE.Fog("#e5d9b7",10,19);
    const camera=new THREE.OrthographicCamera(-2.35,2.35,1.32,-1.32,.01,25);camera.position.set(3.8,challenge==="hole"?4.8:3.2,4.5);camera.lookAt(0,.62,.05);
    scene.add(new THREE.HemisphereLight("#fff0d1","#6b8474",2.6));
    const sun=new THREE.DirectionalLight("#fff1cb",2.7);sun.position.set(-3,6,3);sun.castShadow=true;sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-3;sun.shadow.normalBias=.02;scene.add(sun);
    makeFloor(scene,challenge);
    const grandma=createGrandma(),walker=ordinaryWalker();scene.add(grandma.group,walker.group);
    const leftGrip=new THREE.Vector3(),rightGrip=new THREE.Vector3();
    let frame=0,last=0,elapsed=.28,dirty=true,previousMotion=current.current.reducedMotion,disposed=false,contextUnavailable=false;
    const resize=()=>{const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);renderer.setSize(w,h,false);camera.left=-1.32*w/h;camera.right=1.32*w/h;camera.updateProjectionMatrix();dirty=true;};
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    const visibility=()=>{last=0;dirty=true;};document.addEventListener("visibilitychange",visibility);
    const lost=(event:Event)=>{event.preventDefault();contextUnavailable=true;cancelAnimationFrame(frame);setFailed(true);};renderer.domElement.addEventListener("webglcontextlost",lost);
    function renderPose(t:number,dt:number){
      const approach=smooth(t/1.65),event=smooth((t-1.65)/.85),moving=t<1.65;
      const stop=challenge==="gap"?.71:.45;
      const z=THREE.MathUtils.lerp(1.62,stop,approach);
      grandma.group.position.set(0,0,z);grandma.group.rotation.set(0,0,0);walker.group.position.set(0,0,z-.65);walker.group.rotation.set(0,0,0);
      let stumble=0,sideLean=0,lean=0;
      if(challenge==="hole"){
        // The wheels cross the edge first; Rose then travels beyond her support
        // and partly descends into the opening. Freeze while still above impact.
        const fall=smooth((t-1.90)/.70);
        walker.group.position.z-=event*.36;walker.group.position.y=-event*.28;walker.group.rotation.x=-event*.68;
        grandma.group.position.z-=fall*.69;grandma.group.position.y=-fall*.13;
        grandma.group.rotation.x=-fall*.56;stumble=event;lean=fall*.80;
      }else if(challenge==="ice"){
        const slide=smooth((t-1.65)/.9),fall=smooth((t-1.95)/.70);
        walker.group.position.z-=slide*.76;walker.group.rotation.x=-fall*.08;
        // The rollator escapes straight ahead. Rose follows beyond her foot
        // support, with a larger forward fall than the main game's recovery.
        grandma.group.position.z-=slide*.17;grandma.group.position.y=fall*.06;
        grandma.group.rotation.x=-fall*.62;stumble=slide*.90;lean=slide*.42;
      }else if(challenge==="wall"){
        const bump=Math.sin(Math.min(1,(Math.max(0,t-1.65)/.4))*Math.PI);
        walker.group.position.z+=bump*.035;walker.group.rotation.x=bump*.06;
        grandma.group.rotation.x=-event*.11;stumble=event*.72;lean=event*.55;
      }else{
        const struggle=t>1.65&&t<2.7?Math.sin((t-1.65)*13)*.027:0;
        walker.group.rotation.y=struggle;walker.group.position.z+=event*.05;lean=event*.16;
      }
      walker.group.updateMatrixWorld(true);grandma.group.updateMatrixWorld(true);
      leftGrip.set(-.30,1.045,.217);rightGrip.set(.30,1.045,.217);walker.group.localToWorld(leftGrip);walker.group.localToWorld(rightGrip);grandma.group.worldToLocal(leftGrip);grandma.group.worldToLocal(rightGrip);
      grandma.pose({walk:moving?.75:0,time:elapsed,sit:0,lean,stumble,sideLean,hands:{left:leftGrip,right:rightGrip}});walker.spin(moving?dt*.7:0);
      const fade=t<.25?smooth(t/.25):1-smooth((t-4.15)/.55);renderer.domElement.style.opacity=String(fade);
    }
    const tick=(now:number)=>{
      if(disposed||contextUnavailable)return;frame=requestAnimationFrame(tick);
      if(document.hidden){last=0;return;}
      const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
      if(current.current.reducedMotion!==previousMotion){previousMotion=current.current.reducedMotion;dirty=true;}
      if(!current.current.paused&&!current.current.reducedMotion){elapsed+=dt;dirty=true;}
      if(dirty){const t=current.current.reducedMotion?2.65:elapsed%4.85;renderPose(t,dt);renderer.render(scene,camera);dirty=false;}
    };
    frame=requestAnimationFrame(tick);
    return()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener("visibilitychange",visibility);renderer.domElement.removeEventListener("webglcontextlost",lost);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){materials.add(mat);for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value);}}});
      geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[challenge]);
  return <div className={`ag-counterfactual${failed?" is-unavailable":""}`} role="img" aria-label={title??descriptions[challenge]} data-challenge={challenge}>
    <div ref={host} className="ag-counterfactual-canvas"/>
    {failed&&<svg className="ag-counterfactual-fallback" viewBox="0 0 300 170" aria-hidden="true"><path d="M0 125H300V170H0Z" fill="#cbbd9b"/><path d="M103 61L94 118M145 61L156 118M98 93H150M105 61H142" fill="none" stroke="#5e7565" strokeWidth="7" strokeLinecap="round"/><circle cx="94" cy="124" r="9" fill="#384d40"/><circle cx="157" cy="124" r="9" fill="#384d40"/><path d="M192 75L208 111H176Z" fill="#b97852"/><path d="M192 86V97M192 102V104" stroke="#f5e7c5" strokeWidth="3" strokeLinecap="round"/></svg>}
  </div>;
}

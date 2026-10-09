"use client";

import { useState } from "react";
import { BatteryCharging, MapPin, Radar } from "lucide-react";

export function NavigationInfographic({phase}:{phase:"sense"|"locate"|"route"}) {
  const [destination,setDestination]=useState<"user"|"dock">("user");
  const copy={
    sense:{label:"01 / SENSE",title:"See the room.",text:"LiDAR maps walls, furniture and open space. Radar can add range and motion cues. Wheel movement and the IMU help track AIRI’s position.",note:"GPS adds outdoor location. Indoors, AIRI relies on local sensing.",icon:Radar},
    locate:{label:"02 / LOCATE",title:"Find you. Find home.",text:"A compatible UWB phone, band or tag provides ranging data. Direction sensing or several measurements help locate you. The dock has a saved map position.",note:"BLE signal strength can add coarse proximity. Not every phone or tag supports UWB.",icon:MapPin},
    route:{label:"03 / NAVIGATE",title:"Take a clear path.",text:"AIRI plans around detected obstacles and waits within reach. At the dock, a marker or beacon helps align it. Contact and charging feedback confirm arrival.",note:"If the path is blocked or location uncertain, the planned response is to slow or stop.",icon:BatteryCharging},
  }[phase];
  const toDock=destination==="dock";
  return <div className="control-detail navigation-detail">
    <div className={`navigation-visual phase-${phase}`}><div className="map-heading"><span className="detail-eyebrow">ONE ROOM. A CLEAR ROUTE.</span><div className="map-destination" role="group" aria-label="Navigation destination"><button aria-pressed={!toDock} onClick={()=>setDestination("user")}>To you</button><button aria-pressed={toDock} onClick={()=>setDestination("dock")}>To dock</button></div></div>
      <svg className="room-map" viewBox="0 0 600 330" role="img" aria-label={`Illustrative room map: AIRI locates a tagged user and plans a route around furniture to ${toDock?"the charging dock":"a waiting point near the user"}.`}>
        <defs><pattern id={`map-grid-${phase}`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#a5b59c" opacity=".23"/></pattern></defs>
        <rect x="12" y="12" width="576" height="282" rx="3" fill={`url(#map-grid-${phase})`} stroke="#718269" strokeWidth="1.3"/>
        <path d="M12 214v80h210m-2-282h368v172" stroke="#b2c09f" strokeWidth="3" fill="none"/>
        <g className="map-scan" stroke="#a5c69b" strokeWidth="1" opacity=".5"><path d="M112 232L13 145M112 232L135 13M112 232L309 130M112 232L309 177M112 232L239 293"/><circle cx="13" cy="145" r="3" fill="#a5c69b"/><circle cx="135" cy="13" r="3" fill="#a5c69b"/><circle cx="309" cy="130" r="3" fill="#a5c69b"/><circle cx="309" cy="177" r="3" fill="#a5c69b"/></g>
        <rect x="310" y="124" width="115" height="73" rx="7" fill="#56664c" stroke="#8b9d7b"/><text x="367" y="166" fill="#d2ddc7" fontSize="13" textAnchor="middle">Furniture</text>
        <g className="map-dock"><rect x="34" y="40" width="63" height="40" rx="3" fill="#34442d" stroke="#97ad86"/><path d="M53 59h24m-17-9v18m11-18v18" stroke="#d5dfcb" strokeWidth="2"/><text x="66" y="102" textAnchor="middle" fill="#c3d1b7" fontSize="12">Dock</text></g>
        <path className="map-ranging" d="M112 232L511 73" stroke="#b8d6c0" strokeWidth="1.5" strokeDasharray="3 7" fill="none"/>
        <path key={destination} className="map-route" d={toDock?"M112 232C112 184 66 172 66 119V88":"M112 232C204 242 262 231 271 171S325 75 390 75H470"} pathLength="1" fill="none" stroke="#f29a6e" strokeWidth="3" strokeLinecap="round"/>
        <circle cx={toDock?66:470} cy={toDock?88:75} r="7" fill="#24331f" stroke="#f29a6e" strokeWidth="2"/>
        <g transform="translate(112 232)"><rect x="-18" y="-20" width="36" height="34" rx="4" fill="#dbe5d0"/><rect x="-23" y="-15" width="6" height="12" rx="2" fill="#a4b496"/><rect x="17" y="-15" width="6" height="12" rx="2" fill="#a4b496"/><rect x="-23" y="8" width="6" height="12" rx="2" fill="#a4b496"/><rect x="17" y="8" width="6" height="12" rx="2" fill="#a4b496"/><path d="M-10-14h20v18" stroke="#536645" fill="none" strokeWidth="3"/><text x="0" y="41" fill="#d9e3cf" fontSize="13" textAnchor="middle">AIRI</text></g>
        <g transform="translate(515 74)"><circle r="27" fill="#8fae7430" stroke="#8fae74" strokeDasharray="2 5"/><circle cy="-6" r="7" fill="none" stroke="#d8e6cb" strokeWidth="2"/><path d="M-12 14c0-15 24-15 24 0" fill="none" stroke="#d8e6cb" strokeWidth="2"/><rect x="12" y="4" width="7" height="10" rx="2" fill="#f29a6e"/><text y="49" fill="#d9e3cf" fontSize="12" textAnchor="middle">You + tag</text></g>
      </svg>
      <div className="map-legend"><span><i className="legend-scan"/>Room sensing</span><span><i className="legend-ranging"/>Tag ranging</span><span><i className="legend-route"/>Planned path</span></div>
    </div>
    <div className="detail-explanation"><span className="detail-eyebrow">{copy.label}</span><h4>{copy.title}</h4><p>{copy.text}</p><div className="detail-takeaway"><copy.icon size={24}/><span>{copy.note}</span></div><p className="detail-note">Navigation concept. Accuracy and behaviour require testing.</p></div>
  </div>;
}

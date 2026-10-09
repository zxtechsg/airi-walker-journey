"use client";

import { useRef, useState, type ComponentType } from "react";
import { Activity, BatteryCharging, Cpu, Gauge, Hand, MapPin, Radar, RefreshCw, type LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComputeInfographic, MotorInfographic, SensorInfographic } from "@/components/control-infographics";
import { NavigationInfographic } from "@/components/navigation-infographic";
import { ErgonomicDesign } from "@/components/ergonomic-design";

type SystemStep={id:string;title:string;copy:string;icon:LucideIcon;detail:ComponentType};
const controlSteps:SystemStep[]=[
  {id:"imu",title:"IMU Sensors",copy:"Read motion.",icon:Activity,detail:SensorInfographic},
  {id:"compute",title:"Compute Unit",copy:"Understand movement.",icon:Cpu,detail:ComputeInfographic},
  {id:"motor",title:"Motor Control",copy:"Apply the right force.",icon:Gauge,detail:MotorInfographic},
];
const navigationSteps:SystemStep[]=[
  {id:"sense",title:"Sense",copy:"Map the space.",icon:Radar,detail:()=> <NavigationInfographic phase="sense"/>},
  {id:"locate",title:"Locate",copy:"Find you and the dock.",icon:MapPin,detail:()=> <NavigationInfographic phase="locate"/>},
  {id:"route",title:"Navigate",copy:"Choose a clear path.",icon:BatteryCharging,detail:()=> <NavigationInfographic phase="route"/>},
];

function SystemCards({steps,label,initial=""}:{steps:SystemStep[];label:string;initial?:string}){
  const [expanded,setExpanded]=useState(initial);
  const hoverOpened=useRef("");
  const triggers=useRef<Record<string,HTMLButtonElement|null>>({});
  return <Accordion type="single" collapsible value={expanded} onValueChange={setExpanded} className="control-flow" aria-label={label} onKeyDown={event=>{if(event.key==="Escape"){triggers.current[expanded]?.focus();setExpanded("");}}}>
    {steps.map((step,index)=><AccordionItem key={step.id} value={step.id} className="control-card"><AccordionTrigger className="control-card-trigger" ref={element=>{triggers.current[step.id]=element;}}
      onPointerEnter={event=>{if(event.pointerType==="mouse"){hoverOpened.current=expanded!==step.id?step.id:"";setExpanded(step.id);}}}
      onPointerLeave={()=>{hoverOpened.current="";}}
      onClick={event=>{if(event.detail>0&&hoverOpened.current===step.id){event.preventDefault();hoverOpened.current="";}}}
      onFocus={event=>{if(event.currentTarget.matches(":focus-visible"))setExpanded(step.id);}}>
      <span className="control-card-summary"><span className="simple-step-icon"><step.icon size={28} strokeWidth={1.3}/><span>0{index+1}</span></span><span className="control-card-title">{step.title}</span><span className="control-card-copy">{step.copy}</span><span className="control-card-cue">{expanded===step.id?"Close":"Explore"}</span></span>
    </AccordionTrigger><AccordionContent className="control-content"><div className="control-detail-shell"><step.detail/></div></AccordionContent></AccordionItem>)}
  </Accordion>;
}

export function HowItWorks(){
  return <section className="how-section content-width" id="how-it-works" aria-labelledby="how-title">
    <div className="section-heading reveal"><div><p className="eyebrow">THOUGHTFUL BY DESIGN</p><h2 id="how-title">Intelligence.<br/><span>With a human touch.</span></h2></div><p className="small-note">Explore the thinking inside AIRI.</p></div>
    <div className="intelligence-panel reveal"><div className="intelligence-topline"><span className="system-mark">THE AIRI SYSTEM</span><span>Design concept</span></div>
      <Tabs defaultValue="control" className="simple-system-tabs"><TabsList className="system-switch" aria-label="AIRI systems">
        <TabsTrigger value="control"><Activity size={17}/>Movement</TabsTrigger><TabsTrigger value="navigation"><MapPin size={17}/>Navigation</TabsTrigger><TabsTrigger value="ergonomics"><Hand size={17}/>Ergonomic design</TabsTrigger>
      </TabsList>
        <TabsContent value="control" className="simple-system-content"><SystemCards steps={controlSteps} label="Movement control details"/><p className="simple-feedback"><RefreshCw size={15}/>Sense → decide → respond. Continuously.</p></TabsContent>
        <TabsContent value="navigation" className="simple-system-content"><SystemCards steps={navigationSteps} label="Navigation details" initial="sense"/><p className="simple-feedback">Local sensing indoors. GPS outdoors.</p></TabsContent>
        <TabsContent value="ergonomics" className="simple-system-content"><ErgonomicDesign/></TabsContent>
      </Tabs>
      <details className="technical-references"><summary>Technical references</summary><a href="https://docs.nav2.org/jazzy/configuration_and_development/first_time_robot_setup_guide/gazebo/" target="_blank" rel="noreferrer">Mapping + odometry</a><a href="https://developer.android.com/develop/connectivity/uwb" target="_blank" rel="noreferrer">UWB ranging</a><a href="https://docs.nav2.org/jazzy/tutorials/general_tutorials/using_docking/" target="_blank" rel="noreferrer">Docking</a><a href="https://www.oxfordhealth.nhs.uk/wp-content/uploads/2014/08/OP-106.15-Safety-information-leaflet-walking-frames.pdf" target="_blank" rel="noreferrer">Walking-frame fit</a><a href="https://www.linak.com/ind-ohe/ic-integrated-controller/actuators-with-io-interface/parallel" target="_blank" rel="noreferrer">Synchronized actuators</a></details>
    </div>
  </section>;
}

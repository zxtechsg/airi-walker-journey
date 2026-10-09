import { Activity, Database, Footprints, Gauge, Hand, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";

const signals = [
  { name: "Gyroscope", detail: "Rotation rate · 3 axes", path: "M0 28H20Q35 28 43 13T68 28T94 28T120 28H150Q164 28 174 42T198 28T224 28H260", className: "gyro" },
  { name: "Accelerometer", detail: "Acceleration + gravity · 3 axes", path: "M0 28H28L42 24L55 34L72 11L90 48L110 21L126 28H160L180 13L194 43L210 23L228 28H260", className: "accel" },
];

export function SensorInfographic() {
  return <div className="control-detail imu-detail">
    <div className="signal-board"><span className="detail-eyebrow">ILLUSTRATIVE SENSOR SIGNALS</span>
      {signals.map(signal=><div className={`signal-row ${signal.className}`} key={signal.name}><div><strong>{signal.name}</strong><span>{signal.detail}</span></div><svg viewBox="0 0 260 56" aria-hidden="true"><path className="signal-gridline" d="M0 28H260"/><path className="signal-wave" d={signal.path}/></svg></div>)}
      <div className="signal-input-pair"><span><Gauge size={19}/><strong>Wheel encoders</strong><small>Wheel speed</small></span><span><Hand size={19}/><strong>Handle sensors</strong><small>Push + support load</small></span></div>
    </div>
    <div className="detail-explanation"><span className="detail-eyebrow">01 / SENSE</span><h4>Read the movement.</h4><p>The IMU tracks rotation and acceleration. Wheel encoders add speed. Handle sensors add load.</p><div className="detail-takeaway"><Activity size={23}/><span>Together, these signals help estimate tilt, pace and sudden changes.</span></div><p className="detail-note">The IMU measures AIRI’s motion. It does not directly measure a person’s balance.</p></div>
  </div>;
}

const training = [
  { name: "Record", text: "Walks, turns, stops + standing", icon: Database },
  { name: "Label", text: "Pace, intent + instability", icon: Layers3 },
  { name: "Train", text: "Learn patterns across users", icon: Activity },
  { name: "Test", text: "New people. New conditions.", icon: ShieldCheck },
];

export function ComputeInfographic() {
  return <div className="control-detail compute-detail">
    <div className="training-visual"><span className="detail-eyebrow">FROM REAL MOVEMENT TO A MODEL</span><ol className="training-pipeline">{training.map((stage,index)=><li key={stage.name}><span className="training-number">0{index+1}</span><stage.icon size={20}/><div><strong>{stage.name}</strong><small>{stage.text}</small></div></li>)}</ol><div className="model-output"><span>Movement model</span><strong>Sense → decide → respond</strong></div></div>
    <div className="detail-explanation"><span className="detail-eyebrow">02 / UNDERSTAND</span><h4>The right support.<br/>At the right moment.</h4><p>The planned model learns from labelled, real-world sensor data.</p><div className="model-goals"><div><Footprints size={22}/><span><strong>Follow your pace</strong>Gentle assistance as you walk.</span></div><div><ShieldCheck size={22}/><span><strong>Respond to instability</strong>Controlled slowing and small torque adjustments.</span></div><div><LockKeyhole size={22}/><span><strong>Support getting up</strong>Hold wheels still before walking resumes.</span></div></div><p className="detail-note">A local controller keeps force and speed within limits. Model performance needs testing.</p></div>
  </div>;
}

export function MotorInfographic() {
  return <div className="motor-detail"><div className="control-detail">
    <div className="motor-visual"><span className="detail-eyebrow">A SHORT, LOCAL CONTROL LOOP</span><div className="motor-stack"><div className="motor-node model-node"><span>Movement model</span><small>Sets the support target</small></div><span className="connection-line"/><div className="motor-node controller-node"><span>Motor controller</span><small>Current + encoder feedback</small></div><div className="motor-branch"/><div className="motor-pair"><div><span className="wheel-symbol"/><strong>Left motor</strong><small>Torque control</small></div><div><span className="wheel-symbol"/><strong>Right motor</strong><small>Torque control</small></div></div><div className="brake-strip"><LockKeyhole size={17}/><span>Separate brakes hold at rest + power off</span></div></div></div>
    <div className="detail-explanation"><span className="detail-eyebrow">03 / RESPOND</span><h4>Smooth drive.<br/>Precise wheel control.</h4><p>Two encoder-equipped BLDC / PMSM motors use field-oriented control to adjust torque, even at low speed.</p><ul className="motor-system-list"><li><strong>Fast local response</strong>A dedicated motor MCU closes the control loop.</li><li><strong>Move with less resistance</strong>Direct drive, or low-ratio backdrivable gearing.</li><li><strong>Hold with confidence</strong>Separate spring-applied brakes secure standstill.</li></ul></div>
  </div><details className="engineering-details"><summary>Engineering notes + sources</summary><p>Motor size depends on load, wheel size, slope and stopping distance. Regenerated energy needs a safe path. Holding brakes are not a substitute for rated dynamic or emergency braking. Prototype testing must establish response and stability.</p><div><a href="https://www.ti.com/lit/pdf/tidub03" target="_blank" rel="noreferrer">TI: field-oriented control</a><a href="https://www.maxongroup.com/medias/sys_master/root/9410428993566/Cataloge-Page-EN-592.pdf" target="_blank" rel="noreferrer">maxon: holding brakes</a></div></details></div>;
}

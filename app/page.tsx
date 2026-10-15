"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Play, Pause, Plus, Check, Mail, Menu, X, Armchair, LockKeyhole, Footprints, BatteryCharging, ShieldCheck, MoveRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { type Scenario } from "@/components/scenario-experience";
import { ContourField, ScenarioJourney, ScrollStatement, ScrollInvitation } from "@/components/scroll-journey";
import { useVisibleVideo } from "@/components/use-visible-video";
import { useAutoCarousel } from "@/components/use-auto-carousel";
import { ProductDetailFilm } from "@/components/product-detail-film";
import { ProductFilm } from "@/components/product-film";
import { FallEvidence } from "@/components/fall-evidence";
import { FoldExperience } from "@/components/fold-experience";
import { HowItWorks } from "@/components/how-it-works";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function subscribeMotion(callback: () => void) { const media = matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
function getMotionSnapshot() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }

const EMAIL = "e1523083@u.nus.edu";
const features = [
  { name: "Smart Recall", title: "A little closer.\nWhenever you need.", copy: "Call AIRI to you. Your support comes within reach, so you can start from where you are.", image: "unfolded", detail: "controls", kind: "recall", tag: "Support, on call." },
  { name: "Assisted Movement", title: "Less effort.\nMore everyday.", copy: "Motorised wheels help lighten the effort of walking. Keep moving through the moments that matter.", image: "unfolded", detail: "wheel", kind: "assist", tag: "Go at your pace." },
  { name: "Smart Braking", title: "A steadier\nnext step.", copy: "Responsive braking is designed to slow the wheels when sudden loading or unstable movement is detected.", image: "unfolded", detail: "wheel", kind: "brake", tag: "Thoughtful wheel control." },
  { name: "Stand Assist", title: "Get up.\nWith support.", copy: "Secure wheels support the transition from sitting to standing, helping keep AIRI in position.", image: "unfolded", detail: "bag", kind: "stand", tag: "Ready for the first step." },
  { name: "Compact Folding", title: "Life goes places.\nAIRI goes too.", copy: "Fold AIRI for storage and everyday travel. Make room for the next part of your day.", image: "folded", detail: "folding", kind: "fold", tag: "Big support. Small footprint." },
];
const closeups = [
  { id: "controls", name: "Handles & controls", caption: "Comfort, right at hand." },
  { id: "wheel", name: "Motorised wheels", caption: "Designed to go at your pace." },
  { id: "folding", name: "Frame details", caption: "Considered from every angle." },
  { id: "bag", name: "Everyday carry", caption: "Make room for the little things." },
];
const scenarios: Scenario[] = [
  { id: "home", name: "Around home", icon: Footprints, title: "Call. And carry on.", description: "AIRI comes to you and stops within reach. Your next step starts here.", cue: "Support, just a call away.", steps: ["Call AIRI", "AIRI approaches", "Hold the handles", "Ready to move"], details: ["A call from your phone or tag begins recall.", "AIRI moves closer to where you are.", "Position the walker and take hold.", "Your next step starts with support."], states: ["Listening", "Approaching", "Within reach", "Ready for you"] },
  { id: "stand", name: "Getting up", icon: Armchair, title: "A good start. Every time.", description: "Secure wheels hold position as you rise. Support before the first step.", cue: "Support for the transition.", steps: ["Sit comfortably", "Grip the walker", "Wheels secure", "Stand with support"], details: ["Bring AIRI within a comfortable reach.", "Place your hands on the handles.", "Wheel control holds AIRI in position.", "Rise into a supported standing position."], states: ["Positioned", "Hands in place", "Wheels secured", "Standing"] },
  { id: "balance", name: "Staying steady", icon: ShieldCheck, title: "Support for the unexpected.", description: "A sudden shift. A measured response. Controlled braking helps keep support close.", cue: "Responsive support.", steps: ["A sudden shift", "Instability sensed", "Wheels respond", "Steady again"], details: ["A sudden change interrupts your stride.", "Movement and loading inform wheel control.", "Controlled braking slows and secures the wheels.", "Pause, regain support, and continue when ready."], states: ["Movement changes", "Sensing change", "Braking", "Supported"] },
  { id: "travel", name: "Going out", icon: MoveRight, title: "Ready for a change of scene.", description: "Slide together. Pack away. Bring familiar support wherever the day goes.", cue: "Same support. New places.", steps: ["Prepare to travel", "Slide the sides in", "Lift with care", "Store in the car"], details: ["A companion prepares AIRI for travel.", "The side frames slide together on telescoping rails.", "Lift the folded walker with both hands.", "Store it securely for the journey."], states: ["Ready to fold", "Compact", "Lifting", "Stored"] },
  { id: "charge", name: "Recharging", icon: BatteryCharging, title: "A little rest. Ready again.", description: "Back to the dock when power runs low. Back to you when you call.", cue: "Power for the everyday.", steps: ["Low power detected", "Return to the dock", "Recharge", "Call AIRI back"], details: ["AIRI recognises when power is running low.", "It returns to the charging point.", "AIRI replenishes its battery.", "Once ready, recall brings AIRI back to you."], states: ["Low power", "Returning", "Charging", "Ready"] },
];
const questions = [
  ["How do I call AIRI?", "Call from a compatible phone or tag. AIRI approaches and stops within reach. Take hold when you’re ready."],
  ["What do the sensors detect?", "IMU sensors collect rotation rate and acceleration data. Wheel encoders add speed; handle sensors add support load. The planned model uses this feedback to guide braking and assistance."],
  ["When does assistance or braking begin?", "Assistance supports deliberate walking. Braking responds to unstable movement or sudden loading, and secure wheel control supports the transition from sitting to standing."],
  ["How do I stay in control?", "You choose when to call, hold and move. An on-demand stop control pauses powered movement. Controls will be refined through prototype testing."],
  ["Who is AIRI designed for?", "Older adults who can still walk but benefit from support for balance or lower-limb movement. A demo is a chance to explore the design with the AIRI team and discuss individual needs."],
];

function RequestForm({ type, onSaved }: { type: "demo" | "enquiry"; onSaved?: () => void }) {
  const id = useId();
  const [bookingFor, setBookingFor] = useState("Myself");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const minDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || "").trim();
    setError("");
    if (value("website")) return;
    const contact = value("contact");
    if (value("name").length < 2 || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^\+?[\d\s()\-]{7,25}$/.test(contact) && contact.replace(/\D/g, "").length >= 7)) {
      setError("Please enter your name and a valid email or phone number."); return;
    }
    if (type === "demo" && (value("date") < minDate || new Date(value("date") + "T" + value("time") + ":00+08:00").getTime() <= Date.now())) {
      setError("Please choose a future date and time."); return;
    }
    const lines = ["Name: " + value("name"), "Contact: " + contact];
    if (type === "demo") lines.push("Booking for: " + bookingFor, "Preferred date: " + value("date"), "Preferred time: " + value("time") + " (Singapore time)");
    lines.push("", value("message"));
    setDraft("mailto:" + EMAIL + "?subject=" + encodeURIComponent(type === "demo" ? "AIRI demo request" : "AIRI enquiry") + "&body=" + encodeURIComponent(lines.join("\n")));
  }
  if (draft) return <div className="form-success" role="status"><div className="success-icon"><Mail size={28} /></div><h3>Your email is ready.</h3><p>Open the draft, review it, then send it from your email app. {type === "demo" ? "Your preferred time is a request, pending confirmation." : "We look forward to hearing from you."}</p><a className="button" href={draft}>Open email draft</a><p className="form-fine">Nothing has been sent yet.</p><button className="subtle-button" onClick={() => setDraft("")}>Start another request</button></div>;
  return <form className="request-form" onSubmit={submit}>
    {type === "demo" && <fieldset><legend>I am booking for</legend><RadioGroup name="bookingFor" value={bookingFor} onValueChange={setBookingFor} className="booking-choices">{["Myself", "A family member", "Someone I care for", "An organisation"].map((choice, i) => <label key={choice} htmlFor={id + i} className={bookingFor === choice ? "selected" : ""}><RadioGroupItem id={id + i} value={choice} />{choice}</label>)}</RadioGroup></fieldset>}
    <div className="form-row"><label htmlFor={id + "name"}>Name<input autoComplete="name" id={id + "name"} name="name" placeholder="Your name" required maxLength={100} /></label><label htmlFor={id + "contact"}>{type === "demo" ? "Phone / Email" : "Email or phone"}<input autoComplete="email" id={id + "contact"} name="contact" placeholder="How we can reach you" required maxLength={180} /></label></div>
    {type === "demo" && <div className="form-row"><label htmlFor={id + "date"}>Preferred date<input id={id + "date"} type="date" name="date" min={minDate} required /></label><label htmlFor={id + "time"}>Preferred time<input id={id + "time"} type="time" name="time" required /></label></div>}
    <label htmlFor={id + "message"}>{type === "demo" ? <>Anything we should know? <span>(Optional)</span></> : "Message"}<textarea id={id + "message"} name="message" placeholder={type === "demo" ? "Tell us a little about your needs." : "How can we help?"} rows={3} maxLength={2000} required={type === "enquiry"} /></label>
    <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error && <p role="alert" className="form-error">{error} You can also <a href={"mailto:" + EMAIL}>email us</a>.</p>}
    <button className="button form-submit" type="submit">Prepare email</button>
    <p className="form-fine">{type === "demo" ? "Times shown in Singapore time. " : ""}This opens a draft for you to send through your email app.</p>
  </form>;
}

export default function Home() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [filmOpen, setFilmOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionRequested, setMotionOn] = useState(true);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getMotionSnapshot, () => false);
  const motionOn = motionRequested && !reducedMotion;
  const ambientMotionOn = motionOn && !demoOpen && !filmOpen && featureOpen === null;
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);
  const readingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const highlightsRef = useRef<HTMLElement>(null);
  useVisibleVideo(heroVideoRef, ambientMotionOn, false, true);
  useAutoCarousel(carouselApi, highlightsRef, ambientMotionOn);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    document.documentElement.dataset.motion = "ready";
    let frame = 0;
    const scroll = () => { if (frame) return; frame = requestAnimationFrame(() => { const max = document.documentElement.scrollHeight - innerHeight; readingRef.current?.style.setProperty("transform", `scaleX(${max > 0 ? scrollY / max : 0})`); heroRef.current?.style.setProperty("--hero-progress", String(Math.min(1, scrollY / 850))); frame = 0; }); };
    scroll();
    addEventListener("scroll", scroll, { passive: true });
    return () => { observer.disconnect(); delete document.documentElement.dataset.motion; removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => { if (!carouselApi) return; const select = () => setSlide(carouselApi.selectedScrollSnap()); carouselApi.on("select", select); return () => { carouselApi.off("select", select); }; }, [carouselApi]);
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void } }).modelContext;
    if (!modelContext) return;
    const lifecycle = new AbortController();
    try { modelContext.registerTool({ name: "start_airi_demo_request", title: "Start AIRI demo request", description: "Open the AIRI demo booking form. This does not submit a request.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input: unknown) { if (typeof input !== "object" || input === null || Object.keys(input).length) throw new Error("No input fields are accepted."); setDemoOpen(true); return { status: "form_opened" }; } }, { signal: lifecycle.signal }); } catch (e) { console.warn("AIRI tool registration unavailable", e); }
    return () => lifecycle.abort();
  }, []);
  const goTo = () => setMenuOpen(false);
  return <main className={motionOn ? "motion-enabled" : "motion-paused"}>
    <a className="skip-link" href="#meet">Skip to content</a>
    <header className="navigation"><div className="nav-inner"><a className="wordmark" href="#" onClick={goTo} aria-label="AIRI home">AIRI</a><nav aria-label="Main navigation" className={menuOpen ? "menu-open" : ""}><a href="#meet" onClick={goTo}>Meet the Walker</a><a href="#action" onClick={goTo}>See It in Action</a><a href="#how-it-works" onClick={goTo}>How It Works</a><a href="#about" onClick={goTo}>About Us</a><a href="#contact" onClick={goTo}>Contact Us</a></nav><div className="nav-actions"><button className="motion-switch" aria-label={motionOn ? "Pause all motion" : "Resume motion"} onClick={() => setMotionOn(!motionOn)}>{motionOn ? <Pause size={17} /> : <Play size={17} />}</button><button className="button small" onClick={() => { setDemoOpen(true); goTo(); }}>Book a Demo</button><button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button></div></div><div className="reading-progress" ref={readingRef} /></header>
    <section className="hero" id="meet" ref={heroRef}>
      <ContourField />
      <div className="hero-copy"><p className="hero-brand">AIRI / INTELLIGENT WALKING SUPPORT</p><h1>More life.<br /><span>Every step.</span></h1><p className="hero-summary">The smart walker that comes to you.<br />And moves life forward.</p><div className="hero-actions"><button className="button" onClick={() => setDemoOpen(true)}>Meet AIRI</button><button className="text-link" onClick={() => setFilmOpen(true)}>Watch the film <Play size={14} fill="currentColor" /></button></div></div>
      <div className="hero-visual"><video ref={heroVideoRef} src="./assets/airi-gallery.mp4" poster="./assets/airi-gallery-poster.webp" autoPlay muted loop playsInline preload="metadata" aria-label="AIRI in a sunlit architectural gallery" /><span className="hero-orbit" aria-hidden="true" /></div>
      <div className="hero-bottom"><span>Assisted Intelligent Reactive Independence</span><div><span>Comes to you.</span><span>Moves with you.</span><span>Made for you.</span></div></div>
    </section>

    <section className="game-invitation content-width" id="play" aria-labelledby="game-invitation-title">
      <a className="game-invitation-card" href="./game/">
        <div className="game-invitation-copy"><p className="eyebrow">PLAY THE AIRI EXPERIENCE</p><h2 id="game-invitation-title">Experience AIRI<br /><em>in First Person.</em></h2><p>Take control of Rose. Explore the neighbourhood, test the obstacles and discover what AIRI could do.</p><span className="game-invitation-cta">Play the game <MoveRight size={22} /></span><small>Free to play · About 5 minutes · Browser demo</small></div>
        <div className="game-invitation-image"><img src="./assets/airi-game-preview.png" alt="Rose exploring the AIRI game with her smart walker" width="1100" height="760" loading="lazy" /><span><Play size={20} fill="currentColor" /> THE MILLION DOLLAR STROLL</span></div>
      </a>
    </section>

    <ScrollStatement motionOn={motionOn} />

    <section className="highlights section-tint" id="highlights" ref={highlightsRef} aria-labelledby="highlights-title"><div className="section-heading content-width reveal"><div><p className="eyebrow">THE LITTLE THINGS. REIMAGINED.</p><h2 id="highlights-title">Support, in every detail.</h2></div><button className="text-link" onClick={() => setFilmOpen(true)}>Watch How It Works <Play size={17} fill="currentColor" /></button></div>
      <Carousel setApi={setCarouselApi} opts={{ align: "start", loop: true, duration: 55 }} className="feature-carousel" aria-label="AIRI features"><CarouselContent className="feature-track">{features.map((feature, i) => <CarouselItem className="feature-slide" key={feature.name}><article className={"feature-card card-" + feature.kind}><div className="feature-copy"><p>{feature.name}</p><h3>{feature.title}</h3></div><div className="feature-image"><img src={"./assets/airi-" + feature.detail + "-closeup.webp"} alt={feature.name + " product detail"} loading="lazy" width="1672" height="941" /></div>{feature.kind === "recall" && <div className="recall-rings" aria-hidden="true"><i /><i /><i /></div>}{feature.kind === "brake" && <span className="feature-label"><LockKeyhole size={15} /> Secure support</span>}{feature.kind === "assist" && <span className="feature-label"><Footprints size={15} /> At your pace</span>}<button className="feature-plus" aria-label={"Learn about " + feature.name} onClick={() => setFeatureOpen(i)}><Plus size={20} /></button></article></CarouselItem>)}</CarouselContent></Carousel>
      <div className="carousel-toolbar content-width"><div className="carousel-dots" aria-label="Feature slides">{features.map((f, i) => <button key={f.name} aria-label={"Show " + f.name} aria-current={slide === i ? "true" : undefined} className={slide === i ? "active" : ""} onClick={() => carouselApi?.scrollTo(i)} />)}</div><div className="carousel-controls"><button aria-label="Previous highlight" onClick={() => carouselApi?.scrollPrev()}><ChevronLeft /></button><button aria-label="Next highlight" onClick={() => carouselApi?.scrollNext()}><ChevronRight /></button></div></div>
    </section>

    <section className="everyday content-width" aria-labelledby="everyday-title"><div className="everyday-copy reveal"><p className="eyebrow">YOUR EVERYDAY COMPANION</p><h2 id="everyday-title">More of the day.<br />More of you.</h2><p className="chapter-copy">Your home. Your habits. Your pace. AIRI fits into the life you already love.</p><p className="muted-copy">For people who can walk, and welcome a little extra support.</p><button className="text-link" onClick={() => setDemoOpen(true)}>Meet AIRI in person <Plus size={18} /></button></div><div className="everyday-image reveal"><img src="./assets/airi-lifestyle.webp" alt="An older woman walking with AIRI in a bright living room" loading="lazy" width="684" height="887" /><span>Your habits. Your home. Your pace.</span></div></section>

    <section className="closer-section content-width" aria-labelledby="closer-title"><div className="section-heading reveal"><h2 id="closer-title">Take a closer look.</h2><p className="small-note">Thoughtful support. Down to the details.</p></div><Tabs defaultValue="controls" className="detail-tabs"><TabsList className="detail-tab-list" aria-label="Product close-ups">{closeups.map(c => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}</TabsList>{closeups.map(c => <TabsContent value={c.id} key={c.id} className="detail-panel">{c.id === "controls" ? <ProductDetailFilm motionOn={ambientMotionOn} /> : <img src={"./assets/airi-" + c.id + "-closeup.webp"} alt={c.name + " close-up render of AIRI"} width="1672" height="941" loading="lazy" />}<span className="detail-caption">{c.caption}</span></TabsContent>)}</Tabs></section>

    <section className="action-section" id="action">
      <div className="scenario-section content-width" id="scenarios"><div className="section-heading reveal"><div><p className="eyebrow">LIFE, IN MOTION</p><h2>Whatever your<br /><span>day brings.</span></h2></div><span className="small-note">Five moments. One companion.</span></div><ScenarioJourney scenarios={scenarios} motionOn={ambientMotionOn} /></div>
      <div className="action-cta"><button className="button" onClick={() => setDemoOpen(true)}>Experience AIRI</button></div>
    </section>

    <section className="folding content-width" id="folding"><div className="chapter-heading reveal"><p className="eyebrow">READY FOR WHAT’S NEXT</p><h2>Less space.<br /><span>More possibility.</span></h2></div><FoldExperience motionOn={ambientMotionOn} /></section>

    <HowItWorks />

    <section className="details section-tint"><div className="content-width"><div className="section-heading reveal"><h2>Every move.<br />Thought through.</h2><p className="muted-copy">Simple on the outside.<br />Support that considers the whole day.</p></div><Accordion type="single" collapsible className="details-accordion">{questions.map(([q,a], i) => <AccordionItem value={"q" + i} key={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></div></section>

    <FallEvidence />

    <section className="about section-tint" id="about"><div className="content-width"><p className="eyebrow reveal">ABOUT AIRI</p><p className="about-name reveal">Assisted Intelligent Reactive Independence</p><h2 className="reveal">Independence should<br />feel like <span>everyday life.</span></h2><p className="chapter-copy reveal">AIRI starts with you. Familiar routines. New possibilities. Support that makes room for independence.</p><div className="values reveal"><div><span>01</span><h3>People first.</h3><p>Support built around everyday needs.</p></div><div><span>02</span><h3>Familiar routines.</h3><p>Make room for the life you already love.</p></div><div><span>03</span><h3>More possibility.</h3><p>A little help to keep moving forward.</p></div></div></div></section>

    <section className="demo-section" id="demo"><div className="content-width reveal"><p className="eyebrow">YOUR NEXT STEP</p><h2>Meet AIRI.<br />Feel the possibility.</h2><p>Meet our team, explore the walker, and discover how it could support you or someone you care for.</p><button className="button white-button" onClick={() => setDemoOpen(true)}>Book a Demo</button><button className="text-link light-link" onClick={() => setFilmOpen(true)}>Watch How It Works <Play size={17} fill="currentColor" /></button><span className="demo-fine">Experience the walker yourself.</span></div></section>

    <section className="contact-section content-width" id="contact"><div className="contact-copy reveal"><p className="eyebrow">CONTACT US</p><h2>Have a question?<br />We’re here.</h2><p className="muted-copy">Questions, ideas, partnerships. We’d love to hear from you.</p><a className="contact-email" href={"mailto:" + EMAIL}><Mail size={22} /><span>{EMAIL}</span></a><a className="text-link" href={"mailto:" + EMAIL}>Send an Email <Plus size={18} /></a></div><div className="enquiry-card reveal"><h3>Send an enquiry.</h3><RequestForm type="enquiry" /></div></section>

    <footer className="footer"><div className="content-width"><div className="footer-top"><a className="wordmark" href="#">AIRI</a><p>More life in every step.</p><a href="#meet">Back to top</a></div><p className="concept-note">AIRI is in development. AI-generated films show the intended experience. Features and performance are subject to prototype testing.</p><p className="research-note">Research: <a href="https://www.duke-nus.edu.sg/docs/librariesprovider3/research-policy-brief-docs/predictors-of-falls-among-older-singaporeans.pdf?sfvrsn=e8b838ae_0" target="_blank" rel="noreferrer">Chen et al.</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10995100/" target="_blank" rel="noreferrer">Nickerson et al.</a> · <a href="https://www.who.int/news-room/fact-sheets/detail/falls" target="_blank" rel="noreferrer">WHO: Falls</a></p><div className="footer-bottom"><span>© 2026 AIRI Project</span><span>Designed around everyday life.</span><button onClick={() => setMotionOn(!motionOn)}>{motionOn ? <Pause size={13} /> : <Play size={13} />} {motionOn ? "Pause motion" : "Enable motion"}</button></div></div></footer>

    <ScrollInvitation />

    <Dialog open={demoOpen} onOpenChange={setDemoOpen}><DialogContent className="demo-dialog"><div className="dialog-heading"><p className="eyebrow">MEET AIRI</p><DialogTitle>Experience it yourself.</DialogTitle><DialogDescription>Meet our team, explore the walker and discover what it could mean for your everyday.</DialogDescription></div><RequestForm type="demo" /></DialogContent></Dialog>
    <Dialog open={filmOpen} onOpenChange={setFilmOpen}><DialogContent className="film-dialog"><DialogTitle className="sr-only">Meet AIRI — product film</DialogTitle><DialogDescription className="sr-only">A studio reveal of AIRI, with wheel and motor animations, everyday user moments, and close-ups of its handles and finish.</DialogDescription><ProductFilm /></DialogContent></Dialog>
    <Dialog open={featureOpen !== null} onOpenChange={open => { if (!open) setFeatureOpen(null); }}><DialogContent className="feature-dialog">{featureOpen !== null && <><p className="eyebrow">{features[featureOpen].name}</p><DialogTitle>{features[featureOpen].title}</DialogTitle><div className="feature-dialog-image"><img src={"./assets/airi-" + features[featureOpen].detail + "-closeup.webp"} alt={features[featureOpen].name} width="684" height="887" /></div><DialogDescription>{features[featureOpen].copy}</DialogDescription><button className="text-link" onClick={() => { const target=featureOpen === 3 ? "stand" : featureOpen === 2 ? "balance" : featureOpen === 4 ? "travel" : "home"; setFeatureOpen(null); location.hash = "day-" + target; }}>See It in Action <Play size={16} /></button></>}</DialogContent></Dialog>
  </main>;
}

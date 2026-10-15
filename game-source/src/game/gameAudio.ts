/** Original procedural score and cues. Nothing starts before a start() gesture. */
export type GameCue = "lidar" | "brake" | "slip" | "motor" | "fold";
export type GameEnvironment = "street" | "home" | "off";

class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private output: WaveShaperNode | null = null;
  private enabled = false;
  private narrationGain: GainNode | null = null;
  private narration: AudioBufferSourceNode | null = null;
  private narrationId = 0;
  private narrationFetch: AbortController | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private noiseBuffers = new Map<"white" | "brown", AudioBuffer>();
  private effects = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private cueTimes = new Map<GameCue, number>();
  private environment: GameEnvironment = "off";
  private ambience: { sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private music: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private birdTimer: ReturnType<typeof setTimeout> | null = null;
  private pageSuspended = false;
  private gamePaused = false;

  async start(enabled = true) {
    this.enabled = enabled;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.output = this.context.createWaveShaper();
        const curve = new Float32Array(4097);
        for (let i = 0; i < curve.length; i++) curve[i] = .9 * Math.tanh((i / 2048 - 1) / .9);
        this.output.curve = curve; this.output.oversample = "2x";
        this.output.connect(this.context.destination);
        this.master = this.context.createGain();
        this.master.gain.value = enabled ? .52 : 0;
        this.master.connect(this.output);
        this.narrationGain = this.context.createGain();
        this.narrationGain.gain.value = enabled ? .7 : 0;
        this.narrationGain.connect(this.output);
      } catch {
        // Audio must never prevent the captioned game from opening.
        this.dispose();
        return;
      }
    }
    this.setEnabled(enabled);
    if (!this.pageSuspended && !this.gamePaused) await this.context.resume().catch(() => undefined);
    else await this.context.suspend().catch(() => undefined);
    this.updateEnvironment();
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    const c = this.context;
    if (c && this.master) this.master.gain.setTargetAtTime(value ? .52 : 0, c.currentTime, .08);
    if (c && this.narrationGain) this.narrationGain.gain.setTargetAtTime(value ? .7 : 0, c.currentTime, .03);
    if (!value) { this.stopEffects(); this.stopAmbience(); this.stopMusic(); this.clearBirdTimer(); }
    else this.updateEnvironment();
  }

  setEnvironment(value: GameEnvironment) {
    this.environment = value;
    if (value === "off") { this.stopEffects(); this.stopAmbience(); this.stopMusic(); this.clearBirdTimer(); }
    else this.updateEnvironment();
  }

  private canPlay() {
    return Boolean(this.enabled && this.context && this.master && !this.pageSuspended && !this.gamePaused);
  }

  private noise(kind: "white" | "brown") {
    const cached = this.noiseBuffers.get(kind);
    if (cached) return cached;
    const c = this.context!;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * 4), c.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x41a1, previous = 0;
    // A fixed seed makes these original procedural textures reproducible.
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = seed / 0x80000000 - 1;
      previous = (previous + .025 * white) / 1.025;
      data[i] = kind === "white" ? white : previous * 3.6;
    }
    // Smooth the loop boundary rather than clicking every four seconds.
    for (let i = 0; i < 128; i++) {
      const blend = (i + 1) / 128;
      data[data.length - 128 + i] = data[data.length - 128 + i] * (1 - blend) + data[0] * blend;
    }
    this.noiseBuffers.set(kind, buffer);
    return buffer;
  }

  private score() {
    if (this.musicBuffer) return this.musicBuffer;
    const c = this.context!, beat = 60 / 84, seconds = beat * 32;
    const buffer = c.createBuffer(2, Math.round(c.sampleRate * seconds), c.sampleRate);
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    // Original eight-bar phrase: G / Em / C / D, with a varied second answer.
    // Each voice has a finite envelope; tails wrap across the loop boundary.
    const note = (midi: number, start: number, beats: number, level: number, pan: number, bass = false) => {
      const hz = 440 * 2 ** ((midi - 69) / 12), duration = beats * beat;
      const first = Math.round(start * beat * c.sampleRate), count = Math.ceil(duration * c.sampleRate);
      const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
      for (let i = 0; i < count; i++) {
        const t = i / c.sampleRate, phase = 2 * Math.PI * hz * t;
        const attack = 1 - Math.exp(-t / (bass ? .04 : .009));
        const release = Math.min(1, (duration - t) / .045);
        const envelope = attack * Math.exp(-t / (duration * (bass ? .48 : .3))) * release;
        const wave = .8 * Math.sin(phase) + .16 * Math.sin(phase * 2) * Math.exp(-t * 3) + .04 * Math.sin(phase * 3) * Math.exp(-t * 5);
        const value = wave * envelope * level, index = (first + i) % left.length;
        left[index] += value * l; right[index] += value * r;
      }
    };
    const chords = [[55, 59, 62, 67], [55, 59, 64, 67], [55, 60, 64, 67], [54, 57, 62, 66]];
    const bassNotes = [43, 40, 36, 38];
    const melody = [
      [[.5, 74, .9], [2, 71, 1.3], [3.25, 69, .65]],
      [[.5, 67, 1.4], [2.5, 71, 1.1]],
      [[.5, 76, .8], [1.5, 74, .8], [2.5, 71, 1.2]],
      [[.5, 69, 1], [2, 74, 1.7]],
      [[.5, 71, .8], [1.5, 74, .8], [3, 71, .8]],
      [[.5, 67, 1.3], [2.5, 64, 1.1]],
      [[.5, 64, .7], [1.5, 67, .8], [2.5, 69, 1.1]],
      [[.5, 69, 1.4], [2.5, 66, 1.1]],
    ];
    for (let bar = 0; bar < 8; bar++) {
      const at = bar * 4, chord = chords[bar % 4];
      note(bassNotes[bar % 4], at, 3.8, .13, 0, true);
      for (let pulse = 0; pulse < 4; pulse++) note(chord[pulse], at + pulse, 1.7, pulse % 2 ? .1 : .125, -.28);
      for (const [offset, midi, length] of melody[bar]) note(midi, at + offset, length, .15, .22);
    }
    this.musicBuffer = buffer;
    return buffer;
  }

  private updateBedLevels() {
    const c = this.context;
    if (!c) return;
    const duck = this.narration ? .24 : 1;
    this.music?.gain.gain.setTargetAtTime((this.environment === "street" ? .32 : .23) * duck, c.currentTime, .18);
    this.ambience?.gain.gain.setTargetAtTime((this.environment === "street" ? .055 : .015) * duck, c.currentTime, .5);
  }

  private startMusic() {
    if (this.music || !this.canPlay() || this.environment === "off") return;
    const c = this.context!, source = c.createBufferSource(), gain = c.createGain();
    source.buffer = this.score(); source.loop = true;
    gain.gain.value = 0; source.connect(gain); gain.connect(this.master!);
    this.music = { source, gain }; source.start();
  }

  private stopMusic() {
    if (!this.music) return;
    try { this.music.source.stop(); } catch { /* Context may already be closed. */ }
    this.music.source.disconnect(); this.music.gain.disconnect(); this.music = null;
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    this.effects.set(source, nodes);
    source.onended = () => {
      for (const node of nodes) node.disconnect();
      this.effects.delete(source);
    };
  }

  private tone(hz: number, endHz: number, duration: number, level: number, delay = 0, type: OscillatorType = "sine") {
    if (!this.canPlay() || this.effects.size >= 16) return;
    const c = this.context!, at = c.currentTime + delay;
    const source = c.createOscillator(), gain = c.createGain();
    source.type = type;
    source.frequency.setValueAtTime(hz, at);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), at + duration * .8);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(Math.min(.22, level), at + Math.min(.035, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(gain); gain.connect(this.master!);
    this.track(source, [source, gain]);
    source.start(at); source.stop(at + duration + .03);
  }

  private scuff(kind: "white" | "brown", hz: number, endHz: number, duration: number, level: number, delay = 0, type: BiquadFilterType = "bandpass") {
    if (!this.canPlay() || this.effects.size >= 16) return;
    const c = this.context!, at = c.currentTime + delay;
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noise(kind);
    filter.type = type; filter.Q.value = .65;
    filter.frequency.setValueAtTime(hz, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, endHz), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(Math.min(.22, level), at + Math.min(.045, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master!);
    this.track(source, [source, filter, gain]);
    source.start(at); source.stop(at + duration + .03);
  }

  /** Auditory metaphors for the scripted features, never real sensor telemetry. */
  cue(kind: GameCue) {
    if (!this.canPlay()) return;
    const now = this.context!.currentTime;
    if (now - (this.cueTimes.get(kind) ?? -10) < (kind === "motor" ? .65 : .25)) return;
    this.cueTimes.set(kind, now);
    if (kind === "lidar") {
      this.tone(760, 1080, .15, .1);
      this.tone(980, 1380, .13, .075, .18);
    } else if (kind === "brake") {
      this.scuff("white", 1600, 380, .58, .2, 0, "lowpass");
      this.tone(155, 72, .48, .11, .025, "triangle");
    } else if (kind === "slip") {
      this.scuff("white", 2300, 750, .42, .18);
      this.tone(1420, 990, .19, .045, .035);
    } else if (kind === "motor") {
      this.tone(92, 155, .62, .13, 0, "triangle");
      this.scuff("brown", 280, 420, .55, .12, 0, "lowpass");
    } else if (kind === "fold") {
      this.tone(185, 105, .29, .1, 0, "triangle");
      this.scuff("white", 1500, 900, .07, .12, .31);
      this.tone(132, 80, .2, .065, .32, "triangle");
    }
  }

  chime(kind: "save" | "step" | "win" = "save") {
    const notes = kind === "win" ? [392, 493.88, 587.33, 783.99] : kind === "step" ? [330] : [440, 554.37, 659.25];
    for (const [i, hz] of notes.entries()) this.tone(hz, hz, .7, .18, i * .12);
  }

  private updateEnvironment() {
    if (!this.canPlay() || this.environment === "off") { this.clearBirdTimer(); return; }
    const c = this.context!;
    if (!this.ambience) {
      const bus = c.createGain(), wind = c.createBufferSource(), leaves = c.createBufferSource();
      const windFilter = c.createBiquadFilter(), leafFilter = c.createBiquadFilter();
      const windGain = c.createGain(), leafGain = c.createGain(), breeze = c.createOscillator(), breezeDepth = c.createGain();
      bus.gain.value = 0; bus.connect(this.master!);
      wind.buffer = this.noise("brown"); wind.loop = true;
      windFilter.type = "lowpass"; windFilter.frequency.value = 460; windFilter.Q.value = .5;
      windGain.gain.value = .18;
      wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(bus);
      leaves.buffer = this.noise("white"); leaves.loop = true;
      leafFilter.type = "bandpass"; leafFilter.frequency.value = 1450; leafFilter.Q.value = .5;
      leafGain.gain.value = .025;
      leaves.connect(leafFilter); leafFilter.connect(leafGain); leafGain.connect(bus);
      breeze.frequency.value = .085; breezeDepth.gain.value = .05;
      breeze.connect(breezeDepth); breezeDepth.connect(windGain.gain);
      this.ambience = { sources: [wind, leaves, breeze], nodes: [bus, wind, leaves, windFilter, leafFilter, windGain, leafGain, breeze, breezeDepth], gain: bus, filter: windFilter };
      wind.start(); leaves.start(); breeze.start();
    }
    this.startMusic();
    this.updateBedLevels();
    this.ambience.filter.frequency.setTargetAtTime(this.environment === "street" ? 460 : 190, c.currentTime, .8);
    if (this.environment === "street") this.scheduleBird();
    else this.clearBirdTimer();
  }

  private scheduleBird() {
    if (this.birdTimer || !this.canPlay() || this.environment !== "street") return;
    this.birdTimer = setTimeout(() => {
      this.birdTimer = null;
      if (!this.canPlay() || this.environment !== "street") return;
      // Two soft sine chirps, deliberately sparse rather than a busy soundtrack.
      this.tone(2080, 3060, .12, .01);
      this.tone(2780, 2190, .18, .007, .16);
      this.scheduleBird();
    }, 10_000 + Math.random() * 9_000);
  }

  private clearBirdTimer() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.birdTimer = null;
  }

  private stopEffects() {
    for (const [source, nodes] of this.effects) {
      source.onended = null;
      try { source.stop(); } catch { /* A completed source is already silent. */ }
      for (const node of nodes) node.disconnect();
    }
    this.effects.clear();
    this.cueTimes.clear();
  }

  private stopAmbience() {
    if (!this.ambience) return;
    for (const source of this.ambience.sources) {
      try { source.stop(); } catch { /* Context may already be closed. */ }
    }
    for (const node of this.ambience.nodes) node.disconnect();
    this.ambience = null;
  }

  async narrate(path: string) {
    this.stopNarration();
    const id = this.narrationId, c = this.context;
    if (!c || !this.narrationGain || !this.enabled) return;
    try {
      let buffer = this.buffers.get(path);
      if (!buffer) {
        const controller = new AbortController(); this.narrationFetch = controller;
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) return;
        buffer = await c.decodeAudioData(await response.arrayBuffer());
        if (id !== this.narrationId || c !== this.context) return;
        this.buffers.set(path, buffer);
      }
      if (id !== this.narrationId || c !== this.context || !this.narrationGain) return;
      const source = c.createBufferSource(); source.buffer = buffer; source.connect(this.narrationGain);
      source.onended = () => { source.disconnect(); if (this.narration === source) { this.narration = null; this.updateBedLevels(); } };
      this.narration = source; this.updateBedLevels(); source.start();
    } catch { /* Captions keep the game playable if audio is unavailable. */ }
    finally { if (id === this.narrationId) this.narrationFetch = null; }
  }

  stopNarration() {
    this.narrationId++;
    this.narrationFetch?.abort(); this.narrationFetch = null;
    if (this.narration) {
      this.narration.onended = null;
      try { this.narration.stop(); } catch { /* Already ended. */ }
      this.narration.disconnect(); this.narration = null;
    }
    this.updateBedLevels();
  }

  setPaused(value: boolean) { this.gamePaused = value; this.syncPlayback(); }

  private syncPlayback() {
    const c = this.context;
    if (!c) return;
    if (this.pageSuspended || this.gamePaused) {
      this.stopEffects(); this.clearBirdTimer();
      void c.suspend().catch(() => undefined);
    } else {
      void c.resume().catch(() => undefined);
      this.updateEnvironment();
    }
  }

  suspend() { this.pageSuspended = true; this.syncPlayback(); }
  resume() { this.pageSuspended = false; this.syncPlayback(); }

  dispose() {
    this.stopNarration(); this.clearBirdTimer(); this.stopEffects(); this.stopAmbience(); this.stopMusic();
    this.buffers.clear(); this.noiseBuffers.clear();
    this.musicBuffer = null;
    this.master?.disconnect(); this.narrationGain?.disconnect(); this.output?.disconnect();
    void this.context?.close().catch(() => undefined);
    this.context = null; this.master = null; this.narrationGain = null; this.output = null;
    this.enabled = false; this.environment = "off";
    this.pageSuspended = false; this.gamePaused = false;
  }
}

export const gameAudio = new GameAudio();

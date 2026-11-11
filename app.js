/**
 * Iridescent Bubble Sanctuary
 * Satisfying Soft-Body Thin-Film Soap Bubble Physics & Adaptive Pizzicato Web Audio
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PROCEDURAL WEB AUDIO SYNTHESIZER
  // =========================================================================

  class BubbleAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.masterGain = null;
      this.dangerLevel = 0; // 0.0 (calm) to 1.0 (extreme peril)
      this.isDisco = false;

      // Pizzicato sequencer state
      this.nextNoteTime = 0;
      this.seqStep = 0;
      this.tempo = 84; // BPM (speeds up with danger)
      this.baseTempo = 84;
      this.maxTempo = 220;
      this.isPlayingMusic = false;

      // Note frequencies (Hz)
      this.notes = {
        D2: 73.42, A2: 110.00, D3: 146.83, F3: 174.61, G3: 196.00, A3: 220.00,
        Bb3: 233.08, C4: 261.63, Csharp4: 277.18, D4: 293.66, Eb4: 311.13,
        E4: 329.63, F4: 349.23, Fsharp4: 369.99, G4: 392.00, Gsharp4: 415.30,
        A4: 440.00, Bb4: 466.16, B4: 493.88, C5: 523.25, Csharp5: 554.37,
        D5: 587.33, E5: 659.25, F5: 698.46, A5: 880.00
      };

      // Calm Chamber Melodic Patterns
      this.calmPattern = [
        'D3', 'A3', 'F4', 'A4', 'D4', 'F4', 'E4', 'C4',
        'D3', 'F3', 'A3', 'D4', 'F4', 'A4', 'G4', 'E4'
      ];

      // High Tension Peril Melodic Patterns (Chromatic & Dissonant Diminished)
      this.perilPattern = [
        'D4', 'Eb4', 'D4', 'Gsharp4', 'A4', 'Csharp5', 'D5', 'Eb4',
        'A4', 'Bb4', 'Csharp5', 'D5', 'F5', 'Eb4', 'Csharp4', 'A3'
      ];

      // Disco Soap Pattern
      this.discoPattern = [
        'D3', 'D4', 'A3', 'D4', 'F4', 'D4', 'G4', 'A4',
        'Bb3', 'Bb4', 'A3', 'A4', 'G3', 'G4', 'A3', 'Csharp5'
      ];

      // Wobble FM drone state
      this.wobbleOsc = null;
      this.wobbleGain = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Noise buffer for plucking transients & whoosh
      this.createNoiseBuffer();

      // Start background sequencer loop
      this.isPlayingMusic = true;
      this.nextNoteTime = this.ctx.currentTime + 0.1;

      // Start continuous wobble drone (very subtle)
      this.initWobbleDrone();
    }

    createNoiseBuffer() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    initWobbleDrone() {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);
        filter.Q.setValueAtTime(3, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        this.wobbleOsc = osc;
        this.wobbleGain = gain;
      } catch (e) {
        // Audio might be waiting for user gesture
      }
    }

    updateWobble(energy) {
      if (!this.ctx || !this.wobbleGain || this.isMuted) return;
      const targetGain = Math.min(0.18, energy * 0.025);
      const targetFreq = 50 + energy * 8;
      const now = this.ctx.currentTime;
      this.wobbleGain.gain.setTargetAtTime(targetGain, now, 0.08);
      if (this.wobbleOsc) {
        this.wobbleOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMute(muted) {
      this.isMuted = muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
      }
    }

    setDanger(level) {
      this.dangerLevel = Math.max(0, Math.min(1, level));
      // Adaptive tempo ramps dynamically from 84 to 210 BPM
      this.tempo = this.baseTempo + (this.maxTempo - this.baseTempo) * Math.pow(this.dangerLevel, 1.4);
    }

    setDisco(isDisco) {
      this.isDisco = isDisco;
    }

    // Synthesized plucked string using Karplus-Strong / fast enveloped hybrid synthesis
    playPluckedString(freq, velocity = 0.5, isDissonant = false) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // 1. Dual Oscillators for woody string body
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(freq, now);
      // Slight detune for natural wood resonance
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      // Lowpass filter envelope: pluck starts bright then decays rapidly
      filter.type = 'lowpass';
      const initialCutoff = isDissonant ? 5500 : 3800;
      filter.frequency.setValueAtTime(initialCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.2), now + 0.22);
      filter.Q.setValueAtTime(isDissonant ? 4.5 : 2.5, now);

      // Pluck amplitude envelope: 1.5ms attack, fast exponential decay
      const decayTime = isDissonant ? 0.25 : 0.45;
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(velocity * 0.45, now + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain);

      // 2. Micro noise pluck transient (finger contact noise)
      if (this.noiseBuffer) {
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();

        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(freq * 2.5, now);
        noiseFilter.Q.setValueAtTime(3.0, now);

        noiseGain.gain.setValueAtTime(velocity * 0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseSource.start(now);
        noiseSource.stop(now + 0.02);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + decayTime + 0.05);
      osc2.stop(now + decayTime + 0.05);
    }

    // Scheduler loop for adaptive chamber music
    updateMusic() {
      if (!this.ctx || !this.isPlayingMusic || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Lookahead scheduling (0.1s window)
      while (this.nextNoteTime < now + 0.1) {
        const secondsPerBeat = 60.0 / this.tempo;
        const noteDuration = secondsPerBeat * 0.5; // Eighth note arpeggios

        let pattern = this.calmPattern;
        if (this.isDisco) {
          pattern = this.discoPattern;
        } else if (this.dangerLevel > 0.45) {
          pattern = this.perilPattern;
        }

        const noteName = pattern[this.seqStep % pattern.length];
        const freq = this.notes[noteName] || 220;

        // Dynamics: louder and more punchy when danger is high
        const vel = 0.35 + this.dangerLevel * 0.45;
        const isDissonant = this.dangerLevel > 0.6;

        this.playPluckedString(freq, vel, isDissonant);

        // Every 4th step, add a subtle bass pluck for harmonic grounding
        if (this.seqStep % 4 === 0) {
          const bassFreq = this.isDisco ? (freq * 0.5) : (this.notes.D2 || 73.42);
          this.playPluckedString(bassFreq, vel * 0.8, false);
        }

        this.seqStep++;
        this.nextNoteTime += noteDuration;
      }
    }

    // Air puff whoosh (sweeping bandpass noise + sub thump)
    playAirPuff() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(950, now + 0.12);
        filter.frequency.exponentialRampToValueAtTime(220, now + 0.32);
        filter.Q.setValueAtTime(2.2, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.36);
      }

      // Sub-bass displacement pop
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(90, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      sub.connect(subGain);
      subGain.connect(this.masterGain);

      sub.start(now);
      sub.stop(now + 0.22);
    }

    // Bubble pop: dramatic rupture snap and droplet scatter sizzle
    playBubblePop() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // 1. High transient rupture snap
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'square';
      snapOsc.frequency.setValueAtTime(1400, now);
      snapOsc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

      snapGain.gain.setValueAtTime(0.7, now);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      snapOsc.connect(snapGain);
      snapGain.connect(this.masterGain);
      snapOsc.start(now);
      snapOsc.stop(now + 0.06);

      // 2. Sub air decompression pop
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(180, now);
      popOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      popGain.gain.setValueAtTime(0.65, now);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      popOsc.connect(popGain);
      popGain.connect(this.masterGain);
      popOsc.start(now);
      popOsc.stop(now + 0.16);

      // 3. Cascade of micro-droplets (shimmering splatter)
      if (this.noiseBuffer) {
        for (let i = 0; i < 8; i++) {
          const delay = 0.01 + i * 0.02 + Math.random() * 0.015;
          const dropSource = this.ctx.createBufferSource();
          dropSource.buffer = this.noiseBuffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(2800 + Math.random() * 2500, now + delay);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.setValueAtTime(0.18 - i * 0.015, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.06);

          dropSource.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          dropSource.start(now + delay);
          dropSource.stop(now + delay + 0.07);
        }
      }
    }

    // Zen mode elastic bounce chime
    playZenBounce() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Crystalline bell chord
      const freqs = [587.33, 880.00, 1174.66, 1760.00]; // D chord harmonics
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        const decay = 0.6 + idx * 0.2;
        gain.gain.setValueAtTime(0.2 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });
    }

    // Near miss adrenaline ping
    playNearMiss() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }


  // =========================================================================
  // 2. SOFT-BODY WOBBLY BUBBLE PHYSICS ENGINE
  // =========================================================================

  class SoftBubble {
    constructor(x, y, radius) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.baseRadius = radius;
      this.currentBaseRadius = radius;

      // Radial Control Vertices (Spring-damper harmonic mesh)
      this.vertexCount = 48;
      this.vertices = [];
      const angleStep = (Math.PI * 2) / this.vertexCount;
      for (let i = 0; i < this.vertexCount; i++) {
        this.vertices.push({
          angle: i * angleStep,
          radius: radius,
          targetRadius: radius,
          vr: 0 // Radial velocity
        });
      }

      // Rest volume (2D area approximation: pi * r^2)
      this.restArea = Math.PI * radius * radius;

      // Visual film interference phase
      this.swirlPhase = 0;
      this.sheenPhase = 0;
      this.popped = false;
      this.popProgress = 0; // 0 to 1 during pop animation

      // Physical parameters
      this.kSpring = 16.0;   // Spring restitution
      this.kTension = 22.0;  // Surface tension / neighbor smoothing
      this.damping = 2.4;    // Oscillation damping
      this.kPressure = 0.45; // Volume conservation restoration force
      this.gravity = 38.0;   // Gentle downward drift
      this.buoyancy = 34.0;  // Upward lift from warm trapped air
    }

    reset(x, y, radius) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = -30;
      this.baseRadius = radius;
      this.currentBaseRadius = radius;
      this.restArea = Math.PI * radius * radius;
      this.popped = false;
      this.popProgress = 0;

      for (let i = 0; i < this.vertexCount; i++) {
        this.vertices[i].radius = radius;
        this.vertices[i].targetRadius = radius;
        this.vertices[i].vr = (Math.random() - 0.5) * 20;
      }
    }

    // Apply an air impulse / shockwave force at a world coordinate (wx, wy)
    applyImpulse(wx, wy, power = 150) {
      const dx = this.x - wx;
      const dy = this.y - wy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Impart translational momentum
      const push = (power / Math.max(80, dist)) * 22;
      this.vx += Math.cos(angle) * push;
      this.vy += Math.sin(angle) * push - 25; // Extra upward lift

      // Deform soft-body vertices: compress near the impulse angle, expand orthogonally (quadrupole mode)
      for (let i = 0; i < this.vertexCount; i++) {
        const v = this.vertices[i];
        let diff = Math.abs(v.angle - angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;

        // Quadrupole deformation factor
        const deformForce = Math.cos(diff * 2) * (power * 0.4);
        v.vr += deformForce;
      }
    }

    // Apply continuous air stream / cursor wind velocity
    applyWind(wx, wy, wvx, wvy) {
      const dx = this.x - wx;
      const dy = this.y - wy;
      const dist = Math.hypot(dx, dy);
      const windSpeed = Math.hypot(wvx, wvy);
      if (windSpeed < 5) return;

      const maxDist = this.baseRadius * 2.4;
      if (dist < maxDist) {
        const factor = (1 - dist / maxDist) * 0.08;
        this.vx += wvx * factor;
        this.vy += wvy * factor;

        // Compress vertices facing the wind
        const windAngle = Math.atan2(wvy, wvx);
        for (let i = 0; i < this.vertexCount; i++) {
          const v = this.vertices[i];
          const dot = Math.cos(v.angle - windAngle);
          v.vr += dot * (windSpeed * factor * 0.6);
        }
      }
    }

    update(dt, canvasWidth, canvasHeight) {
      if (this.popped) {
        this.popProgress += dt * 3.5;
        return;
      }

      this.swirlPhase += dt * 0.85;
      this.sheenPhase += dt * 1.2;

      // 1. Center of mass motion
      const netGravity = this.gravity - this.buoyancy;
      this.vy += netGravity * dt;

      // Drag
      this.vx *= Math.pow(0.982, dt * 60);
      this.vy *= Math.pow(0.982, dt * 60);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Wall bounds & soft-squish bounce
      const minX = this.baseRadius * 0.85;
      const maxX = canvasWidth - this.baseRadius * 0.85;
      const minY = this.baseRadius * 0.85;
      const maxY = canvasHeight - this.baseRadius * 0.85;

      if (this.x < minX) {
        this.x = minX;
        this.vx = Math.abs(this.vx) * 0.65 + 15;
        this.squishAtAngle(Math.PI, 40);
      } else if (this.x > maxX) {
        this.x = maxX;
        this.vx = -Math.abs(this.vx) * 0.65 - 15;
        this.squishAtAngle(0, 40);
      }

      if (this.y < minY) {
        this.y = minY;
        this.vy = Math.abs(this.vy) * 0.65 + 10;
        this.squishAtAngle(-Math.PI / 2, 35);
      } else if (this.y > maxY) {
        this.y = maxY;
        this.vy = -Math.abs(this.vy) * 0.7 - 25; // Gentle bounce off floor
        this.squishAtAngle(Math.PI / 2, 50);
      }

      // 2. Vertex Area & Volume Preservation Calculation
      let currentArea = 0;
      const n = this.vertexCount;
      const dAngle = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const nextIdx = (i + 1) % n;
        currentArea += 0.5 * this.vertices[i].radius * this.vertices[nextIdx].radius * Math.sin(dAngle);
      }
      const areaDeficit = (this.restArea - currentArea) / this.restArea;

      // 3. Harmonic Spring & Surface Tension forces per vertex
      for (let i = 0; i < n; i++) {
        const prev = this.vertices[(i - 1 + n) % n];
        const curr = this.vertices[i];
        const next = this.vertices[(i + 1) % n];

        // Restitution force toward base radius
        const fRest = -this.kSpring * (curr.radius - curr.targetRadius);

        // Surface tension: pull toward neighbor average (smoothes wrinkles)
        const neighborAvg = (prev.radius + next.radius) * 0.5;
        const fTension = this.kTension * (neighborAvg - curr.radius);

        // Volume preservation pressure force
        const fPressure = areaDeficit * this.baseRadius * this.kPressure * 50;

        // Damping
        const fDamp = -this.damping * curr.vr;

        const totalForce = fRest + fTension + fPressure + fDamp;
        curr.vr += totalForce * dt;

        // Euler integrate radius
        curr.radius += curr.vr * dt;

        // Hard safety clamp to prevent inversion
        curr.radius = Math.max(this.baseRadius * 0.4, Math.min(this.baseRadius * 1.8, curr.radius));
      }
    }

    squishAtAngle(targetAngle, power = 30) {
      for (let i = 0; i < this.vertexCount; i++) {
        const v = this.vertices[i];
        let diff = Math.abs(v.angle - targetAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const factor = Math.cos(diff * 2);
        v.vr -= factor * power;
      }
    }

    // Get current total deformation kinetic energy for audio wobble modulation
    getWobbleEnergy() {
      let energy = 0;
      for (let i = 0; i < this.vertexCount; i++) {
        energy += Math.abs(this.vertices[i].vr);
      }
      return energy / this.vertexCount;
    }

    // Get world coordinates of vertex i
    getVertexPoint(i) {
      const v = this.vertices[i];
      return {
        x: this.x + Math.cos(v.angle) * v.radius,
        y: this.y + Math.sin(v.angle) * v.radius
      };
    }

    // Test distance from a sharp point (px, py) to the bubble contour
    testProximity(px, py) {
      const dx = px - this.x;
      const dy = py - this.y;
      const distToCenter = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Find local surface radius at this angle
      const n = this.vertexCount;
      const normalizedAngle = (angle < 0 ? angle + Math.PI * 2 : angle);
      const step = (Math.PI * 2) / n;
      const idx = Math.floor(normalizedAngle / step) % n;
      const nextIdx = (idx + 1) % n;
      const frac = (normalizedAngle - idx * step) / step;

      const localRadius = this.vertices[idx].radius * (1 - frac) + this.vertices[nextIdx].radius * frac;
      const surfaceDistance = distToCenter - localRadius;

      return {
        distToCenter,
        surfaceDistance,
        localRadius,
        angle
      };
    }
  }


  // =========================================================================
  // 3. HAZARDS SYSTEM (NEEDLES, CAT CLAWS, CEILING FANS)
  // =========================================================================

  class HazardManager {
    constructor() {
      this.hazards = [];
      this.spawnTimer = 0;
      this.nearMissThreshold = 35; // Pixels from bubble membrane
    }

    reset() {
      this.hazards = [];
      this.spawnTimer = 0;
    }

    update(dt, width, height, bubble, onNearMiss, onPop, isZen) {
      this.spawnTimer += dt;

      // Adaptive spawn rate
      const maxHazards = width < 700 ? 5 : 7;
      if (this.spawnTimer > 2.2 && this.hazards.length < maxHazards) {
        this.spawnTimer = 0;
        this.spawnRandomHazard(width, height);
      }

      let closestDistance = 9999;

      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const h = this.hazards[i];
        h.update(dt, width, height);

        // Remove off-screen hazards
        if (h.isOffScreen(width, height)) {
          this.hazards.splice(i, 1);
          continue;
        }

        // Test collision with bubble
        if (!bubble.popped) {
          const tips = h.getSharpPoints();
          for (let tip of tips) {
            const prox = bubble.testProximity(tip.x, tip.y);
            if (prox.surfaceDistance < closestDistance) {
              closestDistance = prox.surfaceDistance;
            }

            // Pop condition (sharp tip penetrates or touches the soap film)
            if (prox.surfaceDistance <= 0) {
              if (isZen) {
                // Zen mode bounce!
                bubble.applyImpulse(tip.x, tip.y, 160);
                h.deflect(bubble.x, bubble.y);
                if (onNearMiss) onNearMiss('bounce', tip.x, tip.y);
              } else {
                // Peril pop!
                bubble.popped = true;
                if (onPop) onPop(tip.x, tip.y);
                return closestDistance;
              }
            } else if (prox.surfaceDistance < this.nearMissThreshold && !h.nearMissTriggered) {
              h.nearMissTriggered = true;
              if (onNearMiss) onNearMiss('near_miss', tip.x, tip.y);
            }
          }
        }
      }

      return closestDistance;
    }

    spawnRandomHazard(width, height) {
      const types = ['needle', 'cat_paw', 'ceiling_fan'];
      const chosen = types[Math.floor(Math.random() * types.length)];

      if (chosen === 'needle') {
        this.hazards.push(new FloatingNeedle(width, height));
      } else if (chosen === 'cat_paw') {
        this.hazards.push(new CatPawHazard(width, height));
      } else {
        // Ceiling fans drift across top airspace
        this.hazards.push(new CeilingFanHazard(width, height));
      }
    }

    render(ctx) {
      for (const h of this.hazards) {
        h.render(ctx);
      }
    }
  }

  // Hazard 1: Floating Glistening Needle
  class FloatingNeedle {
    constructor(width, height) {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      this.length = 56 + Math.random() * 20;
      this.x = side === 'left' ? -this.length : width + this.length;
      this.y = 80 + Math.random() * (height - 180);
      const targetX = width * 0.5 + (Math.random() - 0.5) * (width * 0.4);
      const targetY = height * 0.5 + (Math.random() - 0.5) * (height * 0.4);
      const angle = Math.atan2(targetY - this.y, targetX - this.x);

      const speed = 35 + Math.random() * 30;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      this.rot = angle;
      this.rotSpeed = (Math.random() - 0.5) * 0.4;
      this.glintPhase = Math.random() * Math.PI * 2;
      this.nearMissTriggered = false;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.rotSpeed * dt;
      this.glintPhase += dt * 3.5;
    }

    isOffScreen(width, height) {
      return (this.x < -120 || this.x > width + 120 || this.y < -120 || this.y > height + 120);
    }

    getSharpPoints() {
      // Tip of needle is at +length/2 along rot
      return [{
        x: this.x + Math.cos(this.rot) * (this.length * 0.5),
        y: this.y + Math.sin(this.rot) * (this.length * 0.5)
      }];
    }

    deflect(bx, by) {
      const angle = Math.atan2(this.y - by, this.x - bx);
      this.vx = Math.cos(angle) * 70;
      this.vy = Math.sin(angle) * 70;
      this.rotSpeed *= -1.5;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);

      const halfL = this.length * 0.5;

      // Needle Shaft gradient (polished chrome)
      const grad = ctx.createLinearGradient(0, -2, 0, 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#d0d7e5');
      grad.addColorStop(0.7, '#8892a4');
      grad.addColorStop(1, '#4f5869');

      ctx.beginPath();
      // Back eyelet end
      ctx.arc(-halfL + 5, 0, 3, Math.PI / 2, -Math.PI / 2);
      // Taper down to razor sharp tip at +halfL
      ctx.lineTo(halfL, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Needle eye hole
      ctx.beginPath();
      ctx.ellipse(-halfL + 5, 0, 2.5, 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0d1a';
      ctx.fill();

      // Glint star on tip
      const tipGlint = Math.sin(this.glintPhase);
      if (tipGlint > 0.4) {
        const starSize = (tipGlint - 0.4) * 8;
        ctx.save();
        ctx.translate(halfL, 0);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, starSize * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // 4-point sparkle cross
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-starSize, 0);
        ctx.lineTo(starSize, 0);
        ctx.moveTo(0, -starSize);
        ctx.lineTo(0, starSize);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // Hazard 2: Cat Paw Hazard with Curved Sharp Claws
  class CatPawHazard {
    constructor(width, height) {
      this.side = Math.random() < 0.5 ? 'left' : 'right';
      this.edgeY = 120 + Math.random() * (height - 240);
      this.reachDist = 130 + Math.random() * 80;
      this.time = 0;
      this.duration = 7.5; // Reach in, pause, retract
      this.width = width;
      this.height = height;
      this.nearMissTriggered = false;
      this.deflected = false;

      // Fur palette (Calico / Tuxedo / Cream)
      const furTypes = ['#f4a261', '#e76f51', '#264653', '#fdf0d5'];
      this.furColor = furTypes[Math.floor(Math.random() * furTypes.length)];
    }

    update(dt) {
      this.time += dt;
    }

    isOffScreen() {
      return this.time > this.duration;
    }

    getExtFraction() {
      if (this.deflected) return 0;
      const t = this.time / this.duration;
      // Smooth in, linger, smooth out
      if (t < 0.35) {
        return Math.sin((t / 0.35) * (Math.PI / 2));
      } else if (t < 0.65) {
        return 1.0 + Math.sin((t - 0.35) * 8) * 0.05; // Playful twitch
      } else {
        return Math.cos(((t - 0.65) / 0.35) * (Math.PI / 2));
      }
    }

    getSharpPoints() {
      const ext = this.getExtFraction();
      const currentReach = this.reachDist * ext;
      const pawX = this.side === 'left' ? currentReach : this.width - currentReach;
      const pawY = this.edgeY;

      // 3 extended claws
      const sign = this.side === 'left' ? 1 : -1;
      return [
        { x: pawX + sign * 24, y: pawY - 12 },
        { x: pawX + sign * 28, y: pawY },
        { x: pawX + sign * 24, y: pawY + 12 }
      ];
    }

    deflect() {
      this.deflected = true;
      this.time = this.duration - 0.5; // Quickly pull away
    }

    render(ctx) {
      const ext = this.getExtFraction();
      if (ext <= 0.01) return;

      const currentReach = this.reachDist * ext;
      const startX = this.side === 'left' ? -30 : this.width + 30;
      const pawX = this.side === 'left' ? currentReach : this.width - currentReach;
      const pawY = this.edgeY;
      const sign = this.side === 'left' ? 1 : -1;

      ctx.save();

      // Draw Furry Arm
      ctx.beginPath();
      ctx.moveTo(startX, pawY - 28);
      ctx.quadraticCurveTo((startX + pawX) * 0.5, pawY - 20, pawX - sign * 15, pawY - 22);
      // Paw Pad curve
      ctx.quadraticCurveTo(pawX + sign * 18, pawY - 20, pawX + sign * 18, pawY);
      ctx.quadraticCurveTo(pawX + sign * 18, pawY + 20, pawX - sign * 15, pawY + 22);
      ctx.quadraticCurveTo((startX + pawX) * 0.5, pawY + 20, startX, pawY + 28);
      ctx.closePath();

      ctx.fillStyle = this.furColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Soft Pink Paw Pads (Toe Beans)
      const beanColor = '#ffb3c6';
      ctx.fillStyle = beanColor;

      // Main central pad
      ctx.beginPath();
      ctx.ellipse(pawX - sign * 4, pawY, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3 Small toe pads
      ctx.beginPath();
      ctx.arc(pawX + sign * 6, pawY - 12, 4.5, 0, Math.PI * 2);
      ctx.arc(pawX + sign * 10, pawY, 5, 0, Math.PI * 2);
      ctx.arc(pawX + sign * 6, pawY + 12, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 3 Sharp Curved White Claws!
      ctx.fillStyle = '#fffdfa';
      ctx.strokeStyle = '#dcd4c8';
      ctx.lineWidth = 1;

      const clawAngles = [-12, 0, 12];
      for (const offset of clawAngles) {
        const clawBaseX = pawX + sign * (offset === 0 ? 12 : 8);
        const clawBaseY = pawY + offset;
        const clawTipX = clawBaseX + sign * 15;
        const clawTipY = clawBaseY + (offset < 0 ? -4 : (offset > 0 ? 4 : 0));

        ctx.beginPath();
        ctx.moveTo(clawBaseX, clawBaseY - 2.5);
        ctx.quadraticCurveTo(clawBaseX + sign * 10, clawBaseY - 1.5, clawTipX, clawTipY);
        ctx.quadraticCurveTo(clawBaseX + sign * 6, clawBaseY + 2.5, clawBaseX, clawBaseY + 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // Hazard 3: Ceiling Fan Hazard with Rotating Blades
  class CeilingFanHazard {
    constructor(width) {
      this.width = width;
      this.x = Math.random() < 0.5 ? -100 : width + 100;
      this.y = 70 + Math.random() * 85;
      this.vx = (this.x < 0 ? 1 : -1) * (25 + Math.random() * 20);
      this.bladeRadius = 70 + Math.random() * 25;
      this.bladeCount = 4;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = 1.8 + Math.random() * 1.2;
      this.nearMissTriggered = false;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.rot += this.rotSpeed * dt;
    }

    isOffScreen(width) {
      return (this.vx > 0 && this.x > width + 140) || (this.vx < 0 && this.x < -140);
    }

    getSharpPoints() {
      const tips = [];
      for (let i = 0; i < this.bladeCount; i++) {
        const a = this.rot + (i * Math.PI * 2) / this.bladeCount;
        tips.push({
          x: this.x + Math.cos(a) * this.bladeRadius,
          y: this.y + Math.sin(a) * this.bladeRadius
        });
      }
      return tips;
    }

    deflect() {
      this.vx *= -1.2;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Downrod from ceiling
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -this.y);
      ctx.lineTo(0, 0);
      ctx.stroke();

      // Center Brass Hub
      ctx.fillStyle = '#b5838d';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Fan Blades
      for (let i = 0; i < this.bladeCount; i++) {
        const a = this.rot + (i * Math.PI * 2) / this.bladeCount;
        ctx.save();
        ctx.rotate(a);

        // Blade shape
        ctx.beginPath();
        ctx.moveTo(10, -6);
        ctx.lineTo(this.bladeRadius - 10, -12);
        ctx.quadraticCurveTo(this.bladeRadius + 4, 0, this.bladeRadius - 10, 12);
        ctx.lineTo(10, 6);
        ctx.closePath();

        // Dark mahogany wood blade
        const grad = ctx.createLinearGradient(0, 0, this.bladeRadius, 0);
        grad.addColorStop(0, '#4a2810');
        grad.addColorStop(0.7, '#6b3e23');
        grad.addColorStop(1, '#8c502a');

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Brass blade mount bracket
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(8, -4, 12, 8);

        ctx.restore();
      }

      // Center cap
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }


  // =========================================================================
  // 4. PARTICLES, WIND TRAILS, SHOCKWAVES & BABY BUBBLES
  // =========================================================================

  class ParticleSystem {
    constructor() {
      this.windParticles = [];
      this.shockwaves = [];
      this.droplets = [];
      this.babyBubbles = [];
      this.ambientDust = [];
      this.maxAmbient = 40;
    }

    initAmbient(width, height) {
      this.ambientDust = [];
      for (let i = 0; i < this.maxAmbient; i++) {
        this.ambientDust.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 12,
          vy: -8 - Math.random() * 14,
          radius: 1 + Math.random() * 2.2,
          alpha: 0.15 + Math.random() * 0.35,
          colorHue: Math.random() * 360
        });
      }
    }

    addWindTrail(x, y, vx, vy) {
      const speed = Math.hypot(vx, vy);
      if (speed < 12) return;
      this.windParticles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: vx * 0.2 + (Math.random() - 0.5) * 15,
        vy: vy * 0.2 + (Math.random() - 0.5) * 15,
        radius: 2 + Math.random() * 3.5,
        life: 1.0,
        decay: 2.2 + Math.random() * 1.5,
        hue: (performance.now() * 0.05) % 360
      });
    }

    addShockwave(x, y, radius = 20) {
      this.shockwaves.push({
        x,
        y,
        radius,
        maxRadius: 180 + Math.random() * 60,
        life: 1.0,
        decay: 1.8
      });
    }

    addPopExplosion(x, y, radius) {
      const count = 75;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 260;
        this.droplets.push({
          x: x + Math.cos(angle) * (radius * (0.8 + Math.random() * 0.4)),
          y: y + Math.sin(angle) * (radius * (0.8 + Math.random() * 0.4)),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          radius: 1.5 + Math.random() * 3.5,
          life: 1.0,
          decay: 0.9 + Math.random() * 0.8,
          gravity: 120 + Math.random() * 80,
          hue: (Math.random() * 360)
        });
      }
    }

    spawnBabyBubbles(motherX, motherY, count = 5) {
      for (let i = 0; i < count; i++) {
        const orbitAngle = (i * Math.PI * 2) / count;
        this.babyBubbles.push({
          orbitAngle,
          orbitDist: 140 + Math.random() * 60,
          orbitSpeed: 0.8 + Math.random() * 0.6,
          radius: 14 + Math.random() * 8,
          wobblePhase: Math.random() * Math.PI * 2,
          x: motherX,
          y: motherY
        });
      }
    }

    update(dt, width, height, bubble) {
      // 1. Ambient Sanctuary Dust Motes
      for (const d of this.ambientDust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y < -10) d.y = height + 10;
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;
      }

      // 2. Wind Particles
      for (let i = this.windParticles.length - 1; i >= 0; i--) {
        const p = this.windParticles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          this.windParticles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // 3. Shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const s = this.shockwaves[i];
        s.life -= s.decay * dt;
        s.radius += (s.maxRadius - s.radius) * (dt * 7);
        if (s.life <= 0) {
          this.shockwaves.splice(i, 1);
        }
      }

      // 4. Pop Droplets
      for (let i = this.droplets.length - 1; i >= 0; i--) {
        const d = this.droplets[i];
        d.life -= d.decay * dt;
        if (d.life <= 0) {
          this.droplets.splice(i, 1);
          continue;
        }
        d.vy += d.gravity * dt;
        d.vx *= 0.98;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }

      // 5. Baby Bubbles Orbiting Mother
      for (const b of this.babyBubbles) {
        b.orbitAngle += b.orbitSpeed * dt;
        b.wobblePhase += dt * 3.5;
        const targetX = bubble.x + Math.cos(b.orbitAngle) * b.orbitDist;
        const targetY = bubble.y + Math.sin(b.orbitAngle) * (b.orbitDist * 0.55); // Elliptical 3D tilt
        b.x += (targetX - b.x) * (dt * 4);
        b.y += (targetY - b.y) * (dt * 4);
      }
    }

    render(ctx) {
      // 1. Ambient Dust Motes
      for (const d of this.ambientDust) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.colorHue}, 80%, 75%, ${d.alpha})`;
        ctx.fill();
      }

      // 2. Wind Trail Particles
      for (const p of this.windParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.life * 0.45})`;
        ctx.fill();
      }

      // 3. Shockwave Rings
      for (const s of this.shockwaves) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(112, 214, 255, ${s.life * 0.6})`;
        ctx.lineWidth = 3.5 * s.life;
        ctx.stroke();

        // Inner secondary ripple
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 112, 166, ${s.life * 0.35})`;
        ctx.lineWidth = 2 * s.life;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Pop Droplets
      for (const d of this.droplets) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue}, 95%, 70%, ${d.life * 0.8})`;
        ctx.shadowColor = `hsla(${d.hue}, 95%, 70%, 0.8)`;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Baby Bubbles
      for (const b of this.babyBubbles) {
        ctx.save();
        ctx.translate(b.x, b.y);

        // Thin-film iridescent body
        const grad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, 0, 0, 0, b.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(0.5, 'rgba(112, 214, 255, 0.25)');
        grad.addColorStop(0.85, 'rgba(255, 112, 166, 0.45)');
        grad.addColorStop(1, 'rgba(128, 255, 219, 0.6)');

        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();

        // Specular glint
        ctx.beginPath();
        ctx.ellipse(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.35, b.radius * 0.18, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }
    }
  }


  // =========================================================================
  // 5. MAIN SANCTUARY APPLICATION CONTROLLER
  // =========================================================================

  class BubbleSanctuaryApp {
    constructor() {
      // DOM Elements
      this.canvas = document.getElementById('sanctuary-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.vignette = document.getElementById('danger-vignette');

      this.timerDisplay = document.getElementById('timer-display');
      this.bestDisplay = document.getElementById('best-display');
      this.nearMissDisplay = document.getElementById('near-miss-display');
      this.dangerLabel = document.getElementById('danger-label');
      this.dangerIndicator = document.getElementById('danger-indicator');
      this.tensionPercent = document.getElementById('tension-percent');
      this.tensionFill = document.getElementById('tension-fill');

      this.zenToggleBtn = document.getElementById('zen-toggle-btn');
      this.modeIcon = document.getElementById('mode-icon');
      this.modeText = document.getElementById('mode-text');

      this.audioToggleBtn = document.getElementById('audio-toggle-btn');
      this.audioIcon = document.getElementById('audio-icon');

      this.babyBubbleBtn = document.getElementById('baby-bubble-btn');
      this.discoBtn = document.getElementById('disco-btn');
      this.helpBtn = document.getElementById('help-btn');
      this.helpModal = document.getElementById('help-modal');
      this.helpCloseBtn = document.getElementById('help-close-btn');
      this.helpDoneBtn = document.getElementById('help-done-btn');

      this.puffFanBtn = document.getElementById('puff-fan-btn');

      this.popModal = document.getElementById('pop-modal');
      this.reinflateBtn = document.getElementById('reinflate-btn');
      this.switchZenBtn = document.getElementById('switch-zen-btn');
      this.modalTime = document.getElementById('modal-time');
      this.modalBest = document.getElementById('modal-best');
      this.modalMisses = document.getElementById('modal-misses');
      this.modalPuffs = document.getElementById('modal-puffs');

      // State
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);

      this.isZen = false;
      this.isDisco = false;
      this.survivalTime = 0;
      this.bestTime = parseFloat(localStorage.getItem('bubble_sanctuary_best') || '0');
      this.nearMissCount = 0;
      this.puffsCount = 0;
      this.dangerScore = 0; // 0 to 1

      // Cursor & Input tracking
      this.mouseX = this.width * 0.5;
      this.mouseY = this.height * 0.5;
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseVx = 0;
      this.mouseVy = 0;
      this.lastInputTime = performance.now();

      // Subsystems
      this.audio = new BubbleAudioEngine();
      this.bubble = new SoftBubble(this.width * 0.5, this.height * 0.6, this.calculateBubbleRadius());
      this.hazards = new HazardManager();
      this.particles = new ParticleSystem();

      this.lastFrameTime = performance.now();
      this.nearMissNotifications = []; // Floating text tags

      this.init();
    }

    calculateBubbleRadius() {
      return Math.max(90, Math.min(145, Math.min(this.width, this.height) * 0.17));
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.particles.initAmbient(this.width, this.height);
      this.updateBestDisplay();

      this.bindEvents();
      requestAnimationFrame((t) => this.renderLoop(t));
    }

    resizeCanvas() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);

      if (this.bubble) {
        this.bubble.baseRadius = this.calculateBubbleRadius();
        this.bubble.restArea = Math.PI * this.bubble.baseRadius * this.bubble.baseRadius;
        for (const v of this.bubble.vertices) {
          v.targetRadius = this.bubble.baseRadius;
        }
      }
    }

    bindEvents() {
      // Audio activation on first interaction
      const enableAudio = () => {
        this.audio.init();
        this.audio.resume();
        window.removeEventListener('pointerdown', enableAudio);
        window.removeEventListener('keydown', enableAudio);
      };
      window.addEventListener('pointerdown', enableAudio, { once: true });
      window.addEventListener('keydown', enableAudio, { once: true });

      // Pointer Air Currents
      const onPointerMove = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || this.mouseX;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || this.mouseY;

        const now = performance.now();
        const dt = Math.max(0.008, (now - this.lastInputTime) / 1000);
        this.lastInputTime = now;

        this.mouseVx = (clientX - this.mouseX) / dt;
        this.mouseVy = (clientY - this.mouseY) / dt;

        this.mouseX = clientX;
        this.mouseY = clientY;

        // Apply wind trail particles and airflow deformation
        this.particles.addWindTrail(clientX, clientY, this.mouseVx, this.mouseVy);
        this.bubble.applyWind(clientX, clientY, this.mouseVx, this.mouseVy);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      // Click / Tap = Air Puff
      this.canvas.addEventListener('pointerdown', (e) => {
        this.triggerPuff(e.clientX, e.clientY);
      });

      // Fan Puff Button
      this.puffFanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerPuff(this.bubble.x, this.bubble.y + this.bubble.baseRadius * 0.9);
      });

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          if (this.bubble.popped) {
            this.reinflateBubble();
          } else {
            this.triggerPuff(this.bubble.x, this.bubble.y + this.bubble.baseRadius * 0.9);
          }
        } else if (e.code === 'KeyZ') {
          this.toggleZenMode();
        } else if (e.code === 'KeyM') {
          this.toggleAudio();
        } else if (e.code === 'KeyB') {
          this.spawnBabyBubbles();
        } else if (e.code === 'KeyD') {
          this.toggleDisco();
        } else if (e.code === 'KeyH') {
          this.toggleHelp(true);
        } else if (e.code === 'Escape') {
          this.toggleHelp(false);
          this.popModal.classList.add('hidden');
        }
      });

      // Zen Toggle Button
      this.zenToggleBtn.addEventListener('click', () => this.toggleZenMode());

      // Audio Toggle Button
      this.audioToggleBtn.addEventListener('click', () => this.toggleAudio());

      // Baby Bubbles Button
      this.babyBubbleBtn.addEventListener('click', () => this.spawnBabyBubbles());

      // Disco Button
      this.discoBtn.addEventListener('click', () => this.toggleDisco());

      // Help Modal
      this.helpBtn.addEventListener('click', () => this.toggleHelp(true));
      this.helpCloseBtn.addEventListener('click', () => this.toggleHelp(false));
      this.helpDoneBtn.addEventListener('click', () => this.toggleHelp(false));

      // Reinflate Buttons
      this.reinflateBtn.addEventListener('click', () => this.reinflateBubble());
      this.switchZenBtn.addEventListener('click', () => {
        this.toggleZenMode(true);
        this.reinflateBubble();
      });
    }

    triggerPuff(wx, wy) {
      if (this.bubble.popped) return;
      this.puffsCount++;
      this.bubble.applyImpulse(wx, wy, 240);
      this.particles.addShockwave(wx, wy);
      this.audio.playAirPuff();

      // Visual button feedback
      this.puffFanBtn.style.transform = 'scale(0.92)';
      setTimeout(() => {
        this.puffFanBtn.style.transform = '';
      }, 120);
    }

    toggleZenMode(forceZen = null) {
      this.isZen = forceZen !== null ? forceZen : !this.isZen;
      if (this.isZen) {
        this.modeIcon.textContent = '🌿';
        this.modeText.textContent = 'Zen Sanctuary';
        this.zenToggleBtn.classList.add('zen');
      } else {
        this.modeIcon.textContent = '💥';
        this.modeText.textContent = 'Peril Mode';
        this.zenToggleBtn.classList.remove('zen');
      }
    }

    toggleAudio() {
      this.audio.init();
      this.audio.resume();
      const muted = !this.audio.isMuted;
      this.audio.setMute(muted);
      this.audioIcon.textContent = muted ? '🔇' : '🔊';
      const textSpan = this.audioToggleBtn.querySelector('.btn-text');
      if (textSpan) textSpan.textContent = muted ? 'Audio OFF' : 'Audio ON';
    }

    spawnBabyBubbles() {
      this.particles.spawnBabyBubbles(this.bubble.x, this.bubble.y, 4);
      this.babyBubbleBtn.classList.add('active');
      setTimeout(() => this.babyBubbleBtn.classList.remove('active'), 500);
      this.audio.playZenBounce();
    }

    toggleDisco() {
      this.isDisco = !this.isDisco;
      this.audio.setDisco(this.isDisco);
      this.discoBtn.classList.toggle('active', this.isDisco);
    }

    toggleHelp(show) {
      if (show) {
        this.helpModal.classList.remove('hidden');
      } else {
        this.helpModal.classList.add('hidden');
      }
    }

    handleNearMiss(type, px, py) {
      if (type === 'bounce') {
        this.audio.playZenBounce();
        this.nearMissNotifications.push({
          text: '🌿 ZEN DEFLECTION!',
          x: px,
          y: py - 20,
          life: 1.0,
          color: '#10b981'
        });
      } else {
        this.nearMissCount++;
        this.nearMissDisplay.textContent = this.nearMissCount;
        this.audio.playNearMiss();
        this.nearMissNotifications.push({
          text: '+1 NEAR MISS! ⚡',
          x: px,
          y: py - 20,
          life: 1.0,
          color: '#ffd166'
        });
      }
    }

    handlePop(popX, popY) {
      this.audio.playBubblePop();
      this.particles.addPopExplosion(popX, popY, this.bubble.baseRadius);

      // Check record
      if (this.survivalTime > this.bestTime) {
        this.bestTime = this.survivalTime;
        localStorage.setItem('bubble_sanctuary_best', this.bestTime.toFixed(1));
        this.updateBestDisplay();
      }

      // Populate pop modal
      this.modalTime.textContent = this.formatTime(this.survivalTime);
      this.modalBest.textContent = this.formatTime(this.bestTime);
      this.modalMisses.textContent = this.nearMissCount;
      this.modalPuffs.textContent = this.puffsCount;

      setTimeout(() => {
        this.popModal.classList.remove('hidden');
      }, 700);
    }

    reinflateBubble() {
      this.popModal.classList.add('hidden');
      this.bubble.reset(this.width * 0.5, this.height * 0.6, this.calculateBubbleRadius());
      this.survivalTime = 0;
      this.nearMissCount = 0;
      this.puffsCount = 0;
      this.nearMissDisplay.textContent = '0';
      this.hazards.reset();
      this.particles.spawnBabyBubbles(this.bubble.x, this.bubble.y, 2);
      this.audio.playAirPuff();
    }

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(1);
      return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    updateBestDisplay() {
      this.bestDisplay.textContent = this.formatTime(this.bestTime);
    }

    // =======================================================================
    // 6. THIN-FILM IRIDESCENT RENDERING PIPELINE
    // =======================================================================

    renderBubble(ctx) {
      if (this.bubble.popped) return;

      ctx.save();

      const n = this.bubble.vertexCount;
      const pts = [];
      for (let i = 0; i < n; i++) {
        pts.push(this.bubble.getVertexPoint(i));
      }

      // Build smooth closed spline through all vertices
      ctx.beginPath();
      ctx.moveTo((pts[0].x + pts[n - 1].x) * 0.5, (pts[0].y + pts[n - 1].y) * 0.5);
      for (let i = 0; i < n; i++) {
        const next = pts[(i + 1) % n];
        const midX = (pts[i].x + next.x) * 0.5;
        const midY = (pts[i].y + next.y) * 0.5;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      ctx.closePath();

      // Clip inside the bubble for realistic internal refraction and interference
      ctx.save();
      ctx.clip();

      // Pass 1: Translucent body tint
      const baseGrad = ctx.createRadialGradient(
        this.bubble.x - this.bubble.baseRadius * 0.25,
        this.bubble.y - this.bubble.baseRadius * 0.25,
        10,
        this.bubble.x,
        this.bubble.y,
        this.bubble.baseRadius * 1.3
      );
      baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      baseGrad.addColorStop(0.5, 'rgba(112, 214, 255, 0.12)');
      baseGrad.addColorStop(0.85, 'rgba(199, 125, 255, 0.22)');
      baseGrad.addColorStop(1, 'rgba(255, 153, 200, 0.35)');

      ctx.fillStyle = baseGrad;
      ctx.fill();

      // Pass 2: Thin-film interference swirl gradient (Marangoni effect)
      const swirlAngle = this.bubble.swirlPhase;
      const gradX1 = this.bubble.x + Math.cos(swirlAngle) * this.bubble.baseRadius;
      const gradY1 = this.bubble.y + Math.sin(swirlAngle) * this.bubble.baseRadius;
      const gradX2 = this.bubble.x - Math.cos(swirlAngle) * this.bubble.baseRadius;
      const gradY2 = this.bubble.y - Math.sin(swirlAngle) * this.bubble.baseRadius;

      const iridGrad = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
      if (this.isDisco) {
        iridGrad.addColorStop(0.0, 'rgba(255, 0, 128, 0.5)');
        iridGrad.addColorStop(0.2, 'rgba(255, 230, 0, 0.55)');
        iridGrad.addColorStop(0.4, 'rgba(0, 255, 170, 0.5)');
        iridGrad.addColorStop(0.6, 'rgba(0, 200, 255, 0.55)');
        iridGrad.addColorStop(0.8, 'rgba(160, 0, 255, 0.5)');
        iridGrad.addColorStop(1.0, 'rgba(255, 0, 128, 0.5)');
      } else {
        iridGrad.addColorStop(0.0, 'rgba(255, 112, 166, 0.35)');
        iridGrad.addColorStop(0.25, 'rgba(255, 209, 102, 0.28)');
        iridGrad.addColorStop(0.5, 'rgba(6, 214, 160, 0.35)');
        iridGrad.addColorStop(0.75, 'rgba(17, 138, 178, 0.38)');
        iridGrad.addColorStop(1.0, 'rgba(157, 78, 221, 0.35)');
      }

      ctx.fillStyle = iridGrad;
      ctx.fill();

      // Pass 3: Dynamic swirling soap film contour bands
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      for (let s = 1; s <= 3; s++) {
        const offsetR = this.bubble.baseRadius * (0.3 + s * 0.2);
        const ringAngle = this.bubble.swirlPhase * (s % 2 === 0 ? 1 : -1) * 0.8;
        ctx.beginPath();
        ctx.arc(
          this.bubble.x + Math.cos(ringAngle) * 12,
          this.bubble.y + Math.sin(ringAngle) * 12,
          offsetR,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      ctx.restore(); // Exit clip

      // Pass 4: Fresnel Rim Diffraction (Shimmering outer rainbow edge)
      const rimGrad = ctx.createLinearGradient(
        this.bubble.x - this.bubble.baseRadius,
        this.bubble.y - this.bubble.baseRadius,
        this.bubble.x + this.bubble.baseRadius,
        this.bubble.y + this.bubble.baseRadius
      );
      rimGrad.addColorStop(0, '#ff70a6');
      rimGrad.addColorStop(0.25, '#ffd166');
      rimGrad.addColorStop(0.5, '#06d6a0');
      rimGrad.addColorStop(0.75, '#118ab2');
      rimGrad.addColorStop(1, '#9d4edd');

      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Pass 5: Realistic Specular Window Highlight (Top-Left)
      ctx.save();
      ctx.translate(this.bubble.x, this.bubble.y);

      // Primary curved reflection
      ctx.beginPath();
      ctx.ellipse(
        -this.bubble.baseRadius * 0.42,
        -this.bubble.baseRadius * 0.42,
        this.bubble.baseRadius * 0.32,
        this.bubble.baseRadius * 0.14,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Sharp bright specular core
      ctx.beginPath();
      ctx.ellipse(
        -this.bubble.baseRadius * 0.46,
        -this.bubble.baseRadius * 0.46,
        this.bubble.baseRadius * 0.16,
        this.bubble.baseRadius * 0.06,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Secondary soft reflection (Bottom-Right room glow)
      ctx.beginPath();
      ctx.ellipse(
        this.bubble.baseRadius * 0.45,
        this.bubble.baseRadius * 0.45,
        this.bubble.baseRadius * 0.22,
        this.bubble.baseRadius * 0.08,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.fill();

      ctx.restore();
      ctx.restore();
    }

    renderAtmosphere(ctx) {
      // Dark sanctuary ambient background
      const grad = ctx.createRadialGradient(
        this.width * 0.5,
        this.height * 0.4,
        50,
        this.width * 0.5,
        this.height * 0.5,
        Math.max(this.width, this.height) * 0.8
      );

      if (this.isDisco) {
        const discoHue = (performance.now() * 0.06) % 360;
        grad.addColorStop(0, `hsla(${discoHue}, 60%, 14%, 1)`);
        grad.addColorStop(1, '#060710');
      } else {
        grad.addColorStop(0, '#13182e');
        grad.addColorStop(0.6, '#0b0e1c');
        grad.addColorStop(1, '#06070e');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    renderNearMissTexts(ctx, dt) {
      for (let i = this.nearMissNotifications.length - 1; i >= 0; i--) {
        const item = this.nearMissNotifications[i];
        item.life -= dt * 1.5;
        item.y -= dt * 30;

        if (item.life <= 0) {
          this.nearMissNotifications.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = item.color;
        ctx.globalAlpha = item.life;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 8;
        ctx.fillText(item.text, item.x - 40, item.y);
        ctx.restore();
      }
    }

    // =======================================================================
    // 7. MAIN ANIMATION & SIMULATION LOOP
    // =======================================================================

    renderLoop(currentTime) {
      const dt = Math.min(0.05, (currentTime - this.lastFrameTime) / 1000);
      this.lastFrameTime = currentTime;

      // 1. Simulation updates
      if (!this.bubble.popped) {
        this.survivalTime += dt;
        this.timerDisplay.textContent = this.formatTime(this.survivalTime);
      }

      this.bubble.update(dt, this.width, this.height);

      // Audio wobble modulation based on deformation energy
      const wobbleEnergy = this.bubble.getWobbleEnergy();
      this.audio.updateWobble(wobbleEnergy);

      // Update hazards & get closest distance for tension
      const closestDist = this.hazards.update(
        dt,
        this.width,
        this.height,
        this.bubble,
        (type, px, py) => this.handleNearMiss(type, px, py),
        (px, py) => this.handlePop(px, py),
        this.isZen
      );

      // Compute danger proximity score (0 to 1)
      const warningRange = 220;
      if (closestDist < warningRange && !this.bubble.popped) {
        this.dangerScore = 1 - Math.max(0, closestDist) / warningRange;
      } else {
        this.dangerScore *= 0.95; // Smooth decay
      }

      // Update audio engine adaptive tension
      this.audio.setDanger(this.dangerScore);
      this.audio.updateMusic();

      // Update HUD tension meter and indicator
      const percent = Math.round(this.dangerScore * 100);
      this.tensionPercent.textContent = `${percent}%`;
      this.tensionFill.style.width = `${percent}%`;

      if (this.dangerScore > 0.65) {
        this.dangerIndicator.className = 'danger-pill peril-high';
        this.dangerLabel.textContent = 'CRITICAL PERIL!';
        this.vignette.classList.add('active');
      } else if (this.dangerScore > 0.3) {
        this.dangerIndicator.className = 'danger-pill peril-mid';
        this.dangerLabel.textContent = 'HAZARD APPROACHING';
        this.vignette.classList.remove('active');
      } else {
        this.dangerIndicator.className = 'danger-pill peril-low';
        this.dangerLabel.textContent = this.isZen ? 'ZEN SANCTUARY' : 'CALM BREEZE';
        this.vignette.classList.remove('active');
      }

      // Particles update
      this.particles.update(dt, this.width, this.height, this.bubble);

      // 2. Rendering
      this.renderAtmosphere(this.ctx);
      this.particles.render(this.ctx);
      this.renderBubble(this.ctx);
      this.hazards.render(this.ctx);
      this.renderNearMissTexts(this.ctx, dt);

      requestAnimationFrame((t) => this.renderLoop(t));
    }
  }

  // Auto-launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new BubbleSanctuaryApp());
  } else {
    new BubbleSanctuaryApp();
  }
})();



/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export class AudioController {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Track coastal ambience state
  coastalAmbience: { 
    bgNodes: AudioNode[], 
    waveTimer: any,
    birdTimer: any
  } | null = null;

  // Track volcanic ambience state
  volcanicAmbience: {
    bgNodes: AudioNode[]
  } | null = null;

  // Track snow ambience state
  snowAmbience: {
    bgNodes: AudioNode[]
  } | null = null;

  // Track forest ambience state
  forestAmbience: {
    bgNodes: AudioNode[],
    birdTimer: any,
    chimeTimer: any
  } | null = null;

  // Track chess ambience state
  chessAmbience: {
    bgNodes: AudioNode[],
    tickTimer: any
  } | null = null;

  // Track crystal ambience state
  crystalAmbience: {
    bgNodes: AudioNode[]
  } | null = null;

  constructor() {
    // Lazy initialization
  }

  init() {
    if (!this.ctx) {
      // Support for standard and webkit prefixed AudioContext
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4; // Master volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  createPinkNoise(duration: number): AudioBuffer | null {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Paul Kellett's refined method for Pink Noise generation
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
      }
      return buffer;
  }

  createBrownNoise(duration: number): AudioBuffer | null {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Integrate white noise to get brown noise (1/f^2)
          // Leaky integrator to prevent clipping
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          data[i] = lastOut * 3.5; // Boost amplitude slightly to match pink
      }
      return buffer;
  }

  createCrackleNoise(duration: number): AudioBuffer | null {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
          // Sparse random clicks
          if (Math.random() < 0.001) { 
              data[i] = (Math.random() * 2 - 1) * 0.8;
          } else {
              data[i] = 0;
          }
      }
      return buffer;
  }

  playGemCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // High pitch "ding" with slight upward inflection
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playLetterCollect() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Play a major chord (C Majorish: C5, E5, G5) for a rewarding sound
    const freqs = [523.25, 659.25, 783.99]; 
    
    freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = f;
        
        // Stagger start times slightly for an arpeggio feel
        const start = t + (i * 0.04);
        const dur = 0.3;

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        
        osc.start(start);
        osc.stop(start + dur);
    });
  }

  playJump(isDouble = false) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sine wave for a smooth "whoop" sound
    osc.type = 'sine';
    
    // Pitch shift up for double jump
    const startFreq = isDouble ? 400 : 200;
    const endFreq = isDouble ? 800 : 450;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);

    // Lower volume for jump as it is a frequent action
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  playDamage() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // 1. Noise buffer for "crunch/static"
    const bufferSize = this.ctx.sampleRate * 0.3; // 0.3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // 2. Low oscillator for "thud/impact"
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  playShatter() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // 1. White noise for "crash"
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 2. High-pitched tone for "glass/ice"
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.2);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playSeagull(volume = 1.0, pan = 0) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Create panner for position
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.masterGain);

    // Create two calls slightly spaced to mimic a "kaa-kaa"
    [0, 0.4].forEach((offset, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        // Sawtooth for a slightly harsh, bird-like tone
        osc.type = 'sawtooth';
        
        // Pitch logic: Seagulls have high pitched calls that fall slightly
        // Apply random pitch variation for naturalism
        const pitchMod = (Math.random() - 0.5) * 50;
        const startFreq = (i === 0 ? 1100 : 1000) + pitchMod;
        const endFreq = (i === 0 ? 800 : 700) + pitchMod;

        osc.frequency.setValueAtTime(startFreq, t + offset);
        osc.frequency.linearRampToValueAtTime(endFreq, t + offset + 0.3);
        
        // Lowpass filter to round off the digital edge
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1800;

        // Envelope: Fast attack, slow decay
        gain.gain.setValueAtTime(0, t + offset);
        gain.gain.linearRampToValueAtTime(0.05 * volume, t + offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        
        osc.start(t + offset);
        osc.stop(t + offset + 0.35);
    });
  }

  playForestBird(pan = 0) {
     if (!this.ctx || !this.masterGain) return;
     const t = this.ctx.currentTime;
     
     const panner = this.ctx.createStereoPanner();
     panner.pan.value = pan;
     panner.connect(this.masterGain);

     // Random bird type
     const type = Math.floor(Math.random() * 3);

     if (type === 0) {
         // Simple Tweet
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         osc.type = 'sine';
         osc.frequency.setValueAtTime(2000 + Math.random() * 500, t);
         osc.frequency.linearRampToValueAtTime(2500 + Math.random() * 500, t + 0.1);
         
         gain.gain.setValueAtTime(0, t);
         gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
         gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
         
         osc.connect(gain);
         gain.connect(panner);
         osc.start(t);
         osc.stop(t + 0.15);
     } else {
         // Double Chirp
         [0, 0.12].forEach(offset => {
             const osc = this.ctx!.createOscillator();
             const gain = this.ctx!.createGain();
             osc.frequency.setValueAtTime(2800, t + offset);
             osc.frequency.exponentialRampToValueAtTime(1800, t + offset + 0.08);
             
             gain.gain.setValueAtTime(0, t + offset);
             gain.gain.linearRampToValueAtTime(0.06, t + offset + 0.01);
             gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);
             
             osc.connect(gain);
             gain.connect(panner);
             osc.start(t + offset);
             osc.stop(t + offset + 0.12);
         });
     }
  }

  playMagicChime() {
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;

      // Cluster of high sine waves
      [880, 1108, 1318, 1760].forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.05, t + 0.05 + (i * 0.05));
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
          
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(t);
          osc.stop(t + 1.6);
      });
  }

  playWingFlap() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;
    
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Pink noise ish
    let b0=0, b1=0, b2=0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    source.start(t);
    source.stop(t + 0.15);
  }

  playCrystalResonance() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Ethereal sine sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Sweep A5 to A4
    osc.frequency.setValueAtTime(880, t); 
    osc.frequency.exponentialRampToValueAtTime(440, t + 1.2);

    // Slow attack, long tail
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.2);

    // Add a sparkle overtone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, t);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.05, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.5);
  }

  playEruption() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const duration = 3.0;

    // 1. Rumble / Explosion Body (Brown Noise)
    const brownBuffer = this.createBrownNoise(duration);
    if (!brownBuffer) return;
    
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = brownBuffer;
    
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(100, t);
    rumbleFilter.frequency.exponentialRampToValueAtTime(40, t + duration);

    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(1.0, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleSource.start(t);
    
    // 2. Blast Wave (White Noise burst)
    const pinkBuffer = this.createPinkNoise(1.0);
    if (!pinkBuffer) return;

    const blastSource = this.ctx.createBufferSource();
    blastSource.buffer = pinkBuffer;
    
    const blastFilter = this.ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(800, t);
    blastFilter.frequency.linearRampToValueAtTime(200, t + 0.5);

    const blastGain = this.ctx.createGain();
    blastGain.gain.setValueAtTime(0.8, t);
    blastGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    blastSource.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(this.masterGain);
    blastSource.start(t);

    // 3. Debris & Burning (Crackles)
    const crackleBuffer = this.createCrackleNoise(3.0);
    if (crackleBuffer) {
        const crackleSource = this.ctx.createBufferSource();
        crackleSource.buffer = crackleBuffer;
        
        const crackleFilter = this.ctx.createBiquadFilter();
        crackleFilter.type = 'highpass';
        crackleFilter.frequency.value = 1000;
        
        const crackleGain = this.ctx.createGain();
        crackleGain.gain.setValueAtTime(0.8, t);
        crackleGain.gain.linearRampToValueAtTime(0, t + 2.5);

        crackleSource.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(this.masterGain);
        crackleSource.start(t);
    }
  }

  playLavaSplash() {
      if (!this.ctx || !this.masterGain) this.init();
      if (!this.ctx || !this.masterGain) return;
      
      const t = this.ctx.currentTime;

      // Heavy Thud (Low Sin)
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      
      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.5, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);

      // Splash Noise
      const noiseBuffer = this.createBrownNoise(0.5);
      if (noiseBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(t);
      }
  }

  playSizzle() {
      // Small randomized burning sound
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      
      const buffer = this.createPinkNoise(0.2);
      if (!buffer) return;
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
  }

  playSnowStep() {
      if (!this.ctx || !this.masterGain) this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      // White noise for crisp crunch
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, t); // Crisp snow

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
  }

  playSnowLand() {
      if (!this.ctx || !this.masterGain) this.init();
      if (!this.ctx || !this.masterGain) return;

      const t = this.ctx.currentTime;
      // Longer crunch
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, t); // Heavy thud

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
  }

  // --- AMBIENCE GENERATORS ---

  startCoastalAmbience() {
    if (this.coastalAmbience) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // We need multiple noise buffers for a rich texture
    const pinkNoiseBuffer = this.createPinkNoise(6); 
    const brownNoiseBuffer = this.createBrownNoise(6);
    if (!pinkNoiseBuffer || !brownNoiseBuffer) return;

    const nodes: AudioNode[] = [];
    const t = this.ctx.currentTime;

    // --- LAYER 1: Deep Ocean Rumble (Constant) ---
    // Uses Brown noise for a much deeper, fluid-like bottom end
    const bgNoise = this.ctx.createBufferSource();
    bgNoise.buffer = brownNoiseBuffer;
    bgNoise.loop = true;
    
    const bgFilter = this.ctx.createBiquadFilter();
    bgFilter.type = 'lowpass';
    bgFilter.frequency.value = 250; 
    
    const bgGain = this.ctx.createGain();
    bgGain.gain.value = 0; 
    
    bgNoise.connect(bgFilter);
    bgFilter.connect(bgGain);
    bgGain.connect(this.masterGain);
    bgNoise.start();
    
    bgGain.gain.linearRampToValueAtTime(0.12, t + 2.0);
    nodes.push(bgNoise, bgGain, bgFilter);


    // --- LAYER 2: Lapping Water (Constant but modulated) ---
    // Simulates water moving nearby (trickling/flowing)
    const lappingNoise = this.ctx.createBufferSource();
    lappingNoise.buffer = pinkNoiseBuffer;
    lappingNoise.loop = true;

    const lappingFilter = this.ctx.createBiquadFilter();
    lappingFilter.type = 'bandpass';
    lappingFilter.Q.value = 0.5; // Wide band
    
    const lappingGain = this.ctx.createGain();
    lappingGain.gain.value = 0;

    // Modulate the filter frequency to simulate movement
    const lappingLFO = this.ctx.createOscillator();
    lappingLFO.type = 'sine';
    lappingLFO.frequency.value = 0.2; // Slow cycles
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300; // Swing +/- 300Hz

    lappingFilter.frequency.value = 600; // Center at 600Hz
    lappingLFO.connect(lfoGain);
    lfoGain.connect(lappingFilter.frequency);

    lappingNoise.connect(lappingFilter);
    lappingFilter.connect(lappingGain);
    lappingGain.connect(this.masterGain);
    
    lappingLFO.start();
    lappingNoise.start();
    
    lappingGain.gain.linearRampToValueAtTime(0.05, t + 2.0); // Subtle mixing
    nodes.push(lappingNoise, lappingFilter, lappingGain, lappingLFO, lfoGain);

    // --- LAYER 2.5: High Detail Lapping (New) ---
    // Higher frequency foam/trickle sound
    const highLapSource = this.ctx.createBufferSource();
    highLapSource.buffer = pinkNoiseBuffer;
    highLapSource.loop = true;
    
    const highLapFilter = this.ctx.createBiquadFilter();
    highLapFilter.type = 'bandpass';
    highLapFilter.Q.value = 1.0;
    highLapFilter.frequency.value = 1200; 

    const highLapGain = this.ctx.createGain();
    highLapGain.gain.value = 0;

    const highLapLFO = this.ctx.createOscillator();
    highLapLFO.frequency.value = 0.5 + Math.random() * 0.2; 
    const highLapLFOGain = this.ctx.createGain();
    highLapLFOGain.gain.value = 400;

    highLapLFO.connect(highLapLFOGain);
    highLapLFOGain.connect(highLapFilter.frequency);

    highLapSource.connect(highLapFilter);
    highLapFilter.connect(highLapGain);
    highLapGain.connect(this.masterGain);
    
    highLapLFO.start();
    highLapSource.start();
    highLapGain.gain.linearRampToValueAtTime(0.03, t + 2.0); // Quiet detail
    nodes.push(highLapSource, highLapFilter, highLapGain, highLapLFO, highLapLFOGain);


    // --- LAYER 3: Dynamic Wave Variations (Scheduled) ---
    const scheduleNextWave = () => {
        if (!this.ctx || !this.masterGain || !this.coastalAmbience) return;

        // Wave Variations: 
        // 0: Rolling Swell (Long, deep)
        // 1: Standard Crash
        // 2: Splash (Short, high)
        const waveType = Math.random();
        
        let duration, intensity, attack, freqMult;
        
        if (waveType < 0.3) {
            // Rolling Swell
            duration = 6.0 + Math.random() * 2.0;
            intensity = 0.18;
            attack = 0.4; // Slow swell
            freqMult = 0.8;
        } else if (waveType < 0.7) {
            // Standard
            duration = 4.0 + Math.random();
            intensity = 0.15;
            attack = 0.15;
            freqMult = 1.0;
        } else {
            // Splash
            duration = 2.5 + Math.random();
            intensity = 0.12;
            attack = 0.05;
            freqMult = 1.4;
        }

        const startTime = this.ctx.currentTime;
        const peakTime = startTime + (duration * attack);
        const pan = (Math.random() * 1.6) - 0.8; 

        // Source 1: The "Hiss" (Spray) - Pink Noise High Passed
        const hissSource = this.ctx.createBufferSource();
        hissSource.buffer = pinkNoiseBuffer;
        hissSource.loop = true;

        const hissFilter = this.ctx.createBiquadFilter();
        hissFilter.type = 'highpass';
        hissFilter.frequency.setValueAtTime(400 * freqMult, startTime);
        hissFilter.frequency.linearRampToValueAtTime(1200 * freqMult, peakTime);
        hissFilter.frequency.exponentialRampToValueAtTime(400 * freqMult, startTime + duration);

        const hissGain = this.ctx.createGain();
        hissGain.gain.setValueAtTime(0, startTime);
        hissGain.gain.linearRampToValueAtTime(intensity * 0.8, peakTime);
        hissGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        // Source 2: The "Roar" (Body) - Brown Noise Low Passed
        const roarSource = this.ctx.createBufferSource();
        roarSource.buffer = brownNoiseBuffer;
        roarSource.loop = true;
        
        const roarFilter = this.ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(200 * freqMult, startTime);
        roarFilter.frequency.linearRampToValueAtTime(600 * freqMult, peakTime);
        roarFilter.frequency.exponentialRampToValueAtTime(150 * freqMult, startTime + duration);

        const roarGain = this.ctx.createGain();
        roarGain.gain.setValueAtTime(0, startTime);
        roarGain.gain.linearRampToValueAtTime(intensity, peakTime);
        roarGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, startTime);

        // Connections
        hissSource.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(panner);

        roarSource.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(panner);

        panner.connect(this.masterGain);

        hissSource.start(startTime);
        hissSource.stop(startTime + duration + 0.1);
        roarSource.start(startTime);
        roarSource.stop(startTime + duration + 0.1);

        const nextDelay = (duration * 0.6) + (Math.random() * 3.0); 
        this.coastalAmbience.waveTimer = setTimeout(scheduleNextWave, nextDelay * 1000);
    };

    // --- LAYER 4: Ambient Wildlife (Distant Seagulls) ---
    const scheduleAmbientBird = () => {
        if (!this.coastalAmbience) return;
        const delay = 8 + Math.random() * 15; // 8-23 seconds interval
        this.coastalAmbience.birdTimer = setTimeout(() => {
            // Play distant bird: Lower volume (0.3-0.6), Random Pan (-0.9 to 0.9)
            this.playSeagull(0.3 + Math.random() * 0.3, (Math.random() * 1.8) - 0.9);
            scheduleAmbientBird();
        }, delay * 1000);
    }

    this.coastalAmbience = { bgNodes: nodes, waveTimer: null, birdTimer: null };
    scheduleNextWave();
    scheduleAmbientBird();
  }

  stopCoastalAmbience() {
    if (!this.coastalAmbience || !this.ctx) return;
    
    if (this.coastalAmbience.waveTimer) clearTimeout(this.coastalAmbience.waveTimer);
    if (this.coastalAmbience.birdTimer) clearTimeout(this.coastalAmbience.birdTimer);

    const t = this.ctx.currentTime;
    
    // Fade out all persistent nodes
    this.coastalAmbience.bgNodes.forEach(node => {
        if (node instanceof GainNode) {
             node.gain.cancelScheduledValues(t);
             node.gain.setValueAtTime(node.gain.value, t);
             node.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        }
    });
    
    setTimeout(() => {
        this.coastalAmbience?.bgNodes.forEach(node => {
            try { node.disconnect(); } catch(e) {}
            if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                try { node.stop(); } catch(e) {}
            }
        });
        this.coastalAmbience = null;
    }, 2000);
  }

  startVolcanicAmbience() {
      if (this.volcanicAmbience) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;

      const brownBuffer = this.createBrownNoise(10);
      const crackleBuffer = this.createCrackleNoise(5);
      if (!brownBuffer || !crackleBuffer) return;

      const nodes: AudioNode[] = [];
      const t = this.ctx.currentTime;

      // --- Layer 1: The Subterranean Rumble (Deep Bass) ---
      const rumbleSource = this.ctx.createBufferSource();
      rumbleSource.buffer = brownBuffer;
      rumbleSource.loop = true;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 120; // Very low rumble

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0, t);
      rumbleGain.gain.linearRampToValueAtTime(0.25, t + 2); // Heavy presence

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.masterGain);
      rumbleSource.start();
      nodes.push(rumbleSource, rumbleFilter, rumbleGain);

      // --- Layer 2: Magma Flow/Churn (Mid-Low churning) ---
      const flowSource = this.ctx.createBufferSource();
      flowSource.buffer = brownBuffer;
      flowSource.loop = true;

      const flowFilter = this.ctx.createBiquadFilter();
      flowFilter.type = 'bandpass';
      flowFilter.frequency.value = 350; 
      flowFilter.Q.value = 1.0;

      const flowGain = this.ctx.createGain();
      flowGain.gain.setValueAtTime(0, t);
      
      // Modulate flow volume to sound like moving lava
      const flowLFO = this.ctx.createOscillator();
      flowLFO.frequency.value = 0.15; // Slow churn
      const flowLFOGain = this.ctx.createGain();
      flowLFOGain.gain.value = 0.05;
      
      flowLFO.connect(flowLFOGain);
      flowLFOGain.connect(flowGain.gain);
      flowGain.gain.linearRampToValueAtTime(0.1, t + 2);

      flowSource.connect(flowFilter);
      flowFilter.connect(flowGain);
      flowGain.connect(this.masterGain);
      flowLFO.start();
      flowSource.start();
      nodes.push(flowSource, flowFilter, flowGain, flowLFO, flowLFOGain);

      // --- Layer 3: Fire Crackles (High crisp pops) ---
      const crackleSource = this.ctx.createBufferSource();
      crackleSource.buffer = crackleBuffer;
      crackleSource.loop = true;

      const crackleFilter = this.ctx.createBiquadFilter();
      crackleFilter.type = 'highpass';
      crackleFilter.frequency.value = 1500; // Keep it crisp

      const crackleGain = this.ctx.createGain();
      crackleGain.gain.setValueAtTime(0, t);
      crackleGain.gain.linearRampToValueAtTime(0.08, t + 1);

      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(this.masterGain);
      crackleSource.start();
      nodes.push(crackleSource, crackleFilter, crackleGain);

      this.volcanicAmbience = { bgNodes: nodes };
  }

  stopVolcanicAmbience() {
      if (!this.volcanicAmbience || !this.ctx) return;
      const t = this.ctx.currentTime;

      this.volcanicAmbience.bgNodes.forEach(node => {
          if (node instanceof GainNode) {
              node.gain.cancelScheduledValues(t);
              node.gain.setValueAtTime(node.gain.value, t);
              node.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
          }
      });

      setTimeout(() => {
          this.volcanicAmbience?.bgNodes.forEach(node => {
              try { node.disconnect(); } catch(e) {}
              if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                  try { node.stop(); } catch(e) {}
              }
          });
          this.volcanicAmbience = null;
      }, 2000);
  }

  startSnowAmbience() {
    if (this.snowAmbience) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    const t = this.ctx.currentTime;
    const nodes: AudioNode[] = [];
    const brownBuffer = this.createBrownNoise(10); // Switched to brown for deeper wind
    if(!brownBuffer) return;

    // 1. Cold Wind (Howling/Rumbling) - Lowpass to avoid 'sand' sound
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = brownBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 600; // Lower frequency for cleaner wind

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0, t);
    windGain.gain.linearRampToValueAtTime(0.25, t + 2);

    // LFO for wind sweeping volume/freq
    const windLFO = this.ctx.createOscillator();
    windLFO.frequency.value = 0.15;
    const windLFOGain = this.ctx.createGain();
    windLFOGain.gain.value = 150; 

    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);
    
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);
    
    windSource.start();
    windLFO.start();
    nodes.push(windSource, windFilter, windGain, windLFO, windLFOGain);

    // 2. Ethereal Shimmer (Subtle)
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.03; // Reduced volume
    shimmerGain.connect(this.masterGain);
    nodes.push(shimmerGain);

    [880, 1100].forEach(freq => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const lfo = this.ctx!.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + Math.random() * 0.2;
        
        const lfoGain = this.ctx!.createGain();
        lfoGain.gain.value = 0.5; 
        
        const oscGain = this.ctx!.createGain();
        oscGain.gain.value = 0.5;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain); 
        
        osc.connect(oscGain);
        oscGain.connect(shimmerGain);
        
        osc.start();
        lfo.start();
        nodes.push(osc, lfo, lfoGain, oscGain);
    });

    this.snowAmbience = { bgNodes: nodes };
  }

  stopSnowAmbience() {
      if (!this.snowAmbience || !this.ctx) return;
      const t = this.ctx.currentTime;

      this.snowAmbience.bgNodes.forEach(node => {
          if (node instanceof GainNode) {
              node.gain.cancelScheduledValues(t);
              node.gain.setValueAtTime(node.gain.value, t);
              node.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
          }
      });

      setTimeout(() => {
          this.snowAmbience?.bgNodes.forEach(node => {
              try { node.disconnect(); } catch(e) {}
              if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                  try { node.stop(); } catch(e) {}
              }
          });
          this.snowAmbience = null;
      }, 2000);
  }

  startForestAmbience() {
      if (this.forestAmbience) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const nodes: AudioNode[] = [];

      // 1. Rustling Leaves / Wind (Pink Noise, Highpass)
      const pinkBuffer = this.createPinkNoise(10);
      if (pinkBuffer) {
          const windSource = this.ctx.createBufferSource();
          windSource.buffer = pinkBuffer;
          windSource.loop = true;
          
          const windFilter = this.ctx.createBiquadFilter();
          windFilter.type = 'highpass';
          windFilter.frequency.value = 800; // Leaves rustle is higher pitched wind
          
          const windGain = this.ctx.createGain();
          windGain.gain.setValueAtTime(0, t);
          windGain.gain.linearRampToValueAtTime(0.08, t + 2.0);
          
          // Modulate volume for breeze effect
          const lfo = this.ctx.createOscillator();
          lfo.frequency.value = 0.2;
          const lfoGain = this.ctx.createGain();
          lfoGain.gain.value = 0.04;
          lfo.connect(lfoGain);
          lfoGain.connect(windGain.gain);

          windSource.connect(windFilter);
          windFilter.connect(windGain);
          windGain.connect(this.masterGain);
          windSource.start();
          lfo.start();
          nodes.push(windSource, windFilter, windGain, lfo, lfoGain);
      }

      // 2. Magical Drone (Low Sine)
      const droneOsc = this.ctx.createOscillator();
      droneOsc.frequency.value = 150;
      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0, t);
      droneGain.gain.linearRampToValueAtTime(0.05, t + 2);
      
      droneOsc.connect(droneGain);
      droneGain.connect(this.masterGain);
      droneOsc.start();
      nodes.push(droneOsc, droneGain);

      // 3. Random Bird Scheduler
      const scheduleBird = () => {
          if (!this.forestAmbience) return;
          const delay = 2 + Math.random() * 6; // Frequent birds in forest
          this.forestAmbience.birdTimer = setTimeout(() => {
              this.playForestBird((Math.random() - 0.5) * 1.5);
              scheduleBird();
          }, delay * 1000);
      };

      // 4. Random Magic Chime Scheduler
      const scheduleChime = () => {
          if (!this.forestAmbience) return;
          const delay = 10 + Math.random() * 15; // Rarer magical chimes
          this.forestAmbience.chimeTimer = setTimeout(() => {
              this.playMagicChime();
              scheduleChime();
          }, delay * 1000);
      };
      
      this.forestAmbience = { bgNodes: nodes, birdTimer: null, chimeTimer: null };
      scheduleBird();
      scheduleChime();
  }

  stopForestAmbience() {
      if (!this.forestAmbience || !this.ctx) return;
      if (this.forestAmbience.birdTimer) clearTimeout(this.forestAmbience.birdTimer);
      if (this.forestAmbience.chimeTimer) clearTimeout(this.forestAmbience.chimeTimer);
      
      const t = this.ctx.currentTime;
      this.forestAmbience.bgNodes.forEach(node => {
          if (node instanceof GainNode) {
              node.gain.cancelScheduledValues(t);
              node.gain.setValueAtTime(node.gain.value, t);
              node.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
          }
      });
      setTimeout(() => {
          this.forestAmbience?.bgNodes.forEach(node => {
              try { node.disconnect(); } catch(e) {}
              if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                  try { node.stop(); } catch(e) {}
              }
          });
          this.forestAmbience = null;
      }, 2000);
  }

  startChessAmbience() {
      if (this.chessAmbience) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const nodes: AudioNode[] = [];

      // 1. Brooding Drone (Sawtooth, Lowpass) - Tension
      const droneOsc = this.ctx.createOscillator();
      droneOsc.type = 'sawtooth';
      droneOsc.frequency.value = 60; // Deep low drone
      
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 100;

      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0, t);
      droneGain.gain.linearRampToValueAtTime(0.15, t + 2); // Moderate volume
      
      // Slight detune for chorus effect
      const droneOsc2 = this.ctx.createOscillator();
      droneOsc2.type = 'sawtooth';
      droneOsc2.frequency.value = 60.5;
      
      droneOsc.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.masterGain);
      droneOsc.start();
      droneOsc2.start();
      nodes.push(droneOsc, droneOsc2, droneFilter, droneGain);

      // 2. Ticking Clock (Mechanical)
      const tickBuffer = this.createPinkNoise(0.05); // Short click
      if (tickBuffer) {
        const scheduleTick = () => {
            if (!this.chessAmbience || !this.ctx || !this.masterGain) return;
            const now = this.ctx.currentTime;
            
            const source = this.ctx.createBufferSource();
            source.buffer = tickBuffer;
            
            // Filter to make it sound like wood/mechanism
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 2;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            source.start(now);
            
            // Alternate tick/tock slightly
            this.chessAmbience.tickTimer = setTimeout(scheduleTick, 1000); // 1 beat per second
        };
        this.chessAmbience = { bgNodes: nodes, tickTimer: null };
        scheduleTick();
      } else {
        this.chessAmbience = { bgNodes: nodes, tickTimer: null };
      }
  }

  stopChessAmbience() {
      if (!this.chessAmbience || !this.ctx) return;
      if (this.chessAmbience.tickTimer) clearTimeout(this.chessAmbience.tickTimer);
      
      const t = this.ctx.currentTime;
      this.chessAmbience.bgNodes.forEach(node => {
          if (node instanceof GainNode) {
              node.gain.cancelScheduledValues(t);
              node.gain.setValueAtTime(node.gain.value, t);
              node.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
          }
      });
      setTimeout(() => {
          this.chessAmbience?.bgNodes.forEach(node => {
            try { node.disconnect(); } catch(e) {}
            if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                try { node.stop(); } catch(e) {}
            }
          });
          this.chessAmbience = null;
      }, 1000);
  }

  startCrystalAmbience() {
      if (this.crystalAmbience) return;
      this.init();
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const nodes: AudioNode[] = [];

      // 1. Singing Caverns (Harmonic Sine Stack)
      // Chords: A minor add9 (A, C, E, B)
      const freqs = [220, 261.63, 329.63, 493.88, 523.25];
      
      freqs.forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          
          const gain = this.ctx!.createGain();
          gain.gain.value = 0; // modulated by LFO
          
          // Each note breathes independently
          const lfo = this.ctx!.createOscillator();
          lfo.frequency.value = 0.1 + Math.random() * 0.1; // Slow breathing
          
          const lfoGain = this.ctx!.createGain();
          lfoGain.gain.value = 0.03; // Max volume for individual note
          
          // Offset lfo
          const delay = Math.random() * 10;
          
          lfo.connect(lfoGain);
          lfoGain.connect(gain.gain);
          
          // Connect modulating gain
          osc.connect(gain);
          gain.connect(this.masterGain!);
          
          osc.start(t);
          lfo.start(t);
          nodes.push(osc, gain, lfo, lfoGain);
      });
      
      // 2. Deep Crystal Hum
      const humOsc = this.ctx.createOscillator();
      humOsc.frequency.value = 55; // Low A
      const humGain = this.ctx.createGain();
      humGain.gain.setValueAtTime(0, t);
      humGain.gain.linearRampToValueAtTime(0.1, t + 4);
      
      humOsc.connect(humGain);
      humGain.connect(this.masterGain);
      humOsc.start();
      nodes.push(humOsc, humGain);

      this.crystalAmbience = { bgNodes: nodes };
  }

  stopCrystalAmbience() {
      if (!this.crystalAmbience || !this.ctx) return;
      const t = this.ctx.currentTime;

      this.crystalAmbience.bgNodes.forEach(node => {
          if (node instanceof GainNode) {
              // Hacky check for the main gain nodes vs modulation nodes
              // Just ramp down everything that can be ramped
              try {
                  node.gain.cancelScheduledValues(t);
                  node.gain.setValueAtTime(node.gain.value, t);
                  node.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
              } catch (e) {}
          }
      });
      setTimeout(() => {
          this.crystalAmbience?.bgNodes.forEach(node => {
            try { node.disconnect(); } catch(e) {}
            if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
                try { node.stop(); } catch(e) {}
            }
          });
          this.crystalAmbience = null;
      }, 2000);
  }
}

export const audio = new AudioController();
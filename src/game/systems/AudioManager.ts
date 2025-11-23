export class AudioManager {
  private audioContext: AudioContext;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  loadSound(name: string, path: string): void {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => {
      console.log(`✅ Sound loaded: ${name}`);
    });
    audio.addEventListener('error', (e) => {
      console.warn(`⚠️ Failed to load sound: ${name} at ${path}, using synthesized sound`);
    });
    this.sounds.set(name, audio);
  }

  playSound(name: string, volume: number = 1.0): void {
    const sound = this.sounds.get(name);

    // Try to play loaded sound first
    if (sound && sound.readyState >= 2) {
      const clone = sound.cloneNode(true) as HTMLAudioElement;
      clone.volume = volume;
      clone.play().catch(() => {
        // If file fails, fall back to synthesized sound
        this.playSynthesizedSlurp(volume);
      });
    } else {
      // File not loaded, use synthesized sound
      this.playSynthesizedSlurp(volume);
    }
  }

  private playSynthesizedSlurp(volume: number): void {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for slurp sound
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Slurp effect: quick frequency slide down
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    // Volume envelope
    gainNode.gain.setValueAtTime(volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}
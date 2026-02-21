interface AoeEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  createdAt: number;
  duration: number;
}

export class AoeEffectSystem {
  private effects: AoeEffect[] = [];

  add(x: number, y: number, radiusPixels: number): void {
    this.effects.push({
      x, y,
      radius: 0,
      maxRadius: radiusPixels,
      opacity: 0.5,
      createdAt: Date.now(),
      duration: 400,
    });
  }

  update(): void {
    const now = Date.now();
    this.effects = this.effects.filter(e => {
      const age = now - e.createdAt;
      if (age > e.duration) return false;
      const t = age / e.duration;
      e.radius = e.maxRadius * Math.min(1, t * 2);
      e.opacity = (1 - t) * 0.5;
      return true;
    });
  }

  getEffects(): AoeEffect[] {
    return this.effects;
  }
}

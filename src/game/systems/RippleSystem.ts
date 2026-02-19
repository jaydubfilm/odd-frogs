interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  createdAt: number;
  duration: number;
}

export class RippleSystem {
  private ripples: Ripple[] = [];

  add(x: number, y: number): void {
    // Two concentric ripples for a natural look
    this.ripples.push({
      x, y,
      radius: 10,
      maxRadius: 60,
      opacity: 0.6,
      createdAt: Date.now(),
      duration: 500,
    });
    this.ripples.push({
      x, y,
      radius: 8,
      maxRadius: 45,
      opacity: 0.4,
      createdAt: Date.now() + 80,
      duration: 400,
    });
  }

  update(): void {
    const now = Date.now();
    this.ripples = this.ripples.filter(r => {
      const age = now - r.createdAt;
      if (age < 0) return true; // delayed ripple
      if (age > r.duration) return false;
      const t = age / r.duration;
      r.radius = 10 + (r.maxRadius - 10) * t;
      r.opacity = (1 - t) * 0.6;
      return true;
    });
  }

  getRipples(): Ripple[] {
    return this.ripples;
  }
}

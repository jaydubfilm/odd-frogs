export interface HeartParticle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  createdAt: number;
  duration: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export class HeartFloatSystem {
  private hearts: HeartParticle[] = [];

  add(startX: number, startY: number, targetX: number, targetY: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 60;
      const midY = (startY + targetY) / 2 - 40 - Math.random() * 30;
      this.hearts.push({
        startX,
        startY,
        targetX: targetX + (Math.random() - 0.5) * 20,
        targetY: targetY + (Math.random() - 0.5) * 10,
        controlX: midX,
        controlY: midY,
        createdAt: Date.now() + i * 50,
        duration: 800,
        x: startX,
        y: startY,
        scale: 0,
        opacity: 0,
      });
    }
  }

  update(): void {
    const now = Date.now();
    this.hearts = this.hearts.filter(h => {
      const age = now - h.createdAt;
      if (age < 0) return true; // staggered, not yet started
      if (age > h.duration) return false;

      const t = age / h.duration;
      const inv = 1 - t;
      // Quadratic bezier
      h.x = inv * inv * h.startX + 2 * inv * t * h.controlX + t * t * h.targetX;
      h.y = inv * inv * h.startY + 2 * inv * t * h.controlY + t * t * h.targetY;
      h.scale = Math.sin(t * Math.PI) * 1.2;
      h.opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
      return true;
    });
  }

  getHearts(): HeartParticle[] {
    return this.hearts;
  }
}

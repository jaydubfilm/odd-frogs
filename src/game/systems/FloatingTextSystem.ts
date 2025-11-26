import { FloatingText } from '../../types/game';

export class FloatingTextSystem {
  private texts: FloatingText[] = [];

  add(x: number, y: number, amount: number) {
    this.texts.push({
      x,
      y,
      text: `+${amount}$`,
      opacity: 1,
      velocity: 0.5,
      createdAt: Date.now(),
      duration: 1500
    });
  }

  update(deltaTime: number) {
    const now = Date.now();
    this.texts = this.texts.filter(text => {
      const age = now - text.createdAt;
      if (age > text.duration) return false;

      text.y -= text.velocity * (deltaTime / 16);
      text.opacity = 1 - (age / text.duration);
      return true;
    });
  }

  getTexts(): FloatingText[] {
    return this.texts;
  }
}
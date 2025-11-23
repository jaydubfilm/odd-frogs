interface Point { x: number; y: number; }
export interface SmoothPath {
  points: Point[];
  length: number;
}

/**
 * Generates smooth, curved paths for streams
 */
export class PathGenerator {
  private static readonly CORNER_RADIUS = 20;
  private static readonly SMOOTHING_PASSES = 7;

  /**
   * Generate a smooth path from line segments
   */
  static generateSmoothPath(
    segments: Array<{ start: Point; end: Point }>,
    offsetDistance: number = 0
  ): SmoothPath {
    if (segments.length === 0) {
      return { points: [], length: 0 };
    }

    // 1. Build base path with corner retraction
    let basePath: Point[] = [];

    segments.forEach((seg) => {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      // Unit direction
      const ux = dx / segLen;
      const uy = dy / segLen;

      // Retract for smooth corners
      const trim = Math.min(this.CORNER_RADIUS, segLen * 0.4);

      basePath.push({
        x: seg.start.x + ux * trim,
        y: seg.start.y + uy * trim
      });
      basePath.push({
        x: seg.end.x - ux * trim,
        y: seg.end.y - uy * trim
      });
    });

    // 2. Apply Chaikin smoothing
    let smoothPath = basePath;
    for (let i = 0; i < this.SMOOTHING_PASSES; i++) {
      smoothPath = this.chaikinSmooth(smoothPath);
    }

    // 3. Apply offset if needed (for multiple parallel streams)
    if (offsetDistance !== 0) {
      smoothPath = this.createParallelCurve(smoothPath, offsetDistance);
    }

    // 4. Calculate total path length
    const length = this.calculatePathLength(smoothPath);

    return { points: smoothPath, length };
  }

  /**
   * Chaikin subdivision smoothing
   */
  private static chaikinSmooth(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const newPoints: Point[] = [];
    newPoints.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      if (Math.abs(p0.x - p1.x) < 0.1 && Math.abs(p0.y - p1.y) < 0.1) continue;

      newPoints.push({
        x: 0.8 * p0.x + 0.2 * p1.x,
        y: 0.8 * p0.y + 0.2 * p1.y
      });

      newPoints.push({
        x: 0.2 * p0.x + 0.8 * p1.x,
        y: 0.2 * p0.y + 0.8 * p1.y
      });
    }

    newPoints.push(points[points.length - 1]);
    return newPoints;
  }

  /**
   * Create parallel curve at offset distance
   */
  private static createParallelCurve(points: Point[], offset: number): Point[] {
    if (points.length < 2) return points;

    const offsetPoints: Point[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let tangent: Point;

      if (i === 0) {
        const next = points[i + 1];
        tangent = this.normalize({ x: next.x - p.x, y: next.y - p.y });
      } else if (i === points.length - 1) {
        const prev = points[i - 1];
        tangent = this.normalize({ x: p.x - prev.x, y: p.y - prev.y });
      } else {
        const prev = points[i - 1];
        const next = points[i + 1];
        tangent = this.normalize({ x: next.x - prev.x, y: next.y - prev.y });
      }

      // Normal (perpendicular) - rotate 90° clockwise
      const normal = { x: tangent.y, y: -tangent.x };

      offsetPoints.push({
        x: p.x + normal.x * offset,
        y: p.y + normal.y * offset
      });
    }

    return offsetPoints;
  }

  /**
   * Normalize vector to unit length
   */
  private static normalize(v: Point): Point {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 0.0001) return { x: 0, y: 1 };
    return { x: v.x / len, y: v.y / len };
  }

  /**
   * Calculate total path length
   */
  private static calculatePathLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  /**
   * Get position and direction at a specific distance along the path
   */
  static getPositionAtDistance(path: Point[], distance: number): {
    position: Point;
    direction: Point;
    completed: boolean;
  } {
    if (path.length === 0) {
      return {
        position: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        completed: true
      };
    }

    if (distance <= 0) {
      const dir = path.length > 1
        ? this.normalize({ x: path[1].x - path[0].x, y: path[1].y - path[0].y })
        : { x: 1, y: 0 };
      return {
        position: path[0],
        direction: dir,
        completed: false
      };
    }

    let accumulatedDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i];
      const p1 = path[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (accumulatedDistance + segmentLength >= distance) {
        // Position is on this segment
        const t = (distance - accumulatedDistance) / segmentLength;
        return {
          position: {
            x: p0.x + dx * t,
            y: p0.y + dy * t
          },
          direction: this.normalize({ x: dx, y: dy }),
          completed: false
        };
      }

      accumulatedDistance += segmentLength;
    }

    // Reached the end
    const lastPoint = path[path.length - 1];
    const secondLast = path[path.length - 2];
    return {
      position: lastPoint,
      direction: this.normalize({
        x: lastPoint.x - secondLast.x,
        y: lastPoint.y - secondLast.y
      }),
      completed: true
    };
  }
}
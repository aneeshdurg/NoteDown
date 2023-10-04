import { CanvasContext } from './types.ts';
import { GetConfig } from './config.ts';

export interface Point {
  x: number;
  y: number;
}

export class Stroke {
  x_points: number[]
  y_points: number[]
  y_root: number
  constructor(y_root: number) {
    this.x_points = [];
    this.y_points = [];
    this.y_root = y_root;
  }

  copy(): Stroke {
    const s = new Stroke(this.y_root);
    for (let i = 0; i < this.x_points.length; i++) {
      s.add(this.x_points[i], this.y_points[i] + this.y_root);
    }
    return s;
  }

  add(x: number, y: number) {
    this.x_points.push(x);
    this.y_points.push(y - this.y_root);
  }

  draw(ctx: CanvasContext, y_root: number, fastdraw: boolean = false) {
    ctx.strokeStyle = GetConfig().strokeColor;
    ctx.lineWidth = 2;

    let increment = 1;
    if (fastdraw) {
      increment = 5;
    }

    let last_x = this.x_points[0];
    let last_y = this.y_points[0] + y_root;
    for (let i = 1; i < this.x_points.length; i += increment) {
      const new_x = this.x_points[i];
      const new_y = this.y_points[i] + y_root;

      ctx.beginPath();
      ctx.moveTo(last_x, last_y);
      ctx.lineTo(new_x, new_y);
      ctx.stroke();

      last_x = new_x;
      last_y = new_y;
    }
  }

  intersects(y_root: number, p1: Point, p2: Point): boolean {
    // TODO(aneesh) this is so inefficient - having a bounding box could be a
    // cheap and easy optimization
    const in_range = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const xmin = Math.min(x1, x2);
      const xmax = Math.max(x1, x2);
      const ymin = Math.min(y1, y2);
      const ymax = Math.max(y1, y2);
      return px >= xmin && px <= xmax && py >= ymin && py <= ymax;
    };


    const l2x1 = p1.x;
    const l2y1 = p1.y;
    const l2x2 = p2.x;
    const l2y2 = p2.y;
    const l2m = (l2y2 - l2y1) / (l2x2 - l2x1);
    const l2c = l2y1 - l2m * l2x1;

    const line_intersects = (l1p1: number, l1p2: number) => {
      const l1x1 = this.x_points[l1p1];
      const l1y1 = this.y_points[l1p1] + y_root;
      const l1x2 = this.x_points[l1p2];
      const l1y2 = this.y_points[l1p2] + y_root;
      const l1m = (l1y2 - l1y1) / (l1x2 - l1x1);
      const l1c = l1y1 - l1m * l1x1;

      if (l1m == l2m) {
        if (l1c != l2c) {
          return false;
        }
        return in_range(l1x1, l1y1, l2x1, l2y1, l2x2, l2y2) ||
          in_range(l1x2, l1y2, l2x1, l2y1, l2x2, l2y2);
      } else {
        const intersection_x = (l2c - l1c) / (l1m - l2m);
        const intersection_y = l1m * intersection_x + l1c;

        return in_range(intersection_x, intersection_y, l1x1, l1y1, l1x2, l1y2) &&
          in_range(intersection_x, intersection_y, l2x1, l2y1, l2x2, l2y2);
      }
    };

    for (let j = 1; j < this.x_points.length; j++) {
      const l1p1 = j - 1;
      const l1p2 = j;
      if (line_intersects(l1p1, l1p2)) {
        return true;
      }
    }
    return false;
  }

  leftMostPoint(): number {
    let leftMostPoint = Infinity;
    for (let i = 0; i < this.x_points.length; i++) {
      // TODO:
      // if (stroke.y_points[i] < 0 || stroke.y_points[i] >= line_spacing) {
      //   continue;
      // }

      leftMostPoint = Math.min(leftMostPoint, this.x_points[i]);
    }

    return leftMostPoint;
  }
};

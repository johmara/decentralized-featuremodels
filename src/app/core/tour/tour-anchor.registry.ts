import { ElementRef, Injectable } from '@angular/core';

/**
 * Where tour steps point the spotlight. Anchors register themselves by a
 * plain string id (not a CSS selector) so tour data never has to know a
 * component's internal DOM structure.
 */
@Injectable({ providedIn: 'root' })
export class TourAnchorRegistry {
  private readonly anchors = new Map<string, ElementRef<HTMLElement>>();

  register(id: string, ref: ElementRef<HTMLElement>): void {
    this.anchors.set(id, ref);
  }

  unregister(id: string, ref: ElementRef<HTMLElement>): void {
    if (this.anchors.get(id) === ref) this.anchors.delete(id);
  }

  get(id: string): ElementRef<HTMLElement> | undefined {
    return this.anchors.get(id);
  }
}

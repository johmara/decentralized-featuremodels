import { Component, effect, inject, input, signal } from '@angular/core';
import { TourAnchorRegistry } from '../core/tour/tour-anchor.registry';

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Dims the viewport except for one anchored element, via a box-shadow
 * cutout rather than an SVG mask — same visual result, no coordinate-system
 * bookkeeping. Recomputes on anchor change, window resize, and scroll.
 */
@Component({
  selector: 'app-spotlight-overlay',
  templateUrl: './spotlight-overlay.html',
  styleUrl: './spotlight-overlay.scss',
  host: {
    '(window:resize)': 'refresh()',
    '(window:scroll)': 'refresh()',
  },
})
export class SpotlightOverlay {
  readonly anchorId = input<string | null>(null);

  private readonly registry = inject(TourAnchorRegistry);
  protected readonly rect = signal<Rect | null>(null);

  private readonly trackAnchor = effect(() => {
    this.anchorId();
    this.refresh();
  });

  refresh(): void {
    const id = this.anchorId();
    if (!id) {
      this.rect.set(null);
      return;
    }
    const ref = this.registry.get(id);
    if (!ref) {
      this.rect.set(null);
      // Anchors from a route that just finished lazy-loading may not be registered yet.
      setTimeout(() => {
        if (this.anchorId() === id) this.refresh();
      }, 150);
      return;
    }
    const box = ref.nativeElement.getBoundingClientRect();
    const pad = 8;
    this.rect.set({ x: box.left - pad, y: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 });
  }
}

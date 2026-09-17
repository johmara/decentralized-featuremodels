import { Component, inject } from '@angular/core';
import { SpotlightOverlay } from '../../ui/spotlight-overlay';
import { TourStore } from '../../core/state/tour.store';

@Component({
  selector: 'app-tour-overlay',
  imports: [SpotlightOverlay],
  templateUrl: './tour-overlay.html',
  styleUrl: './tour-overlay.scss',
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class TourOverlay {
  protected readonly tourStore = inject(TourStore);

  onKeydown(event: KeyboardEvent): void {
    if (!this.tourStore.currentStep()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.tourStore.exit();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.tourStore.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.tourStore.prev();
    }
  }
}

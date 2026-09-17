import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TourStore } from '../../core/state/tour.store';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly tourStore = inject(TourStore);

  startTour(): void {
    this.tourStore.start('main');
  }
}

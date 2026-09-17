import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TourOverlay } from './features/tour/tour-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TourOverlay],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <main class="not-found">
      <h1>Page not found</h1>
      <p><a routerLink="/">Back to the start</a></p>
    </main>
  `,
  styles: `
    .not-found {
      max-width: 640px;
      margin: var(--space-8) auto;
      padding: 0 var(--space-4);
      text-align: center;
    }
  `,
})
export class NotFoundPage {}

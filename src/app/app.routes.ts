import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'explore',
    pathMatch: 'full',
    redirectTo: 'explore/phone',
  },
  {
    path: 'explore/:exampleId',
    loadComponent: () => import('./features/explore/example-page').then((m) => m.ExamplePage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];

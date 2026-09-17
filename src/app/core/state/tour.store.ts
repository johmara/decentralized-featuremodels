import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigStore } from './config.store';
import { TOURS } from '../../data/tours/main.tour';
import type { TourStep } from '../model/tour.types';

/**
 * Drives the guided tour. Deliberately simple: steps advance only via
 * Prev/Next/Exit (no auto-detection of a matching user action), and
 * `tour`/`step` query params are best-effort — enough to resume a shared
 * link, not a continuously two-way-synced URL. See ConfigStore's
 * `loadSelection` note for why: the same reentrancy tradeoff applies here.
 */
@Injectable({ providedIn: 'root' })
export class TourStore {
  private readonly configStore = inject(ConfigStore);
  private readonly router = inject(Router);

  private readonly _activeTourId = signal<string | null>(null);
  private readonly _stepIndex = signal(0);

  readonly activeTourId = this._activeTourId.asReadonly();
  readonly stepIndex = this._stepIndex.asReadonly();

  readonly tour = computed(() => {
    const id = this._activeTourId();
    return id ? TOURS[id] ?? null : null;
  });

  readonly currentStep = computed<TourStep | null>(() => {
    const tour = this.tour();
    return tour ? tour.steps[this._stepIndex()] ?? null : null;
  });

  readonly isFirstStep = computed(() => this._stepIndex() === 0);

  readonly isLastStep = computed(() => {
    const tour = this.tour();
    return !tour || this._stepIndex() >= tour.steps.length - 1;
  });

  readonly stepNumber = computed(() => this._stepIndex() + 1);
  readonly stepCount = computed(() => this.tour()?.steps.length ?? 0);

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const tourId = params.get('tour');
    const stepId = params.get('step');
    if (tourId && TOURS[tourId]) {
      const tour = TOURS[tourId];
      const index = stepId ? tour.steps.findIndex((step) => step.id === stepId) : 0;
      this.start(tourId, index >= 0 ? index : 0);
    }
  }

  start(tourId: string, index = 0): void {
    const tour = TOURS[tourId];
    if (!tour || !tour.steps[index]) return;
    this._activeTourId.set(tourId);
    this._stepIndex.set(index);
    this.applyStep(tour.steps[index]);
  }

  next(): void {
    const tour = this.tour();
    if (!tour) return;
    const nextIndex = this._stepIndex() + 1;
    if (nextIndex >= tour.steps.length) return;
    this._stepIndex.set(nextIndex);
    this.applyStep(tour.steps[nextIndex]);
  }

  prev(): void {
    const tour = this.tour();
    if (!tour) return;
    const prevIndex = this._stepIndex() - 1;
    if (prevIndex < 0) return;
    this._stepIndex.set(prevIndex);
    this.applyStep(tour.steps[prevIndex]);
  }

  /** Leaves the current configuration exactly as it is — exiting mid-tour must never reset the visitor's state. */
  exit(): void {
    this._activeTourId.set(null);
    void this.router.navigate([], {
      queryParams: { tour: null, step: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private applyStep(step: TourStep): void {
    void this.router.navigateByUrl(step.route).then(() => {
      const pre = step.precondition;
      if (pre.mode) this.configStore.setMode(pre.mode);
      if (pre.scope !== undefined) this.configStore.setScope(pre.scope);
      if (pre.presetId) this.configStore.loadPreset(pre.presetId);
      if (pre.selection) {
        const selection = new Map(Object.entries(pre.selection).map(([modelId, ids]) => [modelId, new Set(ids)]));
        this.configStore.loadSelection(selection);
      }

      void this.router.navigate([], {
        queryParams: { tour: this._activeTourId(), step: step.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }
}

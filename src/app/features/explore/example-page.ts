import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FeatureTree } from '../../ui/feature-tree';
import { FeatureTreeList } from '../../ui/feature-tree-list';
import { Legend } from '../../ui/legend';
import { DecentralizedView } from './decentralized-view';
import { ConfigStore, type Mode } from '../../core/state/config.store';
import { decodeSelection, encodeSelection } from '../../core/url/config-codec';
import { explainMissingCapability, explainRuleViolation } from '../../core/engine/resolver';
import { EXAMPLES, EXAMPLE_IDS } from '../../data/examples';
import { TourAnchorDirective } from '../../core/tour/tour-anchor.directive';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation } from '../../core/engine/propagate';
import type { FeatureRef, ModelId } from '../../core/model/feature-model.types';

@Component({
  selector: 'app-example-page',
  imports: [FeatureTree, FeatureTreeList, Legend, DecentralizedView, RouterLink, TourAnchorDirective, DecimalPipe],
  templateUrl: './example-page.html',
  styleUrl: './example-page.scss',
})
export class ExamplePage {
  readonly exampleId = input<string>('phone');

  protected readonly exampleIds = EXAMPLE_IDS;
  protected readonly exampleTitle = (id: string): string => EXAMPLES[id]?.title ?? id;

  protected readonly store = inject(ConfigStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly shareStatus = signal<'idle' | 'copied' | 'manual'>('idle');
  protected readonly shareLink = signal<string | null>(null);
  protected readonly listView = signal(false);

  /** Centralized-tree zoom. null = shrink to fit the page width. */
  protected readonly zoom = signal<number | null>(null);
  protected readonly panning = signal(false);
  protected readonly zoomStep = 1.25;
  protected readonly minZoom = 0.25;
  protected readonly maxZoom = 4;
  private panOrigin: { x: number; y: number; left: number; top: number } | null = null;

  /**
   * Runs whenever the route's exampleId changes: (re)selects the example,
   * then applies any share-link query params for it. Deliberately a single
   * effect — setExample's reset and the URL overlay must happen in the
   * same synchronous pass, or the overlay would be wiped by the reset.
   */
  private readonly syncFromRoute = effect(() => {
    const id = this.exampleId();
    this.store.setExample(id);

    const params = this.route.snapshot.queryParamMap;
    const mode = params.get('mode');
    if (mode === 'centralized' || mode === 'decentralized') {
      this.store.setMode(mode);
    }

    const scope = params.get('scope');
    const example = this.store.example();
    if (scope && example.models.some((model) => model.id === scope)) {
      this.store.setScope(scope);
    }

    const presetId = params.get('preset');
    if (presetId) {
      this.store.loadPreset(presetId);
    }

    const cfg = params.get('cfg');
    if (cfg) {
      const decoded = decodeSelection(example, cfg);
      if (decoded) this.store.loadSelection(decoded);
    }
  });

  /** Structure-only view of the centralized reference model — no synthetic configuration is implied. */
  protected readonly centralizedPropagation = computed<ModelPropagation | null>(() => {
    const model = this.store.example().centralized;
    if (!model) return null;
    return {
      modelId: model.id,
      manual: new Set(),
      selection: new Set([model.rootId]),
      derived: new Set([model.rootId]),
      dead: new Set(),
      consistent: true,
      complete: true,
      explanations: [],
    };
  });

  protected readonly globalExplanations = computed<Explanation[]>(() => {
    const global = this.store.global();
    const example = this.store.example();
    return [
      ...global.missing.map((missing) => explainMissingCapability(example, missing)),
      ...global.ruleViolations.map((violation) => explainRuleViolation(example, violation)),
    ];
  });

  /**
   * Multiplies the zoom by `factor`, keeping the point at (`anchorX`,
   * `anchorY`) — viewport-relative pixels, the center by default — fixed on
   * screen. Leaving "Fit" starts from the fitted scale so nothing jumps.
   */
  protected zoomBy(factor: number, viewport: HTMLElement, anchorX = viewport.clientWidth / 2, anchorY = viewport.clientHeight / 2): void {
    const tree = viewport.querySelector('svg');
    const naturalWidth = tree?.viewBox.baseVal.width ?? 0;
    const current = this.zoom() ?? (tree && naturalWidth ? tree.getBoundingClientRect().width / naturalWidth : 1);
    const next = Math.min(this.maxZoom, Math.max(this.minZoom, current * factor));
    const contentX = (viewport.scrollLeft + anchorX) / current;
    const contentY = (viewport.scrollTop + anchorY) / current;
    this.zoom.set(next);
    requestAnimationFrame(() => {
      viewport.scrollLeft = contentX * next - anchorX;
      viewport.scrollTop = contentY * next - anchorY;
    });
  }

  protected onWheel(event: WheelEvent, viewport: HTMLElement): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    this.zoomBy(event.deltaY < 0 ? this.zoomStep : 1 / this.zoomStep, viewport, event.clientX - rect.left, event.clientY - rect.top);
  }

  protected onPanStart(event: PointerEvent, viewport: HTMLElement): void {
    if (this.zoom() === null || event.button !== 0) return;
    this.panOrigin = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    this.panning.set(true);
  }

  protected onPanMove(event: PointerEvent, viewport: HTMLElement): void {
    if (!this.panOrigin) return;
    viewport.scrollLeft = this.panOrigin.left - (event.clientX - this.panOrigin.x);
    viewport.scrollTop = this.panOrigin.top - (event.clientY - this.panOrigin.y);
  }

  protected onPanEnd(event: PointerEvent, viewport: HTMLElement): void {
    if (!this.panOrigin) return;
    this.panOrigin = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    this.panning.set(false);
  }

  onToggle(ref: FeatureRef): void {
    this.store.toggle(ref);
  }

  onScopeSelect(modelId: ModelId | null): void {
    this.store.setScope(modelId);
  }

  onModelActiveChange(event: { modelId: ModelId; active: boolean }): void {
    this.store.setModelActive(event.modelId, event.active);
  }

  loadPreset(id: string): void {
    this.store.loadPreset(id);
  }

  setMode(mode: Mode): void {
    this.store.setMode(mode);
  }

  reset(): void {
    this.store.reset();
  }

  async copyLink(): Promise<void> {
    const example = this.store.example();
    const cfg = encodeSelection(example, this.store.manual());
    const url = new URL(window.location.href);
    url.searchParams.set('cfg', cfg);
    url.searchParams.set('mode', this.store.mode());
    const scope = this.store.activeScope();
    if (scope) url.searchParams.set('scope', scope);
    else url.searchParams.delete('scope');

    const text = url.toString();

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        this.shareStatus.set('copied');
        this.shareLink.set(null);
        setTimeout(() => this.shareStatus.set('idle'), 2000);
        return;
      } catch {
        // fall through to manual fallback
      }
    }

    this.shareStatus.set('manual');
    this.shareLink.set(text);
  }

  selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  toggleListView(): void {
    this.listView.update((v) => !v);
  }
}

import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FeatureTree } from '../../ui/feature-tree';
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
  imports: [FeatureTree, Legend, DecentralizedView, RouterLink, TourAnchorDirective],
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

  onToggle(ref: FeatureRef): void {
    this.store.toggle(ref);
  }

  onScopeSelect(modelId: ModelId | null): void {
    this.store.setScope(modelId);
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
}

import { Injectable, computed, signal } from '@angular/core';
import type {
  Example,
  ExampleId,
  FeatureId,
  FeatureRef,
  ModelId,
  Selection,
} from '../model/feature-model.types';
import { EMPTY_SELECTION, modelById } from '../model/feature-model.types';
import { aggregate } from '../engine/capabilities';
import { centralize } from '../engine/centralize';
import { explain, type Explanation } from '../engine/explain';
import { propagateAll } from '../engine/propagate';
import { resolveGlobal } from '../engine/resolver';
import { checkAllLocal } from '../engine/validity';
import { EXAMPLES } from '../../data/examples';
import { removeWithDescendants, sanitizeModelManual, sanitizeSelection } from './sanitize';

export type Mode = 'centralized' | 'decentralized';

export interface ToggleResult {
  readonly ok: boolean;
  readonly reason?: Explanation;
}

/**
 * Holds only the manual selection. Everything else — propagation, local
 * validity, the capability ledger, the global resolver result, the
 * centralized equivalent — is `computed`, so it is always in sync and
 * always cheap to recompute (the phone example's largest model enumerates
 * in well under a millisecond).
 */
@Injectable({ providedIn: 'root' })
export class ConfigStore {
  private readonly _exampleId = signal<ExampleId>('phone');
  private readonly _mode = signal<Mode>('centralized');
  private readonly _activeScope = signal<ModelId | null>(null);
  private readonly _manual = signal<Selection>(EMPTY_SELECTION);
  /** Model ids excluded from the current configuration. Only meaningful when the example sets `modelsAreOptional`. */
  private readonly _excludedModelIds = signal<ReadonlySet<ModelId>>(new Set());

  readonly exampleId = this._exampleId.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly activeScope = this._activeScope.asReadonly();
  readonly manual = this._manual.asReadonly();
  readonly excludedModelIds = this._excludedModelIds.asReadonly();

  readonly example = computed<Example>(() => EXAMPLES[this._exampleId()]);

  /** The example as it actually participates in analysis — excluded models removed entirely, as if those repos don't exist. */
  readonly activeExample = computed<Example>(() => {
    const example = this.example();
    const excluded = this._excludedModelIds();
    if (!example.modelsAreOptional || excluded.size === 0) return example;
    return { ...example, models: example.models.filter((model) => !excluded.has(model.id)) };
  });

  readonly propagation = computed(() => propagateAll(this.activeExample(), this.manual()));
  readonly selection = computed(() => this.propagation().selection);
  readonly localResults = computed(() => checkAllLocal(this.activeExample(), this.selection()));
  readonly ledger = computed(() => aggregate(this.activeExample(), this.selection()));
  readonly global = computed(() => resolveGlobal(this.activeExample(), this.selection()));
  readonly centralizedEquivalent = computed(() => centralize(this.activeExample()));

  setExample(id: ExampleId): void {
    if (!EXAMPLES[id]) return;
    this._exampleId.set(id);
    this._manual.set(EMPTY_SELECTION);
    this._activeScope.set(null);
    this._excludedModelIds.set(new Set());
  }

  /** Only meaningful for examples with `modelsAreOptional` — elsewhere every model is always active. */
  setModelActive(modelId: ModelId, active: boolean): void {
    const next = new Set(this._excludedModelIds());
    if (active) next.delete(modelId);
    else next.add(modelId);
    this._excludedModelIds.set(next);
  }

  setMode(mode: Mode): void {
    this._mode.set(mode);
  }

  setScope(modelId: ModelId | null): void {
    this._activeScope.set(modelId);
  }

  /**
   * Selecting adds the feature; deselecting removes it and every manual
   * selection in its subtree. Refuses — with a reason, never silently —
   * any write outside the active scope. This is the enforcement point for
   * "no change ever crosses a scope boundary," which is why it lives here
   * and not in a template.
   */
  toggle(ref: FeatureRef): ToggleResult {
    const scope = this._activeScope();
    if (scope !== null && scope !== ref.modelId) {
      return {
        ok: false,
        reason: explain({
          code: 'E_SCOPE_BOUNDARY',
          detail: 'No change ever crosses a scope boundary. Switch scopes to edit this model.',
          models: [scope, ref.modelId],
        }),
      };
    }

    const example = this.example();
    const model = modelById(example, ref.modelId);
    const current = this._manual();
    const modelManual = new Set(current.get(ref.modelId) ?? []);

    if (modelManual.has(ref.featureId)) {
      removeWithDescendants(model, ref.featureId, modelManual);
    } else {
      modelManual.add(ref.featureId);
    }

    const next = new Map(current);
    next.set(ref.modelId, sanitizeModelManual(model, modelManual));
    this._manual.set(sanitizeSelection(example, next));
    return { ok: true };
  }

  reset(): void {
    this._manual.set(EMPTY_SELECTION);
  }

  /** Replaces the manual selection wholesale — used when applying a decoded share link. */
  loadSelection(selection: Selection): void {
    this._manual.set(sanitizeSelection(this.example(), selection));
  }

  loadPreset(presetId: string): void {
    const example = this.example();
    const preset = example.presets.find((p) => p.id === presetId);
    if (!preset) return;

    const next = new Map<ModelId, ReadonlySet<FeatureId>>();
    for (const [modelId, ids] of Object.entries(preset.selection)) {
      next.set(modelId, new Set(ids));
    }
    this._manual.set(sanitizeSelection(example, next));
  }
}

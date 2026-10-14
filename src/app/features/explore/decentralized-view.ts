import { Component, computed, input, output } from '@angular/core';
import { FeatureTree } from '../../ui/feature-tree';
import { FeatureTreeList } from '../../ui/feature-tree-list';
import { ValidityBadge } from '../../ui/validity-badge';
import { ExplanationList } from '../../ui/explanation-list';
import { CapabilityLane } from '../../ui/capability-lane';
import { TourAnchorDirective } from '../../core/tour/tour-anchor.directive';
import type { CapabilityLedger } from '../../core/engine/capabilities';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation, Propagation } from '../../core/engine/propagate';
import type { GlobalResult } from '../../core/engine/resolver';
import type { LocalValidity } from '../../core/engine/validity';
import type { Example, FeatureId, FeatureModel, FeatureRef, ModelId } from '../../core/model/feature-model.types';

interface ModelCardView {
  readonly model: FeatureModel;
  readonly active: boolean;
  /** Null exactly when the model is excluded — nothing was computed for it. */
  readonly propagation: ModelPropagation | null;
  readonly localValidity: LocalValidity | null;
}

/**
 * All of an example's decentralized scopes side by side, plus the shared
 * capability lane and the global resolver's verdict — the single screen
 * that makes "these models coexist without a shared instance" visible.
 * Presentational: every input is data the page already had from
 * ConfigStore; this component computes no engine state of its own.
 *
 * `example` is always the FULL example (every model rendered as a card,
 * even excluded ones, so they can be switched back on) — `propagation`,
 * `localResults`, `ledger`, and `global` are computed against whatever
 * subset is currently active, per ConfigStore.activeExample.
 */
@Component({
  selector: 'app-decentralized-view',
  imports: [FeatureTree, FeatureTreeList, ValidityBadge, ExplanationList, CapabilityLane, TourAnchorDirective],
  templateUrl: './decentralized-view.html',
  styleUrl: './decentralized-view.scss',
})
export class DecentralizedView {
  readonly example = input.required<Example>();
  readonly propagation = input.required<Propagation>();
  readonly localResults = input.required<ReadonlyMap<ModelId, LocalValidity>>();
  readonly ledger = input.required<CapabilityLedger>();
  readonly global = input.required<GlobalResult>();
  readonly globalExplanations = input.required<readonly Explanation[]>();
  readonly activeScope = input<ModelId | null>(null);
  readonly listView = input(false);
  readonly excludedModelIds = input<ReadonlySet<ModelId>>(new Set());

  readonly toggle = output<FeatureRef>();
  readonly scopeSelect = output<ModelId | null>();
  readonly modelActiveChange = output<{ modelId: ModelId; active: boolean }>();

  readonly modelsAreOptional = computed(() => this.example().modelsAreOptional === true);

  readonly cards = computed<ModelCardView[]>(() => {
    const propagation = this.propagation();
    const localResults = this.localResults();
    const excluded = this.excludedModelIds();
    return this.example().models.map((model) => {
      const active = !excluded.has(model.id);
      return {
        model,
        active,
        propagation: active ? (propagation.byModel.get(model.id) ?? null) : null,
        localValidity: active ? (localResults.get(model.id) ?? null) : null,
      };
    });
  });

  isEditing(modelId: ModelId): boolean {
    return this.activeScope() === modelId;
  }

  isLockedOut(modelId: ModelId): boolean {
    const scope = this.activeScope();
    return scope !== null && scope !== modelId;
  }

  onLockToggle(modelId: ModelId): void {
    this.scopeSelect.emit(this.activeScope() === modelId ? null : modelId);
  }

  onToggle(modelId: ModelId, featureId: FeatureId): void {
    this.toggle.emit({ modelId, featureId });
  }

  onActiveToggle(modelId: ModelId, active: boolean): void {
    this.modelActiveChange.emit({ modelId, active });
  }
}

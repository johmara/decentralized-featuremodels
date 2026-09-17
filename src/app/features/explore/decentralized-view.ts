import { Component, computed, input, output } from '@angular/core';
import { FeatureTree } from '../../ui/feature-tree';
import { ValidityBadge } from '../../ui/validity-badge';
import { ExplanationList } from '../../ui/explanation-list';
import { CapabilityLane } from '../../ui/capability-lane';
import type { CapabilityLedger } from '../../core/engine/capabilities';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation, Propagation } from '../../core/engine/propagate';
import type { GlobalResult } from '../../core/engine/resolver';
import type { LocalValidity } from '../../core/engine/validity';
import type { Example, FeatureId, FeatureModel, FeatureRef, ModelId } from '../../core/model/feature-model.types';

interface ModelCardView {
  readonly model: FeatureModel;
  readonly propagation: ModelPropagation;
  readonly localValidity: LocalValidity;
}

/**
 * All of an example's decentralized scopes side by side, plus the shared
 * capability lane and the global resolver's verdict — the single screen
 * that makes "these models coexist without a shared instance" visible.
 * Presentational: every input is data the page already had from
 * ConfigStore; this component computes no engine state of its own.
 */
@Component({
  selector: 'app-decentralized-view',
  imports: [FeatureTree, ValidityBadge, ExplanationList, CapabilityLane],
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

  readonly toggle = output<FeatureRef>();
  readonly scopeSelect = output<ModelId | null>();

  readonly cards = computed<ModelCardView[]>(() => {
    const propagation = this.propagation();
    const localResults = this.localResults();
    return this.example().models.map((model) => ({
      model,
      propagation: propagation.byModel.get(model.id)!,
      localValidity: localResults.get(model.id)!,
    }));
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
}

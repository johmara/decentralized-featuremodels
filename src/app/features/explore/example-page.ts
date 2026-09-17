import { Component, computed, effect, inject, input } from '@angular/core';
import { FeatureTree } from '../../ui/feature-tree';
import { ValidityBadge } from '../../ui/validity-badge';
import { ExplanationList } from '../../ui/explanation-list';
import { Legend } from '../../ui/legend';
import { ConfigStore, type Mode } from '../../core/state/config.store';
import { explainMissingCapability, explainRuleViolation } from '../../core/engine/resolver';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation } from '../../core/engine/propagate';
import type { ModelId } from '../../core/model/feature-model.types';

@Component({
  selector: 'app-example-page',
  imports: [FeatureTree, ValidityBadge, ExplanationList, Legend],
  templateUrl: './example-page.html',
  styleUrl: './example-page.scss',
})
export class ExamplePage {
  readonly exampleId = input<string>('phone');

  protected readonly store = inject(ConfigStore);

  private readonly syncExample = effect(() => {
    this.store.setExample(this.exampleId());
  });

  protected readonly activeModelId = computed<ModelId>(
    () => this.store.activeScope() ?? this.store.example().models[0].id,
  );

  protected readonly activeModel = computed(
    () => this.store.example().models.find((model) => model.id === this.activeModelId())!,
  );

  protected readonly activePropagation = computed(
    () => this.store.propagation().byModel.get(this.activeModelId())!,
  );

  protected readonly activeLocalValidity = computed(
    () => this.store.localResults().get(this.activeModelId())!,
  );

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

  selectScope(modelId: ModelId): void {
    this.store.setScope(modelId);
  }

  onToggle(featureId: string): void {
    this.store.toggle({ modelId: this.activeModelId(), featureId });
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
}

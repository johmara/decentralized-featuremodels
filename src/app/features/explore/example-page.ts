import { Component, computed, effect, inject, input } from '@angular/core';
import { FeatureTree } from '../../ui/feature-tree';
import { Legend } from '../../ui/legend';
import { DecentralizedView } from './decentralized-view';
import { ConfigStore, type Mode } from '../../core/state/config.store';
import { explainMissingCapability, explainRuleViolation } from '../../core/engine/resolver';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation } from '../../core/engine/propagate';
import type { FeatureRef, ModelId } from '../../core/model/feature-model.types';

@Component({
  selector: 'app-example-page',
  imports: [FeatureTree, Legend, DecentralizedView],
  templateUrl: './example-page.html',
  styleUrl: './example-page.scss',
})
export class ExamplePage {
  readonly exampleId = input<string>('phone');

  protected readonly store = inject(ConfigStore);

  private readonly syncExample = effect(() => {
    this.store.setExample(this.exampleId());
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
}

import { Component, computed, inject, signal } from '@angular/core';
import { FeatureTree } from '../../ui/feature-tree';
import { DecentralizedView } from '../explore/decentralized-view';
import { SandboxStore } from '../../core/state/sandbox.store';
import { aggregate } from '../../core/engine/capabilities';
import { explainMissingCapability, explainRuleViolation, resolveGlobal } from '../../core/engine/resolver';
import { checkAllLocal } from '../../core/engine/validity';
import { propagateAll } from '../../core/engine/propagate';
import type { Explanation } from '../../core/engine/explain';
import type { ModelPropagation } from '../../core/engine/propagate';
import type { FeatureKind } from '../../core/engine/sandbox-edit';
import type { FeatureId, FeatureModel, FeatureRef, ModelId, Selection } from '../../core/model/feature-model.types';

const COLOR_TOKENS = ['--team-messaging', '--team-connectivity', '--team-keyboard', '--team-storage', '--surface-muted'];

@Component({
  selector: 'app-sandbox-page',
  imports: [FeatureTree, DecentralizedView],
  templateUrl: './sandbox-page.html',
  styleUrl: './sandbox-page.scss',
})
export class SandboxPage {
  protected readonly sandbox = inject(SandboxStore);
  protected readonly example = this.sandbox.example;

  protected readonly activeScope = signal<ModelId | null>(null);
  private readonly manual = signal<Selection>(new Map());

  protected readonly propagation = computed(() => propagateAll(this.example(), this.manual()));
  protected readonly localResults = computed(() => checkAllLocal(this.example(), this.propagation().selection));
  protected readonly ledger = computed(() => aggregate(this.example(), this.propagation().selection));
  protected readonly global = computed(() => resolveGlobal(this.example(), this.propagation().selection));

  protected readonly globalExplanations = computed<Explanation[]>(() => {
    const global = this.global();
    const example = this.example();
    return [
      ...global.missing.map((missing) => explainMissingCapability(example, missing)),
      ...global.ruleViolations.map((violation) => explainRuleViolation(example, violation)),
    ];
  });

  structurePropagation(model: FeatureModel): ModelPropagation {
    const rootOnly = new Set<FeatureId>([model.rootId]);
    return {
      modelId: model.id,
      manual: new Set(),
      selection: rootOnly,
      derived: rootOnly,
      dead: new Set(),
      consistent: true,
      complete: true,
      explanations: [],
    };
  }

  onToggle(ref: FeatureRef): void {
    const scope = this.activeScope();
    if (scope !== null && scope !== ref.modelId) return;
    const current = new Map(this.manual());
    const set = new Set(current.get(ref.modelId) ?? []);
    if (set.has(ref.featureId)) set.delete(ref.featureId);
    else set.add(ref.featureId);
    current.set(ref.modelId, set);
    this.manual.set(current);
  }

  onScopeSelect(modelId: ModelId | null): void {
    this.activeScope.set(modelId);
  }

  onAddScope(
    event: Event,
    idInput: HTMLInputElement,
    nameInput: HTMLInputElement,
    assetInput: HTMLInputElement,
    ownerInput: HTMLInputElement,
  ): void {
    event.preventDefault();
    const id = idInput.value.trim();
    if (!id) return;
    this.sandbox.addScope({
      id,
      name: nameInput.value.trim() || id,
      assetPath: assetInput.value.trim() || `${id}/`,
      ownerLabel: ownerInput.value.trim() || 'You',
      colorToken: COLOR_TOKENS[this.example().models.length % COLOR_TOKENS.length],
    });
    idInput.value = '';
    nameInput.value = '';
    assetInput.value = '';
    ownerInput.value = '';
  }

  onAddFeature(
    event: Event,
    modelId: ModelId,
    idInput: HTMLInputElement,
    nameInput: HTMLInputElement,
    parentSelect: HTMLSelectElement,
    kindSelect: HTMLSelectElement,
    requiresSelect: HTMLSelectElement,
    providesSelect: HTMLSelectElement,
  ): void {
    event.preventDefault();
    const id = idInput.value.trim();
    if (!id) return;
    this.sandbox.addFeature(modelId, {
      id,
      name: nameInput.value.trim() || id,
      parentId: parentSelect.value,
      kind: kindSelect.value as FeatureKind,
      requires: selectedValues(requiresSelect),
      provides: selectedValues(providesSelect),
    });
    idInput.value = '';
    nameInput.value = '';
  }

  onAddCapability(event: Event, idInput: HTMLInputElement, nameInput: HTMLInputElement, descInput: HTMLInputElement): void {
    event.preventDefault();
    const id = idInput.value.trim();
    if (!id) return;
    this.sandbox.addCapability({ id, name: nameInput.value.trim() || id, description: descInput.value.trim() });
    idInput.value = '';
    nameInput.value = '';
    descInput.value = '';
  }

  onAddRule(event: Event, aSelect: HTMLSelectElement, bSelect: HTMLSelectElement, whyInput: HTMLInputElement): void {
    event.preventDefault();
    if (!aSelect.value || !bSelect.value) return;
    this.sandbox.addMutexRule(aSelect.value, bSelect.value, whyInput.value.trim() || 'These cannot both be provided.');
    whyInput.value = '';
  }

  onReset(): void {
    this.sandbox.reset();
    this.manual.set(new Map());
    this.activeScope.set(null);
  }

  downloadJson(): void {
    const blob = new Blob([this.sandbox.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sandbox-model.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.sandbox.importJson(reader.result);
    };
    reader.readAsText(file);
    input.value = '';
  }
}

function selectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

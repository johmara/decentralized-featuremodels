import { Component, computed, inject, signal } from '@angular/core';
import { DecentralizedView } from '../explore/decentralized-view';
import { SandboxStore } from '../../core/state/sandbox.store';
import { aggregate } from '../../core/engine/capabilities';
import { explainMissingCapability, explainRuleViolation, resolveGlobal } from '../../core/engine/resolver';
import { checkAllLocal } from '../../core/engine/validity';
import { propagateAll } from '../../core/engine/propagate';
import type { Explanation } from '../../core/engine/explain';
import { featureKindOf, suggestCapabilityId, suggestFeatureId, suggestScopeId, type FeatureKind } from '../../core/engine/sandbox-edit';
import { EXAMPLES, EXAMPLE_IDS } from '../../data/examples';
import type { CapabilityId, Example, Feature, FeatureId, FeatureModel, FeatureRef, ModelId, Selection } from '../../core/model/feature-model.types';

const COLOR_TOKENS = ['--team-messaging', '--team-connectivity', '--team-keyboard', '--team-storage', '--surface-muted'];

@Component({
  selector: 'app-sandbox-page',
  imports: [DecentralizedView],
  templateUrl: './sandbox-page.html',
  styleUrl: './sandbox-page.scss',
})
export class SandboxPage {
  protected readonly sandbox = inject(SandboxStore);
  protected readonly example = this.sandbox.example;

  protected readonly activeScope = signal<ModelId | null>(null);

  protected readonly exampleIds = EXAMPLE_IDS;
  protected readonly exampleTitle = (id: string): string => EXAMPLES[id]?.title ?? id;

  protected readonly kinds: readonly { value: FeatureKind; label: string }[] = [
    { value: 'mandatory', label: 'Mandatory' },
    { value: 'optional', label: 'Optional' },
    { value: 'or', label: 'OR group' },
    { value: 'xor', label: 'XOR group' },
  ];
  protected readonly directions = ['requires', 'provides'] as const;

  /** The feature open in the inspector, if any. */
  protected readonly selected = signal<FeatureRef | null>(null);
  private readonly manual = signal<Selection>(new Map());
  /** Scopes left out of the configuration. Always available in the sandbox, whatever the example says. */
  protected readonly excludedModelIds = signal<ReadonlySet<ModelId>>(new Set());

  /** The example as analysis sees it — excluded scopes removed, as if they did not exist. */
  private readonly activeExample = computed<Example>(() => {
    const example = this.example();
    const excluded = this.excludedModelIds();
    if (excluded.size === 0) return example;
    return { ...example, models: example.models.filter((model) => !excluded.has(model.id)) };
  });

  protected readonly propagation = computed(() => propagateAll(this.activeExample(), this.manual()));
  protected readonly localResults = computed(() => checkAllLocal(this.activeExample(), this.propagation().selection));
  protected readonly ledger = computed(() => aggregate(this.activeExample(), this.propagation().selection));
  protected readonly global = computed(() => resolveGlobal(this.activeExample(), this.propagation().selection));

  protected readonly globalExplanations = computed<Explanation[]>(() => {
    const global = this.global();
    const example = this.example();
    return [
      ...global.missing.map((missing) => explainMissingCapability(example, missing)),
      ...global.ruleViolations.map((violation) => explainRuleViolation(example, violation)),
    ];
  });

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

  onModelActiveChange(change: { modelId: ModelId; active: boolean }): void {
    this.setIncluded(change.modelId, change.active);
  }

  setIncluded(modelId: ModelId, included: boolean): void {
    const next = new Set(this.excludedModelIds());
    if (included) next.delete(modelId);
    else next.add(modelId);
    this.excludedModelIds.set(next);
    if (!included && this.activeScope() === modelId) this.activeScope.set(null);
  }

  onScopeSelect(modelId: ModelId | null): void {
    this.activeScope.set(modelId);
  }

  select(modelId: ModelId, featureId: FeatureId): void {
    const current = this.selected();
    const same = current?.modelId === modelId && current.featureId === featureId;
    this.selected.set(same ? null : { modelId, featureId });
  }

  selectedIn(model: FeatureModel): Feature | null {
    const selected = this.selected();
    if (!selected || selected.modelId !== model.id) return null;
    return model.features[selected.featureId] ?? null;
  }

  kindOf(model: FeatureModel, featureId: FeatureId): FeatureKind {
    return featureKindOf(model, featureId);
  }

  hasCapability(feature: Feature, direction: 'requires' | 'provides', capabilityId: CapabilityId): boolean {
    return feature[direction]?.includes(capabilityId) ?? false;
  }

  toggleCapability(modelId: ModelId, feature: Feature, direction: 'requires' | 'provides', capabilityId: CapabilityId): void {
    const current = feature[direction] ?? [];
    const next = current.includes(capabilityId) ? current.filter((id) => id !== capabilityId) : [...current, capabilityId];
    if (direction === 'requires') this.sandbox.setRequires(modelId, feature.id, next);
    else this.sandbox.setProvides(modelId, feature.id, next);
  }

  onNewCapability(event: Event, modelId: ModelId, featureId: FeatureId, direction: 'requires' | 'provides', input: HTMLInputElement): void {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    this.sandbox.createCapabilityOn(modelId, featureId, direction, name);
    input.value = '';
  }

  onAddScope(event: Event, nameInput: HTMLInputElement): void {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const id = suggestScopeId(this.example(), name);
    this.sandbox.addScope({
      id,
      name,
      assetPath: `${id}/`,
      ownerLabel: `${name} team`,
      colorToken: COLOR_TOKENS[this.example().models.length % COLOR_TOKENS.length],
    });
    if (this.sandbox.lastError()) return;
    nameInput.value = '';
    const model = this.example().models.find((m) => m.id === id);
    if (model) this.selected.set({ modelId: id, featureId: model.rootId });
  }

  onRemoveScope(modelId: ModelId): void {
    this.sandbox.removeScope(modelId);
    if (this.selected()?.modelId === modelId) this.selected.set(null);
  }

  onAddChild(event: Event, model: FeatureModel, parentId: FeatureId, nameInput: HTMLInputElement, kindSelect: HTMLSelectElement): void {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const id = suggestFeatureId(model, name);
    this.sandbox.addFeature(model.id, { id, name, parentId, kind: kindSelect.value as FeatureKind });
    if (this.sandbox.lastError()) return;
    nameInput.value = '';
    nameInput.focus();
  }

  onRemoveFeature(modelId: ModelId, featureId: FeatureId, parentId: FeatureId): void {
    this.sandbox.removeFeature(modelId, featureId);
    if (!this.sandbox.lastError()) this.selected.set({ modelId, featureId: parentId });
  }

  onAddCapability(event: Event, nameInput: HTMLInputElement, descInput: HTMLInputElement): void {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    this.sandbox.addCapability({ id: suggestCapabilityId(this.example(), name), name, description: descInput.value.trim() });
    nameInput.value = '';
    descInput.value = '';
  }

  /** Replaces the sandbox with a copy of a shipped example, as one undoable step. */
  startFrom(exampleId: string): void {
    const source = EXAMPLES[exampleId];
    if (!source) return;
    const copy: Example = { ...structuredClone(source), id: 'sandbox', presets: [], centralized: undefined };
    this.sandbox.loadExample(copy);
    this.manual.set(new Map());
    this.activeScope.set(null);
    this.selected.set(null);
    this.excludedModelIds.set(new Set());
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
    this.selected.set(null);
    this.excludedModelIds.set(new Set());
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

import { Injectable, computed, signal } from '@angular/core';
import {
  SandboxEditError,
  addCapability,
  addFeature,
  addMutexRule,
  addScope,
  emptySandboxExample,
  removeCapability,
  removeFeature,
  removeGlobalRule,
  removeScope,
  setFeatureCapabilities,
  type AddFeatureInput,
  type AddScopeInput,
} from '../engine/sandbox-edit';
import { validateExample } from '../engine/validate-example';
import type { Capability, CapabilityId, Example, FeatureId, ModelId } from '../model/feature-model.types';

const STORAGE_KEY = 'dfm.sandbox.v1';

/**
 * A bounded undo/redo history over `Example` snapshots. Sandbox models are
 * small (tens of features), so structural sharing between snapshots isn't
 * worth the complexity — plain array-of-snapshots is simple and correct.
 */
@Injectable({ providedIn: 'root' })
export class SandboxStore {
  private readonly history = signal<Example[]>([this.loadInitial()]);
  private readonly pointer = signal(0);

  readonly example = computed(() => this.history()[this.pointer()]);
  readonly canUndo = computed(() => this.pointer() > 0);
  readonly canRedo = computed(() => this.pointer() < this.history().length - 1);
  readonly structuralErrors = computed(() => validateExample(this.example()));

  readonly lastError = signal<string | null>(null);

  private loadInitial(): Example {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Example;
    } catch {
      // fall through to a fresh sandbox
    }
    return emptySandboxExample();
  }

  private persist(example: Example): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(example));
    } catch {
      // localStorage may be unavailable (private browsing, quota) - undo/redo still works in-memory
    }
  }

  private commit(next: Example): void {
    const truncated = this.history().slice(0, this.pointer() + 1);
    this.history.set([...truncated, next]);
    this.pointer.set(truncated.length);
    this.lastError.set(null);
    this.persist(next);
  }

  private guarded(fn: () => Example): void {
    try {
      this.commit(fn());
    } catch (error) {
      this.lastError.set(error instanceof SandboxEditError ? error.message : 'Something went wrong.');
    }
  }

  undo(): void {
    if (this.canUndo()) this.pointer.update((p) => p - 1);
  }

  redo(): void {
    if (this.canRedo()) this.pointer.update((p) => p + 1);
  }

  reset(): void {
    const fresh = emptySandboxExample();
    this.history.set([fresh]);
    this.pointer.set(0);
    this.lastError.set(null);
    this.persist(fresh);
  }

  loadExample(example: Example): void {
    this.commit(example);
  }

  exportJson(): string {
    return JSON.stringify(this.example(), null, 2);
  }

  importJson(text: string): void {
    try {
      const parsed = JSON.parse(text) as Example;
      if (!parsed || !Array.isArray(parsed.models) || !Array.isArray(parsed.capabilities)) {
        throw new Error('not a valid example file');
      }
      this.commit(parsed);
    } catch {
      this.lastError.set('Could not import that file — it is not valid JSON for an example.');
    }
  }

  addScope(input: AddScopeInput): void {
    this.guarded(() => addScope(this.example(), input));
  }

  removeScope(modelId: ModelId): void {
    this.guarded(() => removeScope(this.example(), modelId));
  }

  addFeature(modelId: ModelId, input: AddFeatureInput): void {
    this.guarded(() => addFeature(this.example(), modelId, input));
  }

  removeFeature(modelId: ModelId, featureId: FeatureId): void {
    this.guarded(() => removeFeature(this.example(), modelId, featureId));
  }

  setRequires(modelId: ModelId, featureId: FeatureId, capabilityIds: readonly CapabilityId[]): void {
    this.guarded(() => setFeatureCapabilities(this.example(), modelId, featureId, 'requires', capabilityIds));
  }

  setProvides(modelId: ModelId, featureId: FeatureId, capabilityIds: readonly CapabilityId[]): void {
    this.guarded(() => setFeatureCapabilities(this.example(), modelId, featureId, 'provides', capabilityIds));
  }

  addCapability(input: Capability): void {
    this.guarded(() => addCapability(this.example(), input));
  }

  removeCapability(capabilityId: CapabilityId): void {
    this.guarded(() => removeCapability(this.example(), capabilityId));
  }

  addMutexRule(a: CapabilityId, b: CapabilityId, rationale: string): void {
    this.guarded(() => addMutexRule(this.example(), a, b, rationale));
  }

  removeGlobalRule(index: number): void {
    this.guarded(() => removeGlobalRule(this.example(), index));
  }
}

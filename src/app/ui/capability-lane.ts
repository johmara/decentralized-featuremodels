import { Component, computed, input } from '@angular/core';
import type { CapabilityLedger } from '../core/engine/capabilities';
import type { MissingCapability } from '../core/engine/resolver';
import type { Capability, Example, ModelId } from '../core/model/feature-model.types';

export type CapabilityStatus = 'satisfied' | 'unprovisioned' | 'unprovidable' | 'idle';

export interface CapabilityPillView {
  readonly capability: Capability;
  readonly status: CapabilityStatus;
  readonly requiredByScopes: readonly string[];
  readonly providedByScopes: readonly string[];
  readonly notifyScopes: readonly string[];
}

/**
 * The capability lane — every capability in the example's catalog, colored
 * by whether it is currently satisfied, missing (and by whom it could
 * still be provided), or simply not in play for the current selection.
 * Presentational: takes the ledger and resolver output as data, computes
 * nothing engine-level itself.
 */
@Component({
  selector: 'app-capability-lane',
  templateUrl: './capability-lane.html',
  styleUrl: './capability-lane.scss',
})
export class CapabilityLane {
  readonly example = input.required<Example>();
  readonly ledger = input.required<CapabilityLedger>();
  readonly missing = input.required<readonly MissingCapability[]>();

  readonly pills = computed<CapabilityPillView[]>(() => {
    const example = this.example();
    const ledger = this.ledger();
    const missingByCapability = new Map(this.missing().map((entry) => [entry.capability, entry]));

    return example.capabilities.map((capability) => {
      const missingEntry = missingByCapability.get(capability.id);
      const required = ledger.required.get(capability.id) ?? [];
      const provided = ledger.provided.get(capability.id) ?? [];

      let status: CapabilityStatus;
      if (missingEntry) {
        status = missingEntry.diagnosis;
      } else if (required.length > 0 || provided.length > 0) {
        status = 'satisfied';
      } else {
        status = 'idle';
      }

      return {
        capability,
        status,
        requiredByScopes: uniqueScopeNames(example, required.map((ref) => ref.modelId)),
        providedByScopes: uniqueScopeNames(example, provided.map((ref) => ref.modelId)),
        notifyScopes: missingEntry ? uniqueScopeNames(example, missingEntry.notifyModels) : [],
      };
    });
  });
}

function uniqueScopeNames(example: Example, modelIds: readonly ModelId[]): string[] {
  const names = new Set<string>();
  for (const modelId of modelIds) {
    const model = example.models.find((m) => m.id === modelId);
    if (model) names.add(model.name);
  }
  return [...names];
}

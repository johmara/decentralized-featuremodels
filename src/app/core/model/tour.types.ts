import type { Mode } from '../state/config.store';
import type { FeatureId, ModelId } from './feature-model.types';

/**
 * A step's precondition is ABSOLUTE state, applied wholesale to
 * ConfigStore when the step becomes active — never a delta from the
 * previous step. That is what makes a deep link to step 8 reproduce step
 * 8 exactly without replaying steps 1–7. Reuses ConfigStore's own preset
 * mechanism (`presetId`) where possible; `selection` is the escape hatch
 * for a state no preset covers.
 */
export interface TourStepPrecondition {
  readonly mode?: Mode;
  readonly scope?: ModelId | null;
  readonly presetId?: string;
  readonly selection?: Readonly<Record<ModelId, readonly FeatureId[]>>;
}

export interface TourStep {
  readonly id: string;
  readonly route: string;
  readonly narration: { readonly title: string; readonly body: string };
  /** Single spotlight target per step — keeps attention on one thing at a time. */
  readonly anchor?: string;
  readonly precondition: TourStepPrecondition;
}

export interface Tour {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly TourStep[];
}

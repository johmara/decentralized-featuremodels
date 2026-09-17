import type { FeatureRef, CapabilityId, ModelId } from '../model/feature-model.types';

/**
 * Every violation and every derivation the engine produces carries one of
 * these. Components never construct user-facing strings themselves — they
 * render an Explanation. Keeping the codes centralized here is what makes
 * "no user-facing strings in components" enforceable.
 */
export type ExplanationCode =
  | 'E_ORPHAN_CHILD'
  | 'E_MANDATORY_UNSELECTED'
  | 'E_MANDATORY_SELECTED_WITHOUT_PARENT'
  | 'E_XOR_NONE'
  | 'E_XOR_MULTIPLE'
  | 'E_OR_NONE'
  | 'E_OR_WITHOUT_PARENT'
  | 'E_CONSTRAINT_IMPLIES_VIOLATED'
  | 'E_CONSTRAINT_EXCLUDES_VIOLATED'
  | 'E_CAP_MISSING'
  | 'E_CAP_UNPROVIDABLE'
  | 'E_GLOBAL_RULE_VIOLATED'
  | 'E_SCOPE_BOUNDARY'
  | 'D_MANDATORY_PARENT'
  | 'D_MANDATORY_CHILD'
  | 'D_XOR_LAST_REMAINING'
  | 'D_CONSTRAINT_IMPLIES'
  | 'D_DEAD_FEATURE';

export interface Explanation {
  readonly code: ExplanationCode;
  readonly title: string;
  readonly detail: string;
  /** Section of the paper this rule traces back to, shown as a footnote link. */
  readonly paperRef?: string;
  readonly involves?: readonly FeatureRef[];
  readonly capability?: CapabilityId;
  readonly models?: readonly ModelId[];
}

interface ExplainInput {
  readonly code: ExplanationCode;
  readonly detail: string;
  readonly paperRef?: string;
  readonly involves?: readonly FeatureRef[];
  readonly capability?: CapabilityId;
  readonly models?: readonly ModelId[];
}

const TITLES: Record<ExplanationCode, string> = {
  E_ORPHAN_CHILD: 'Selected without its parent',
  E_MANDATORY_UNSELECTED: 'Mandatory feature not selected',
  E_MANDATORY_SELECTED_WITHOUT_PARENT: 'Mandatory feature requires its parent',
  E_XOR_NONE: 'No alternative chosen',
  E_XOR_MULTIPLE: 'More than one alternative chosen',
  E_OR_NONE: 'No option chosen',
  E_OR_WITHOUT_PARENT: 'Group selected without its parent',
  E_CONSTRAINT_IMPLIES_VIOLATED: 'Required feature missing',
  E_CONSTRAINT_EXCLUDES_VIOLATED: 'Excluded features both selected',
  E_CAP_MISSING: 'Capability not provided',
  E_CAP_UNPROVIDABLE: 'No scope can provide this capability',
  E_GLOBAL_RULE_VIOLATED: 'Global rule violated',
  E_SCOPE_BOUNDARY: 'No change ever crosses a scope boundary',
  D_MANDATORY_PARENT: 'Selected because its child is mandatory-selected',
  D_MANDATORY_CHILD: 'Selected because it is a mandatory child',
  D_XOR_LAST_REMAINING: 'Selected — the only remaining alternative',
  D_CONSTRAINT_IMPLIES: 'Selected because a constraint requires it',
  D_DEAD_FEATURE: 'Can never be selected in a valid configuration',
};

/** Construct a fully-formed Explanation from a code plus its variable detail. */
export function explain(input: ExplainInput): Explanation {
  return { title: TITLES[input.code], ...input };
}

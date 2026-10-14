import type {
  CapabilityId,
  Example,
  FeatureRef,
  GlobalRule,
  ModelId,
  Selection,
} from '../model/feature-model.types';
import { aggregate, type CapabilityLedger } from './capabilities';
import { explain, type Explanation } from './explain';
import { checkAllLocal, type LocalValidity } from './validity';

/**
 * The paper's punchline, made a type: when a required capability is
 * missing, `notifyModels` is derived from the capability's *providers*,
 * never from the feature that required it. This is what lets the resolver
 * notify only the scope that can fix the problem.
 */
export interface MissingCapability {
  readonly capability: CapabilityId;
  readonly requiredBy: readonly FeatureRef[];
  readonly potentialProviders: readonly FeatureRef[];
  readonly notifyModels: readonly ModelId[];
  /** 'unprovidable' means no feature anywhere in the example provides this capability — a governance gap, not a configuration mistake. */
  readonly diagnosis: 'unprovisioned' | 'unprovidable';
}

export interface RuleViolation {
  readonly rule: GlobalRule;
  readonly involvedProviders: readonly FeatureRef[];
}

export interface GlobalResult {
  readonly localResults: ReadonlyMap<ModelId, LocalValidity>;
  readonly ledger: CapabilityLedger;
  readonly missing: readonly MissingCapability[];
  readonly ruleViolations: readonly RuleViolation[];
  /** Valid_global = ⋀ᵢ Valid(FMᵢ) ∧ ⋀_{c∈Req} Provided(c) ∧ C_interactions */
  readonly valid: boolean;
}

export function resolveGlobal(example: Example, selection: Selection): GlobalResult {
  const localResults = checkAllLocal(example, selection);
  const ledger = aggregate(example, selection);

  const missing: MissingCapability[] = [];
  for (const [capabilityId, requiredBy] of ledger.required) {
    const providers = ledger.provided.get(capabilityId) ?? [];
    if (providers.length > 0) continue;

    const potentialProviders = ledger.potentialProviders.get(capabilityId) ?? [];
    const notifyModels = [...new Set(potentialProviders.map((p) => p.modelId))];

    missing.push({
      capability: capabilityId,
      requiredBy,
      potentialProviders,
      notifyModels,
      diagnosis: potentialProviders.length === 0 ? 'unprovidable' : 'unprovisioned',
    });
  }

  const ruleViolations: RuleViolation[] = [];
  for (const rule of example.globalRules) {
    const violation = checkRule(rule, ledger);
    if (violation) ruleViolations.push(violation);
  }

  const allLocalValid = [...localResults.values()].every((result) => result.valid);
  const valid = allLocalValid && missing.length === 0 && ruleViolations.length === 0;

  return { localResults, ledger, missing, ruleViolations, valid };
}

function checkRule(rule: GlobalRule, ledger: CapabilityLedger): RuleViolation | null {
  const providersOf = (id: CapabilityId) => ledger.provided.get(id) ?? [];
  switch (rule.kind) {
    case 'capability-mutex': {
      const a = providersOf(rule.a);
      const b = providersOf(rule.b);
      return a.length > 0 && b.length > 0 ? { rule, involvedProviders: [...a, ...b] } : null;
    }
    case 'capability-implies': {
      const a = providersOf(rule.a);
      return a.length > 0 && providersOf(rule.b).length === 0 ? { rule, involvedProviders: a } : null;
    }
    case 'capability-single-provider': {
      const providers = providersOf(rule.capability);
      return providers.length > 1 ? { rule, involvedProviders: providers } : null;
    }
  }
}

function capabilityName(example: Example, id: CapabilityId): string {
  return example.capabilities.find((capability) => capability.id === id)?.name ?? id;
}

export function explainMissingCapability(example: Example, missing: MissingCapability): Explanation {
  const name = capabilityName(example, missing.capability);

  if (missing.diagnosis === 'unprovidable') {
    return explain({
      code: 'E_CAP_UNPROVIDABLE',
      detail: `No feature anywhere in this example provides "${name}". This is a capability-governance gap, not a configuration mistake.`,
      capability: missing.capability,
      involves: missing.requiredBy,
    });
  }

  return explain({
    code: 'E_CAP_MISSING',
    detail: `"${name}" is required but not currently provided.`,
    capability: missing.capability,
    involves: missing.requiredBy,
    models: missing.notifyModels,
  });
}

/** Compact notation over capability ids: `A ≠ B`, `A ⇒ B`, `C ≤ 1 provider`. */
export function globalRuleNotation(rule: GlobalRule): string {
  switch (rule.kind) {
    case 'capability-mutex':
      return `${rule.a} ≠ ${rule.b}`;
    case 'capability-implies':
      return `${rule.a} ⇒ ${rule.b}`;
    case 'capability-single-provider':
      return `${rule.capability} ≤ 1 provider`;
  }
}

/** One-line, human-readable statement of what a rule demands. */
export function describeGlobalRule(example: Example, rule: GlobalRule): string {
  const name = (id: CapabilityId) => `"${capabilityName(example, id)}"`;
  switch (rule.kind) {
    case 'capability-mutex':
      return `${name(rule.a)} cannot coexist with ${name(rule.b)}.`;
    case 'capability-implies':
      return `If ${name(rule.a)} is provided, ${name(rule.b)} must be provided too.`;
    case 'capability-single-provider':
      return `At most one feature may provide ${name(rule.capability)}.`;
  }
}

export function explainRuleViolation(example: Example, violation: RuleViolation): Explanation {
  return explain({
    code: 'E_GLOBAL_RULE_VIOLATED',
    detail: `${describeGlobalRule(example, violation.rule)} ${violation.rule.rationale}`,
    involves: violation.involvedProviders,
  });
}

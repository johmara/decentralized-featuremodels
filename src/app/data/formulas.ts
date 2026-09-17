export interface Formula {
  readonly id: string;
  readonly display: string;
  readonly plainText: string;
  readonly caption: string;
  readonly paperRef: string;
}

/** The paper's own formulas (var2026/motexample.tex), transcribed once and reused everywhere they're shown. */
export const FORMULAS: readonly Formula[] = [
  {
    id: 'provider-disjunction',
    display: 'c ⇒ (p₁ ∨ ⋯ ∨ pₖ)',
    plainText: 'capability c implies at least one of its providers p1 through pk is selected',
    caption: 'A capability with providers p₁...pₖ is satisfied whenever any one of them is selected.',
    paperRef: 'motexample.tex, §3',
  },
  {
    id: 'local-union',
    display: 'C = ⋃ᵢ Cᵢ ∪ C_capabilities',
    plainText: 'the full constraint set is the union of every local constraint set, plus the capability constraints',
    caption: 'Only capability clauses cross model boundaries — every Cᵢ stays inside its own model.',
    paperRef: 'motexample.tex, §3',
  },
  {
    id: 'resolver-set-form',
    display: '∀ c ∈ req : c ∈ prov',
    plainText: 'for every capability required, that capability must be in the set of capabilities provided',
    caption: 'The resolver’s actual check: every required capability has at least one active provider.',
    paperRef: 'motexample.tex, §3',
  },
  {
    id: 'valid-global-simple',
    display: 'Valid_global = ⋀ᵢ Valid(FMᵢ) ∧ ⋀_{c∈Req} Provided(c)',
    plainText:
      'the configuration is globally valid iff every model is locally valid and every required capability is provided',
    caption: 'Global validity, decomposed: local validity per model, plus capability satisfaction.',
    paperRef: 'motexample.tex, §3',
  },
  {
    id: 'valid-global-coordination',
    display: 'Valid_global = ⋀ᵢ Valid(FMᵢ) ∧ C_capabilities ∧ C_interactions',
    plainText:
      'with a coordination layer, global validity adds direct inter-model interaction constraints alongside capability constraints',
    caption: 'C_interactions captures the rare unavoidable direct constraint between two models’ features.',
    paperRef: 'motexample.tex, §3',
  },
  {
    id: 'decomposed-analysis',
    display: 'SAT(FM₁), SAT(FM₂), …, SAT(FMₙ), SAT(C_capabilities)',
    plainText: 'satisfiability is checked per model plus once for the capability constraints, never for one combined model',
    caption: 'Analysis decomposes into n+1 small problems instead of one large one — the scalability argument.',
    paperRef: 'challenges.tex, C6',
  },
];

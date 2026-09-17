export interface ChallengeItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly relatesTo: string;
  readonly demoLink: string;
  readonly demoLabel: string;
}

/** The paper's open research challenges (challenges.tex:14-34), each linked to where the demo bites. */
export const CHALLENGES: readonly ChallengeItem[] = [
  {
    id: 'C1',
    title: 'Decomposition and scoping',
    detail: 'Nothing forces a "natural" split. Choosing where one model ends and another begins is a design decision, not a derivation.',
    relatesTo: 'R1',
    demoLink: '/explore/distro?mode=decentralized',
    demoLabel: 'Six scopes here, four in the phone example — same idea, different granularity',
  },
  {
    id: 'C2',
    title: 'Structuring sub-models',
    detail: 'Should sub-models mirror the asset hierarchy (nested) or sit side by side (orthogonal)? Both appear in the examples.',
    relatesTo: 'R2',
    demoLink: '/explore/enterprise?mode=decentralized',
    demoLabel: 'A strict hierarchy (facade → module → micro API) vs. the phone’s flatter split',
  },
  {
    id: 'C3',
    title: 'Capability management and governance',
    detail: 'Who defines the capability vocabulary? What happens when a required capability has no provider at all?',
    relatesTo: 'R3',
    demoLink: '/explore/distro?mode=decentralized&preset=jffs2-governance-gap',
    demoLabel: 'mtd is required but unprovidable — a governance gap, not a configuration mistake',
  },
  {
    id: 'C4',
    title: 'Model sizing and maintainability',
    detail: 'Too few models and independence disappears; too many and the capability graph between them becomes its own maintenance burden.',
    relatesTo: 'R2',
    demoLink: '/explore/enterprise?mode=decentralized',
    demoLabel: 'Eleven small repos here — the tradeoff made concrete',
  },
  {
    id: 'C5',
    title: 'Managing cross-model dependencies',
    detail: 'Capabilities avoid direct feature-to-feature coupling, but the resulting many-to-many provider graph still needs to stay legible.',
    relatesTo: 'R3',
    demoLink: '/explore/phone?mode=decentralized&preset=missing-internet',
    demoLabel: 'The capability lane, showing every requirer and provider for InternetConnectivity',
  },
  {
    id: 'C6',
    title: 'Scalable distributed analysis',
    detail: 'Local validity per model plus one capability check should scale where reconstructing a monolith would not — but this needs proving beyond small examples.',
    relatesTo: 'R5',
    demoLink: '/compare',
    demoLabel: 'The decomposed-analysis formula, and where the comparison table’s Distributed Config column comes from',
  },
];

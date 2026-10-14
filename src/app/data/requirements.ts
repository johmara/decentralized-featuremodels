export interface RequirementItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly demoLink: string;
  readonly demoLabel: string;
}

/** The paper's derived requirements (challenges.tex:5-10), each linked to where the demo shows it. */
export const REQUIREMENTS: readonly RequirementItem[] = [
  {
    id: 'R1',
    title: 'Explicit scope and placement',
    detail: 'A feature model must declare which real assets it governs, and that placement must be inspectable.',
    demoLink: '/explore/phone?mode=decentralized',
    demoLabel: 'See the four scope cards, each labeled with its asset path and .fm file',
  },
  {
    id: 'R2',
    title: 'Model independence',
    detail: 'Each model must be configurable and evolvable without touching any other model.',
    demoLink: '/explore/phone?mode=decentralized&scope=phone.messaging',
    demoLabel: 'Lock a scope and try editing another card — refused, not just discouraged',
  },
  {
    id: 'R3',
    title: 'Stable cross-model abstractions',
    detail: 'Cross-model dependencies must be expressed through names that outlive any specific feature on either side.',
    demoLink: '/explore/phone?mode=decentralized&preset=comic-email',
    demoLabel: 'Requires(InternetConnectivity), not Requires(Connectivity.Wifi)',
  },
  {
    id: 'R4',
    title: 'Decentralized configuration',
    detail: 'A valid global configuration must be reachable by combining independently-made local decisions, not by editing one shared file.',
    demoLink: '/explore/microservices?mode=decentralized&preset=everything-wired',
    demoLabel: 'Nine services, each configured alone, resolve together',
  },
  {
    id: 'R5',
    title: 'Incremental analysis',
    detail: 'Checking one model’s change should not require re-analyzing every other model.',
    demoLink: '/compare',
    demoLabel: 'SAT(FM₁), …, SAT(FMₙ), SAT(C_capabilities) — the decomposed-analysis formula',
  },
  {
    id: 'R6',
    title: 'Reuse and cloning',
    detail: 'A model must be relocatable or duplicatable into a new scope without dragging in the models it used to sit beside.',
    demoLink: '/explore/microservices?mode=decentralized',
    demoLabel: 'Two Payment services, same capability, different implementations — clone or relocate either without touching the other',
  },
];

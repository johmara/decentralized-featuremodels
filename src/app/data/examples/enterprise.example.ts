/**
 * Example 2 — a layered enterprise platform.
 *
 * This is a SYNTHETIC, generalized example. It reproduces the *shape* of a
 * layered API architecture without naming any real company, customer,
 * tenant, service, or internal repo. Do not treat any identifier here as
 * a real system name.
 *
 * Modeling rules this data follows, deliberately:
 * - Every facade, module API, and micro API is its OWN repo with its OWN
 *   feature model — nothing is lumped together. "API Facade" is not one
 *   model with internal variants; Default, Partner A, and Finance are
 *   three separate repos.
 * - A capability is not the same thing as an API. A repo's identity (its
 *   scope) is independent of which capability or capabilities it exposes.
 * - Facades (frontend or API) and module APIs typically provide MULTIPLE
 *   capabilities each. A micro API should provide exactly ONE.
 * - Multiple micro API repos can provide the SAME capability — different
 *   versions, each its own deployable, each its own scope.
 * - The platform is divided into product lines (Shipment, Finance), each
 *   with its own stack, sharing some scopes (Tracking Number Issuance)
 *   across products via the capability layer, not via a shared repo.
 * - Capabilities are named after business abilities, never after the API
 *   that happens to expose them — "Invoice Audit", not "Invoice API".
 *   A capability can also be something a repo only partly contributes
 *   to: Freight Calculation is provided by both the Execution Module API
 *   (the rating side) and the Finance Module API (the billing side) —
 *   neither one alone "is" Freight Calculation, each is part of it.
 */
import type {
  AssetNode,
  Capability,
  ConfigPreset,
  Example,
  Feature,
  FeatureGroup,
  FeatureModel,
} from '../../core/model/feature-model.types';
import { feature } from './feature-helpers';

const CAPABILITIES: readonly Capability[] = [
  { id: 'ShipmentCreation', name: 'Shipment Creation', description: 'The business ability to create and update a shipment.' },
  { id: 'ShipmentTracking', name: 'Shipment Tracking', description: 'The business ability to report a shipment’s tracking state.' },
  {
    id: 'ShipmentExecution',
    name: 'Shipment Execution',
    description: 'The business ability to actually carry a shipment through to completion — routing, validating, and numbering it.',
  },
  { id: 'CarrierRouting', name: 'Carrier Routing', description: 'Choosing a carrier and service for a shipment.' },
  { id: 'ShipmentValidation', name: 'Shipment Validation', description: 'Checking a shipment against domain rules before it moves.' },
  { id: 'TrackingNumberIssuance', name: 'Tracking Number Issuance', description: 'Issuing tracking number identifiers.' },
  { id: 'InvoiceAudit', name: 'Invoice Audit', description: 'Verifying an invoice’s line items against the shipment they bill for.' },
  { id: 'BillingProposal', name: 'Billing Proposal', description: 'Proposing a billing amount before an invoice is issued.' },
  {
    id: 'FreightCalculation',
    name: 'Freight Calculation',
    description:
      'Determining what a shipment costs to move. No single repo owns this outright — the rating side and the billing side each provide part of it.',
    vocabularyNote: 'Provided jointly by the Execution Module API and the Finance Module API — see the note on either.',
  },
];

// ---------------------------------------------------------------------------
// Product: Shipment
// ---------------------------------------------------------------------------

function frontendShipmentEntryModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ShipmentEntryFacade: feature({
      id: 'ShipmentEntryFacade',
      name: 'Shipment Entry Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['DarkTheme'],
      requires: ['ShipmentCreation'],
    }),
    DarkTheme: feature({ id: 'DarkTheme', name: 'Dark Theme', parentId: 'ShipmentEntryFacade', edge: 'optional' }),
  };
  return {
    id: 'enterprise.frontend.shipment-entry',
    name: 'Shipment Entry Frontend Facade',
    rootId: 'ShipmentEntryFacade',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/frontend-shipment-entry/',
      assetKind: 'repo',
      modelFileName: 'frontend-shipment-entry.fm',
      ownerLabel: 'Shipment Entry Frontend Facade scope',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function frontendTrackingModel(): FeatureModel {
  const features: Record<string, Feature> = {
    TrackingFacade: feature({
      id: 'TrackingFacade',
      name: 'Tracking Facade',
      parentId: null,
      edge: 'mandatory',
      requires: ['ShipmentTracking'],
    }),
  };
  return {
    id: 'enterprise.frontend.tracking',
    name: 'Tracking Frontend Facade',
    rootId: 'TrackingFacade',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/frontend-tracking/',
      assetKind: 'repo',
      modelFileName: 'frontend-tracking.fm',
      ownerLabel: 'Tracking Frontend Facade scope',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

function apiFacadeDefaultModel(): FeatureModel {
  const features: Record<string, Feature> = {
    DefaultApiFacade: feature({
      id: 'DefaultApiFacade',
      name: 'Default API Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Authentication', 'PayloadValidation'],
      provides: ['ShipmentCreation', 'ShipmentTracking'],
      requires: ['ShipmentExecution'],
      note: 'One repo, two capabilities — a facade is not the same thing as a single capability.',
    }),
    Authentication: feature({
      id: 'Authentication',
      name: 'Authentication',
      parentId: 'DefaultApiFacade',
      edge: 'mandatory',
      childIds: ['BearerToken', 'ApiKey'],
    }),
    BearerToken: feature({ id: 'BearerToken', name: 'Bearer Token', parentId: 'Authentication', edge: 'grouped', groupId: 'auth-type' }),
    ApiKey: feature({ id: 'ApiKey', name: 'API Key', parentId: 'Authentication', edge: 'grouped', groupId: 'auth-type' }),
    PayloadValidation: feature({ id: 'PayloadValidation', name: 'Payload Validation', parentId: 'DefaultApiFacade', edge: 'mandatory' }),
  };
  const groups: Record<string, FeatureGroup> = {
    'auth-type': { id: 'auth-type', parentId: 'Authentication', kind: 'xor', memberIds: ['BearerToken', 'ApiKey'] },
  };
  return {
    id: 'enterprise.api-facade.default',
    name: 'Default API Facade',
    rootId: 'DefaultApiFacade',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/api-facade-default/',
      assetKind: 'repo',
      modelFileName: 'api-facade-default.fm',
      ownerLabel: 'Default API Facade scope',
      colorToken: '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function apiFacadePartnerAModel(): FeatureModel {
  const features: Record<string, Feature> = {
    PartnerAApiFacade: feature({
      id: 'PartnerAApiFacade',
      name: 'Partner A API Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['FieldTranslation'],
      provides: ['ShipmentCreation'],
      requires: ['ShipmentExecution'],
      note: 'A customer-specific facade, its own repo, exposing a narrower slice — Shipment Creation only, no Tracking.',
    }),
    FieldTranslation: feature({ id: 'FieldTranslation', name: 'Field Translation', parentId: 'PartnerAApiFacade', edge: 'optional' }),
  };
  return {
    id: 'enterprise.api-facade.partner-a',
    name: 'Partner A API Facade',
    rootId: 'PartnerAApiFacade',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/api-facade-partner-a/',
      assetKind: 'repo',
      modelFileName: 'api-facade-partner-a.fm',
      ownerLabel: 'Partner A API Facade scope',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

function moduleApiExecutionModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ExecutionModuleApi: feature({
      id: 'ExecutionModuleApi',
      name: 'Execution Module API',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Compensation'],
      provides: ['ShipmentExecution', 'FreightCalculation'],
      requires: ['CarrierRouting', 'ShipmentValidation', 'TrackingNumberIssuance'],
      note: 'A module API is its own repo providing several related capabilities, not one — and Freight Calculation here is only the rating side of it. The Finance Module API provides the other side.',
    }),
    Compensation: feature({ id: 'Compensation', name: 'Compensation', parentId: 'ExecutionModuleApi', edge: 'optional' }),
  };
  return {
    id: 'enterprise.module-api.execution',
    name: 'Execution Module API',
    rootId: 'ExecutionModuleApi',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/module-api-execution/',
      assetKind: 'repo',
      modelFileName: 'module-api-execution.fm',
      ownerLabel: 'Execution Module API scope',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function microApiRoutingModel(version: 'v2' | 'v3'): FeatureModel {
  const id = version === 'v2' ? 'RoutingV2Api' : 'RoutingV3Api';
  const features: Record<string, Feature> = {
    [id]: feature({ id, name: `Routing API (${version})`, parentId: null, edge: 'mandatory', provides: ['CarrierRouting'] }),
  };
  return {
    id: `enterprise.micro-api.routing-${version}`,
    name: `Routing Micro API (${version})`,
    rootId: id,
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: `platform/shipment/micro-api-routing-${version}/`,
      assetKind: 'repo',
      modelFileName: `routing-${version}.fm`,
      ownerLabel: `Routing ${version} scope`,
      colorToken: version === 'v2' ? '--team-connectivity' : '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function microApiValidationModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ValidationV1Api: feature({
      id: 'ValidationV1Api',
      name: 'Validation API (v1)',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Enabled'],
    }),
    Enabled: feature({
      id: 'Enabled',
      name: 'Enabled',
      parentId: 'ValidationV1Api',
      edge: 'optional',
      provides: ['ShipmentValidation'],
      note: 'A micro API should provide exactly one capability — gated behind an explicit toggle rather than the always-on root, so this scope can demonstrate a real missing-capability state.',
    }),
  };
  return {
    id: 'enterprise.micro-api.validation-v1',
    name: 'Validation Micro API (v1)',
    rootId: 'ValidationV1Api',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/micro-api-validation-v1/',
      assetKind: 'repo',
      modelFileName: 'validation-v1.fm',
      ownerLabel: 'Validation v1 scope',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

function microApiTrackingNumbersModel(): FeatureModel {
  const features: Record<string, Feature> = {
    TrackingNumbersApi: feature({
      id: 'TrackingNumbersApi',
      name: 'Tracking Numbers API',
      parentId: null,
      edge: 'mandatory',
      provides: ['TrackingNumberIssuance'],
    }),
  };
  return {
    id: 'enterprise.micro-api.tracking-numbers',
    name: 'Tracking Numbers Micro API',
    rootId: 'TrackingNumbersApi',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shared/micro-api-tracking-numbers/',
      assetKind: 'repo',
      modelFileName: 'tracking-numbers.fm',
      ownerLabel: 'Tracking Numbers scope (shared across products)',
      colorToken: '--surface-muted',
    },
    featureOrder: Object.keys(features),
  };
}

// ---------------------------------------------------------------------------
// Product: Finance
// ---------------------------------------------------------------------------

function frontendInvoiceAuditModel(): FeatureModel {
  const features: Record<string, Feature> = {
    InvoiceAuditFacade: feature({
      id: 'InvoiceAuditFacade',
      name: 'Invoice Audit Facade',
      parentId: null,
      edge: 'mandatory',
      requires: ['InvoiceAudit'],
      note: 'Satisfied directly by the Finance Module API, not by the Finance API Facade in between — capabilities do not care how many layers separate a requirer from its provider.',
    }),
  };
  return {
    id: 'enterprise.frontend.invoice-audit',
    name: 'Invoice Audit Frontend Facade',
    rootId: 'InvoiceAuditFacade',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/finance/frontend-invoice-audit/',
      assetKind: 'repo',
      modelFileName: 'frontend-invoice-audit.fm',
      ownerLabel: 'Invoice Audit Frontend Facade scope',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

function apiFacadeFinanceModel(): FeatureModel {
  const features: Record<string, Feature> = {
    FinanceApiFacade: feature({
      id: 'FinanceApiFacade',
      name: 'Finance API Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['AuditLogging'],
      requires: ['InvoiceAudit', 'BillingProposal'],
      note: 'A pure consumer here — it needs Invoice Audit and Billing Proposal to build its responses, but does not re-provide them upward. The frontend facade above is satisfied directly by the Finance Module API instead.',
    }),
    AuditLogging: feature({ id: 'AuditLogging', name: 'Audit Logging', parentId: 'FinanceApiFacade', edge: 'optional' }),
  };
  return {
    id: 'enterprise.api-facade.finance',
    name: 'Finance API Facade',
    rootId: 'FinanceApiFacade',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/finance/api-facade-finance/',
      assetKind: 'repo',
      modelFileName: 'api-facade-finance.fm',
      ownerLabel: 'Finance API Facade scope',
      colorToken: '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function moduleApiFinanceModel(): FeatureModel {
  const features: Record<string, Feature> = {
    FinanceModuleApi: feature({
      id: 'FinanceModuleApi',
      name: 'Finance Module API',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Compensation'],
      provides: ['InvoiceAudit', 'BillingProposal', 'FreightCalculation'],
      requires: ['TrackingNumberIssuance'],
      note: 'Supports Invoice Audit and Billing Proposal directly, and is one of two providers of Freight Calculation — the billing side of it, alongside the Execution Module API’s rating side. Also requires Tracking Number Issuance from the Shipment product’s micro API: capabilities cross product lines the same way they cross layers.',
    }),
    Compensation: feature({ id: 'Compensation', name: 'Compensation', parentId: 'FinanceModuleApi', edge: 'optional' }),
  };
  return {
    id: 'enterprise.module-api.finance',
    name: 'Finance Module API',
    rootId: 'FinanceModuleApi',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/finance/module-api-finance/',
      assetKind: 'repo',
      modelFileName: 'module-api-finance.fm',
      ownerLabel: 'Finance Module API scope',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

const ASSET_TREE: AssetNode = {
  path: 'platform/',
  kind: 'repo',
  children: [
    {
      path: 'platform/shipment/',
      kind: 'folder',
      children: [
        { path: 'platform/shipment/frontend-shipment-entry/', kind: 'repo', children: [], modelId: 'enterprise.frontend.shipment-entry' },
        { path: 'platform/shipment/frontend-tracking/', kind: 'repo', children: [], modelId: 'enterprise.frontend.tracking' },
        { path: 'platform/shipment/api-facade-default/', kind: 'repo', children: [], modelId: 'enterprise.api-facade.default' },
        { path: 'platform/shipment/api-facade-partner-a/', kind: 'repo', children: [], modelId: 'enterprise.api-facade.partner-a' },
        { path: 'platform/shipment/module-api-execution/', kind: 'repo', children: [], modelId: 'enterprise.module-api.execution' },
        { path: 'platform/shipment/micro-api-routing-v2/', kind: 'repo', children: [], modelId: 'enterprise.micro-api.routing-v2' },
        { path: 'platform/shipment/micro-api-routing-v3/', kind: 'repo', children: [], modelId: 'enterprise.micro-api.routing-v3' },
        { path: 'platform/shipment/micro-api-validation-v1/', kind: 'repo', children: [], modelId: 'enterprise.micro-api.validation-v1' },
      ],
    },
    {
      path: 'platform/shared/',
      kind: 'folder',
      children: [
        { path: 'platform/shared/micro-api-tracking-numbers/', kind: 'repo', children: [], modelId: 'enterprise.micro-api.tracking-numbers' },
      ],
    },
    {
      path: 'platform/finance/',
      kind: 'folder',
      children: [
        { path: 'platform/finance/frontend-invoice-audit/', kind: 'repo', children: [], modelId: 'enterprise.frontend.invoice-audit' },
        { path: 'platform/finance/api-facade-finance/', kind: 'repo', children: [], modelId: 'enterprise.api-facade.finance' },
        { path: 'platform/finance/module-api-finance/', kind: 'repo', children: [], modelId: 'enterprise.module-api.finance' },
      ],
    },
  ],
};

const PRESETS: readonly ConfigPreset[] = [
  {
    id: 'everything-wired',
    title: 'Everything wired',
    description:
      'Twelve independently owned repos across two product lines. Every required capability has a provider — Routing even has two, from two entirely separate Micro API repos.',
    selection: {
      'enterprise.frontend.shipment-entry': [],
      'enterprise.frontend.tracking': [],
      'enterprise.frontend.invoice-audit': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
      'enterprise.api-facade.finance': [],
      'enterprise.module-api.execution': [],
      'enterprise.module-api.finance': [],
      'enterprise.micro-api.routing-v2': [],
      'enterprise.micro-api.routing-v3': [],
      'enterprise.micro-api.validation-v1': ['Enabled'],
      'enterprise.micro-api.tracking-numbers': [],
    },
  },
  {
    id: 'validation-disabled',
    title: 'Validation not enabled',
    description:
      'The Validation v1 repo exists but its capability is toggled off. The resolver notifies only that one repo — not the Execution Module API that needed it, and not any other Micro API.',
    selection: {
      'enterprise.frontend.shipment-entry': [],
      'enterprise.frontend.tracking': [],
      'enterprise.frontend.invoice-audit': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
      'enterprise.api-facade.finance': [],
      'enterprise.module-api.execution': [],
      'enterprise.module-api.finance': [],
      'enterprise.micro-api.routing-v2': [],
      'enterprise.micro-api.routing-v3': [],
      'enterprise.micro-api.validation-v1': [],
      'enterprise.micro-api.tracking-numbers': [],
    },
  },
];

export const ENTERPRISE_EXAMPLE: Example = {
  id: 'enterprise',
  title: 'Layered Platform',
  blurb:
    'A synthetic layered service platform, divided into product lines — every facade, module API, and micro API is its own repo, and capabilities, not APIs, are what actually connect them.',
  models: [
    frontendShipmentEntryModel(),
    frontendTrackingModel(),
    apiFacadeDefaultModel(),
    apiFacadePartnerAModel(),
    moduleApiExecutionModel(),
    microApiRoutingModel('v2'),
    microApiRoutingModel('v3'),
    microApiValidationModel(),
    microApiTrackingNumbersModel(),
    frontendInvoiceAuditModel(),
    apiFacadeFinanceModel(),
    moduleApiFinanceModel(),
  ],
  capabilities: CAPABILITIES,
  globalRules: [],
  assetTree: ASSET_TREE,
  presets: PRESETS,
};

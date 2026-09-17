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
  {
    id: 'DangerousGoods',
    name: 'Dangerous Goods',
    description: 'Handling and compliance for shipments containing dangerous or hazardous goods.',
  },
];

// ---------------------------------------------------------------------------
// Product: Shipment
// ---------------------------------------------------------------------------

function frontendShipmentPortalModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ShipmentPortal: feature({
      id: 'ShipmentPortal',
      name: 'Shipment Portal',
      parentId: null,
      edge: 'mandatory',
      childIds: ['DangerousGoods'],
      requires: ['ShipmentCreation'],
    }),
    DangerousGoods: feature({
      id: 'DangerousGoods',
      name: 'Dangerous Goods',
      parentId: 'ShipmentPortal',
      edge: 'optional',
      requires: ['DangerousGoods'],
      note: 'A local toggle — selecting it requires the shared DangerousGoods capability, provided by the Execution Module API.',
    }),
  };
  return {
    id: 'enterprise.frontend.shipment-portal',
    name: 'Shipment Portal',
    rootId: 'ShipmentPortal',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/shipment-portal/',
      assetKind: 'repo',
      modelFileName: 'shipment-portal.fm',
      ownerLabel: 'Shipment Portal scope',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function frontendTrackingPortalModel(): FeatureModel {
  const features: Record<string, Feature> = {
    TrackingPortal: feature({
      id: 'TrackingPortal',
      name: 'Tracking Portal',
      parentId: null,
      edge: 'mandatory',
      childIds: ['DangerousGoods'],
      requires: ['ShipmentTracking'],
    }),
    DangerousGoods: feature({
      id: 'DangerousGoods',
      name: 'Dangerous Goods',
      parentId: 'TrackingPortal',
      edge: 'optional',
      requires: ['DangerousGoods'],
      note: 'A local toggle — selecting it requires the shared DangerousGoods capability, provided by the Execution Module API.',
    }),
  };
  return {
    id: 'enterprise.frontend.tracking-portal',
    name: 'Tracking Portal',
    rootId: 'TrackingPortal',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/shipment/tracking-portal/',
      assetKind: 'repo',
      modelFileName: 'tracking-portal.fm',
      ownerLabel: 'Tracking Portal scope',
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
      childIds: ['Compensation', 'DangerousGoods'],
      provides: ['ShipmentExecution', 'FreightCalculation'],
      requires: ['CarrierRouting', 'ShipmentValidation', 'TrackingNumberIssuance'],
      note: 'A module API is its own repo providing several related capabilities, not one — Freight Calculation here is only the rating side of it (the Finance Module API provides the other side).',
    }),
    Compensation: feature({ id: 'Compensation', name: 'Compensation', parentId: 'ExecutionModuleApi', edge: 'optional' }),
    DangerousGoods: feature({
      id: 'DangerousGoods',
      name: 'Dangerous Goods',
      parentId: 'ExecutionModuleApi',
      edge: 'optional',
      provides: ['DangerousGoods'],
      note: 'Provided only when this scope turns it on — required by two entirely separate frontend repos whenever either one turns its own Dangerous Goods feature on, but selecting either of those alone does not enable this one.',
    }),
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

function frontendInvoicePortalModel(): FeatureModel {
  const features: Record<string, Feature> = {
    InvoicePortal: feature({
      id: 'InvoicePortal',
      name: 'Invoice Portal',
      parentId: null,
      edge: 'mandatory',
      requires: ['InvoiceAudit'],
      note: 'The Finance product has no API facade layer at all — Invoice Portal requires InvoiceAudit directly from the Finance Module API. Capabilities do not care how many layers separate a requirer from its provider, including zero.',
    }),
  };
  return {
    id: 'enterprise.frontend.invoice-portal',
    name: 'Invoice Portal',
    rootId: 'InvoicePortal',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/finance/invoice-portal/',
      assetKind: 'repo',
      modelFileName: 'invoice-portal.fm',
      ownerLabel: 'Invoice Portal scope',
      colorToken: '--team-connectivity',
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
        { path: 'platform/shipment/shipment-portal/', kind: 'repo', children: [], modelId: 'enterprise.frontend.shipment-portal' },
        { path: 'platform/shipment/tracking-portal/', kind: 'repo', children: [], modelId: 'enterprise.frontend.tracking-portal' },
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
        { path: 'platform/finance/invoice-portal/', kind: 'repo', children: [], modelId: 'enterprise.frontend.invoice-portal' },
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
      'Eleven independently owned repos across two product lines — one of them (Finance) has no API facade layer at all. Every required capability has a provider — Carrier Routing even has two, from two entirely separate Micro API repos.',
    selection: {
      'enterprise.frontend.shipment-portal': [],
      'enterprise.frontend.tracking-portal': [],
      'enterprise.frontend.invoice-portal': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
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
      'enterprise.frontend.shipment-portal': [],
      'enterprise.frontend.tracking-portal': [],
      'enterprise.frontend.invoice-portal': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
      'enterprise.module-api.execution': [],
      'enterprise.module-api.finance': [],
      'enterprise.micro-api.routing-v2': [],
      'enterprise.micro-api.routing-v3': [],
      'enterprise.micro-api.validation-v1': [],
      'enterprise.micro-api.tracking-numbers': [],
    },
  },
  {
    id: 'dangerous-goods',
    title: 'Dangerous Goods, from two portals at once',
    description:
      'Shipment Portal and Tracking Portal each have their own local Dangerous Goods toggle. Both are switched on, and the Execution Module API has turned on its own Dangerous Goods feature too — both requirers are satisfied by the one provider, independently of each other.',
    selection: {
      'enterprise.frontend.shipment-portal': ['DangerousGoods'],
      'enterprise.frontend.tracking-portal': ['DangerousGoods'],
      'enterprise.frontend.invoice-portal': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
      'enterprise.module-api.execution': ['DangerousGoods'],
      'enterprise.module-api.finance': [],
      'enterprise.micro-api.routing-v2': [],
      'enterprise.micro-api.routing-v3': [],
      'enterprise.micro-api.validation-v1': ['Enabled'],
      'enterprise.micro-api.tracking-numbers': [],
    },
  },
  {
    id: 'dangerous-goods-missing',
    title: 'Dangerous Goods, not enabled downstream',
    description:
      'Tracking Portal turns its Dangerous Goods toggle on, but the Execution Module API never enabled its own — the capability it requires does not exist yet. The resolver notifies only the Execution Module API, not Tracking Portal, and not Shipment Portal, which never asked for it.',
    selection: {
      'enterprise.frontend.shipment-portal': [],
      'enterprise.frontend.tracking-portal': ['DangerousGoods'],
      'enterprise.frontend.invoice-portal': [],
      'enterprise.api-facade.default': ['BearerToken'],
      'enterprise.api-facade.partner-a': [],
      'enterprise.module-api.execution': [],
      'enterprise.module-api.finance': [],
      'enterprise.micro-api.routing-v2': [],
      'enterprise.micro-api.routing-v3': [],
      'enterprise.micro-api.validation-v1': ['Enabled'],
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
    frontendShipmentPortalModel(),
    frontendTrackingPortalModel(),
    apiFacadeDefaultModel(),
    apiFacadePartnerAModel(),
    moduleApiExecutionModel(),
    microApiRoutingModel('v2'),
    microApiRoutingModel('v3'),
    microApiValidationModel(),
    microApiTrackingNumbersModel(),
    frontendInvoicePortalModel(),
    moduleApiFinanceModel(),
  ],
  capabilities: CAPABILITIES,
  globalRules: [],
  assetTree: ASSET_TREE,
  presets: PRESETS,
};

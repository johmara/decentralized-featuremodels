/**
 * Example 2 — a layered enterprise platform.
 *
 * This is a SYNTHETIC, generalized example. It reproduces the *shape* of a
 * layered API architecture (frontend facade -> API facade -> module API ->
 * micro APIs, strictly downward dependencies, no layer-skipping,
 * per-consumer capability-API version pinning) without naming any real
 * company, customer, tenant, service, or internal repo. Do not treat any
 * identifier here as a real system name.
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
  { id: 'ShipmentApi', name: 'Shipment API', description: 'The contract for creating and updating shipments.' },
  { id: 'TrackingApi', name: 'Tracking API', description: 'The contract for shipment tracking state.' },
  { id: 'InvoiceApi', name: 'Invoice API', description: 'The contract for invoice and billing data.' },
  {
    id: 'ExecutionOrchestration',
    name: 'Execution Orchestration',
    description: 'The internal workflow engine that sequences calls to the micro APIs below it.',
  },
  { id: 'Routing', name: 'Routing', description: 'Route and service selection for a shipment.' },
  { id: 'Validation', name: 'Validation', description: 'Domain-specific validation rules for a shipment.' },
  { id: 'TrackingNumbers', name: 'Tracking Numbers', description: 'Generation of tracking number identifiers.' },
];

function frontendFacadeModel(): FeatureModel {
  const features: Record<string, Feature> = {
    FrontendFacade: feature({
      id: 'FrontendFacade',
      name: 'Frontend Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['ShipmentEntryUI', 'TrackingUI', 'InvoiceAuditUI', 'DarkTheme'],
    }),
    ShipmentEntryUI: feature({
      id: 'ShipmentEntryUI',
      name: 'Shipment Entry UI',
      parentId: 'FrontendFacade',
      edge: 'grouped',
      groupId: 'ui-type',
      requires: ['ShipmentApi'],
    }),
    TrackingUI: feature({
      id: 'TrackingUI',
      name: 'Tracking UI',
      parentId: 'FrontendFacade',
      edge: 'grouped',
      groupId: 'ui-type',
      requires: ['TrackingApi'],
    }),
    InvoiceAuditUI: feature({
      id: 'InvoiceAuditUI',
      name: 'Invoice Audit UI',
      parentId: 'FrontendFacade',
      edge: 'grouped',
      groupId: 'ui-type',
      requires: ['InvoiceApi'],
      note: 'InvoiceApi is provided by Module API, two layers down. Capabilities do not care how many layers separate a requirer from its provider — that is the point of using them instead of direct references.',
    }),
    DarkTheme: feature({ id: 'DarkTheme', name: 'Dark Theme', parentId: 'FrontendFacade', edge: 'optional' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'ui-type': { id: 'ui-type', parentId: 'FrontendFacade', kind: 'or', memberIds: ['ShipmentEntryUI', 'TrackingUI', 'InvoiceAuditUI'] },
  };

  return {
    id: 'enterprise.frontend-facade',
    name: 'Frontend Facade',
    rootId: 'FrontendFacade',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'platform/frontend-facade/',
      assetKind: 'folder',
      modelFileName: 'frontend-facade.fm',
      ownerLabel: 'Frontend Facade scope',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function apiFacadeModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ApiFacade: feature({
      id: 'ApiFacade',
      name: 'API Facade',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Authentication', 'PayloadValidation', 'FieldTranslation', 'DefaultContract', 'PartnerContractA', 'PartnerContractB'],
      provides: ['ShipmentApi', 'TrackingApi'],
      requires: ['ExecutionOrchestration'],
    }),
    Authentication: feature({
      id: 'Authentication',
      name: 'Authentication',
      parentId: 'ApiFacade',
      edge: 'mandatory',
      childIds: ['BearerToken', 'ApiKey'],
    }),
    BearerToken: feature({ id: 'BearerToken', name: 'Bearer Token', parentId: 'Authentication', edge: 'grouped', groupId: 'auth-type' }),
    ApiKey: feature({ id: 'ApiKey', name: 'API Key', parentId: 'Authentication', edge: 'grouped', groupId: 'auth-type' }),
    PayloadValidation: feature({ id: 'PayloadValidation', name: 'Payload Validation', parentId: 'ApiFacade', edge: 'mandatory' }),
    FieldTranslation: feature({ id: 'FieldTranslation', name: 'Field Translation', parentId: 'ApiFacade', edge: 'optional' }),
    DefaultContract: feature({ id: 'DefaultContract', name: 'Default Contract', parentId: 'ApiFacade', edge: 'grouped', groupId: 'contract-type' }),
    PartnerContractA: feature({ id: 'PartnerContractA', name: 'Partner Contract A', parentId: 'ApiFacade', edge: 'grouped', groupId: 'contract-type' }),
    PartnerContractB: feature({ id: 'PartnerContractB', name: 'Partner Contract B', parentId: 'ApiFacade', edge: 'grouped', groupId: 'contract-type' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'auth-type': { id: 'auth-type', parentId: 'Authentication', kind: 'xor', memberIds: ['BearerToken', 'ApiKey'] },
    'contract-type': {
      id: 'contract-type',
      parentId: 'ApiFacade',
      kind: 'or',
      memberIds: ['DefaultContract', 'PartnerContractA', 'PartnerContractB'],
    },
  };

  return {
    id: 'enterprise.api-facade',
    name: 'API Facade',
    rootId: 'ApiFacade',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'platform/api-facade/',
      assetKind: 'folder',
      modelFileName: 'api-facade.fm',
      ownerLabel: 'API Facade scope',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

function moduleApiModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ModuleApi: feature({
      id: 'ModuleApi',
      name: 'Module API',
      parentId: null,
      edge: 'mandatory',
      childIds: ['ExecutionPipeline', 'Compensation', 'FinanceOrchestration'],
      provides: ['ExecutionOrchestration'],
      requires: ['Routing', 'Validation', 'TrackingNumbers'],
    }),
    ExecutionPipeline: feature({ id: 'ExecutionPipeline', name: 'Execution Pipeline', parentId: 'ModuleApi', edge: 'mandatory' }),
    Compensation: feature({
      id: 'Compensation',
      name: 'Compensation',
      parentId: 'ModuleApi',
      edge: 'optional',
      note: 'Rollback logic when a step in the execution pipeline fails partway through.',
    }),
    FinanceOrchestration: feature({
      id: 'FinanceOrchestration',
      name: 'Finance Orchestration',
      parentId: 'ModuleApi',
      edge: 'optional',
      provides: ['InvoiceApi'],
      note: 'InvoiceApi is only provided when this optional feature is selected — deselect it to see the resolver flag Invoice Audit UI upstream.',
    }),
  };

  return {
    id: 'enterprise.module-api',
    name: 'Module API',
    rootId: 'ModuleApi',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/module-api/',
      assetKind: 'folder',
      modelFileName: 'module-api.fm',
      ownerLabel: 'Module API scope',
      colorToken: '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function microRoutingModel(): FeatureModel {
  const features: Record<string, Feature> = {
    RoutingApi: feature({
      id: 'RoutingApi',
      name: 'Routing (Micro API)',
      parentId: null,
      edge: 'mandatory',
      childIds: ['RoutingV1', 'RoutingV2', 'RoutingV3'],
      provides: ['Routing'],
      note: 'Each consumer pins the version it depends on independently — this is the strongest real-world argument for local configuration spaces.',
    }),
    RoutingV1: feature({ id: 'RoutingV1', name: 'v1 (locked)', parentId: 'RoutingApi', edge: 'grouped', groupId: 'version' }),
    RoutingV2: feature({ id: 'RoutingV2', name: 'v2 (locked)', parentId: 'RoutingApi', edge: 'grouped', groupId: 'version' }),
    RoutingV3: feature({ id: 'RoutingV3', name: 'v3 (__latest__)', parentId: 'RoutingApi', edge: 'grouped', groupId: 'version' }),
  };

  const groups: Record<string, FeatureGroup> = {
    version: { id: 'version', parentId: 'RoutingApi', kind: 'xor', memberIds: ['RoutingV1', 'RoutingV2', 'RoutingV3'] },
  };

  return {
    id: 'enterprise.micro-routing',
    name: 'Routing',
    rootId: 'RoutingApi',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'platform/micro-apis/routing/',
      assetKind: 'folder',
      modelFileName: 'routing.fm',
      ownerLabel: 'Routing scope',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

function microValidationModel(): FeatureModel {
  const features: Record<string, Feature> = {
    ValidationApi: feature({
      id: 'ValidationApi',
      name: 'Validation (Micro API)',
      parentId: null,
      edge: 'mandatory',
      childIds: ['ValidationV1', 'ValidationV2'],
      provides: ['Validation'],
    }),
    ValidationV1: feature({ id: 'ValidationV1', name: 'v1 (locked)', parentId: 'ValidationApi', edge: 'grouped', groupId: 'version' }),
    ValidationV2: feature({ id: 'ValidationV2', name: 'v2 (__latest__)', parentId: 'ValidationApi', edge: 'grouped', groupId: 'version' }),
  };

  const groups: Record<string, FeatureGroup> = {
    version: { id: 'version', parentId: 'ValidationApi', kind: 'xor', memberIds: ['ValidationV1', 'ValidationV2'] },
  };

  return {
    id: 'enterprise.micro-validation',
    name: 'Validation',
    rootId: 'ValidationApi',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'platform/micro-apis/validation/',
      assetKind: 'folder',
      modelFileName: 'validation.fm',
      ownerLabel: 'Validation scope',
      colorToken: '--surface-muted',
    },
    featureOrder: Object.keys(features),
  };
}

function microTrackingNumbersModel(): FeatureModel {
  const features: Record<string, Feature> = {
    TrackingNumbersApi: feature({
      id: 'TrackingNumbersApi',
      name: 'Tracking Numbers (Micro API)',
      parentId: null,
      edge: 'mandatory',
      provides: ['TrackingNumbers'],
    }),
  };

  return {
    id: 'enterprise.micro-tracking-numbers',
    name: 'Tracking Numbers',
    rootId: 'TrackingNumbersApi',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'platform/micro-apis/tracking-numbers/',
      assetKind: 'folder',
      modelFileName: 'tracking-numbers.fm',
      ownerLabel: 'Tracking Numbers scope',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

const ASSET_TREE: AssetNode = {
  path: 'platform/',
  kind: 'repo',
  children: [
    { path: 'platform/frontend-facade/', kind: 'folder', children: [], modelId: 'enterprise.frontend-facade' },
    { path: 'platform/api-facade/', kind: 'folder', children: [], modelId: 'enterprise.api-facade' },
    { path: 'platform/module-api/', kind: 'folder', children: [], modelId: 'enterprise.module-api' },
    {
      path: 'platform/micro-apis/',
      kind: 'folder',
      children: [
        { path: 'platform/micro-apis/routing/', kind: 'folder', children: [], modelId: 'enterprise.micro-routing' },
        { path: 'platform/micro-apis/validation/', kind: 'folder', children: [], modelId: 'enterprise.micro-validation' },
        { path: 'platform/micro-apis/tracking-numbers/', kind: 'folder', children: [], modelId: 'enterprise.micro-tracking-numbers' },
      ],
    },
  ],
};

const PRESETS: readonly ConfigPreset[] = [
  {
    id: 'shipment-only',
    title: 'Shipment, end to end',
    description:
      'The frontend only needs the shipment entry screen. Every layer below independently configures just enough to satisfy it.',
    selection: {
      'enterprise.frontend-facade': ['ShipmentEntryUI'],
      'enterprise.api-facade': ['BearerToken', 'DefaultContract'],
      'enterprise.module-api': [],
      'enterprise.micro-routing': ['RoutingV2'],
      'enterprise.micro-validation': ['ValidationV1'],
      'enterprise.micro-tracking-numbers': [],
    },
  },
  {
    id: 'routing-v3-consumer',
    title: 'Same config, Routing v3',
    description:
      'Identical to "Shipment, end to end" except Routing pins __latest__ (v3) instead of v2 — changing it required touching only the Routing scope.',
    selection: {
      'enterprise.frontend-facade': ['ShipmentEntryUI'],
      'enterprise.api-facade': ['BearerToken', 'DefaultContract'],
      'enterprise.module-api': [],
      'enterprise.micro-routing': ['RoutingV3'],
      'enterprise.micro-validation': ['ValidationV1'],
      'enterprise.micro-tracking-numbers': [],
    },
  },
  {
    id: 'missing-invoice',
    title: 'Missing Invoice API',
    description:
      'Invoice Audit UI needs InvoiceApi, which Module API only provides when Finance Orchestration is selected. Leave it deselected and the resolver notifies only Module API — two layers away from where the requirement was felt.',
    selection: {
      'enterprise.frontend-facade': ['InvoiceAuditUI'],
      'enterprise.api-facade': ['BearerToken', 'DefaultContract'],
      'enterprise.module-api': [],
      'enterprise.micro-routing': ['RoutingV2'],
      'enterprise.micro-validation': ['ValidationV1'],
      'enterprise.micro-tracking-numbers': [],
    },
  },
];

export const ENTERPRISE_EXAMPLE: Example = {
  id: 'enterprise',
  title: 'Layered Platform',
  blurb: 'A synthetic layered service platform — frontend facade, API facade, module API, and independently versioned micro APIs, strictly downward dependencies, no layer-skipping.',
  models: [
    frontendFacadeModel(),
    apiFacadeModel(),
    moduleApiModel(),
    microRoutingModel(),
    microValidationModel(),
    microTrackingNumbersModel(),
  ],
  capabilities: CAPABILITIES,
  globalRules: [],
  assetTree: ASSET_TREE,
  presets: PRESETS,
};

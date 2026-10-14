/**
 * Example 4 — a generic microservice architecture.
 *
 * A SYNTHETIC, domain-neutral webshop. It shows the general case: a flat
 * mesh of independently owned services, with no fixed layering.
 *
 * Modeling rules this data follows:
 * - One service = one repo = one feature model = one scope.
 * - Services never reference each other. They declare the business abilities
 *   (capabilities) they provide and require; the resolver does the matching.
 * - A service may have local optional features. Some of those provide a
 *   capability only when switched on, or require one only when switched on.
 * - The same capability can have several independent providers
 *   (Payment Processing: card and invoice services).
 * - Any service can both provide and require (Order depends on Payment,
 *   Stock and Notifications, and is itself required by the web app).
 * - The monolith (`centralized`) is built from the very same feature trees,
 *   with the capability layer replaced by ordinary cross-tree constraints.
 */
import type {
  AssetNode,
  Capability,
  CapabilityId,
  ConfigPreset,
  Constraint,
  EdgeKind,
  Example,
  Feature,
  FeatureGroup,
  FeatureId,
  FeatureModel,
  GroupId,
} from '../../core/model/feature-model.types';
import { feature } from './feature-helpers';

const CAPABILITIES: readonly Capability[] = [
  { id: 'Authentication', name: 'Authentication', description: 'Establishing who the caller is.' },
  { id: 'ProductCatalog', name: 'Product Catalog', description: 'Looking up products and their details.' },
  { id: 'ProductSearch', name: 'Product Search', description: 'Free-text search over the catalog.' },
  { id: 'StockReservation', name: 'Stock Reservation', description: 'Holding stock for an order that is being placed.' },
  { id: 'PaymentProcessing', name: 'Payment Processing', description: 'Taking payment for an order.' },
  { id: 'OrderManagement', name: 'Order Management', description: 'Creating an order and following it to completion.' },
  { id: 'NotificationDelivery', name: 'Notification Delivery', description: 'Telling a customer something happened.' },
];

// ---------------------------------------------------------------------------
// Feature trees, one per service — shared by the decentralized models and
// the centralized monolith.
// ---------------------------------------------------------------------------

interface Node {
  readonly id: FeatureId;
  readonly name: string;
  /** Edge to the parent; ignored when the parent has a `group`. Defaults to optional. */
  readonly edge?: Exclude<EdgeKind, 'grouped'>;
  /** Makes this node's children an OR / XOR group. */
  readonly group?: 'or' | 'xor';
  readonly provides?: readonly CapabilityId[];
  readonly requires?: readonly CapabilityId[];
  readonly note?: string;
  /**
   * An "Enabled" toggle that exists only so a capability can be switched on
   * and off per deployment. The monolith has no such thing — it folds the
   * toggle away and hoists its children.
   */
  readonly gate?: boolean;
  readonly children?: readonly Node[];
}

const WEB_APP: Node = {
  id: 'WebApp',
  name: 'Web App',
  requires: ['Authentication', 'ProductCatalog', 'OrderManagement'],
  children: [
    { id: 'Checkout', name: 'Checkout', edge: 'mandatory', children: [{ id: 'GuestCheckout', name: 'Guest Checkout' }] },
    {
      id: 'Search',
      name: 'Search Box',
      requires: ['ProductSearch'],
      note: 'A local toggle — turning it on requires the ProductSearch capability from whichever service provides it.',
    },
    { id: 'Wishlist', name: 'Wishlist' },
    { id: 'Recommendations', name: 'Recommendations' },
    {
      id: 'Appearance',
      name: 'Appearance',
      group: 'xor',
      children: [
        { id: 'LightTheme', name: 'Light Theme' },
        { id: 'DarkTheme', name: 'Dark Theme' },
      ],
    },
  ],
};

const AUTH: Node = {
  id: 'AuthService',
  name: 'Auth Service',
  provides: ['Authentication'],
  children: [
    {
      id: 'LoginMethod',
      name: 'Login Method',
      edge: 'mandatory',
      group: 'or',
      children: [
        { id: 'Password', name: 'Password' },
        { id: 'Sso', name: 'SSO' },
      ],
    },
    {
      id: 'Mfa',
      name: 'Multi-factor',
      group: 'or',
      children: [
        { id: 'Totp', name: 'Authenticator App' },
        { id: 'SmsCode', name: 'SMS Code' },
      ],
    },
    { id: 'ApiTokens', name: 'API Tokens' },
    { id: 'SessionRevocation', name: 'Session Revocation' },
  ],
};

const CATALOG: Node = {
  id: 'CatalogService',
  name: 'Catalog Service',
  provides: ['ProductCatalog'],
  children: [
    { id: 'Images', name: 'Product Images', edge: 'mandatory' },
    { id: 'Variants', name: 'Variants' },
    { id: 'Reviews', name: 'Reviews' },
    { id: 'PriceTiers', name: 'Price Tiers' },
    { id: 'BulkImport', name: 'Bulk Import' },
  ],
};

const SEARCH: Node = {
  id: 'SearchService',
  name: 'Search Service',
  requires: ['ProductCatalog'],
  children: [
    {
      id: 'Enabled',
      name: 'Enabled',
      gate: true,
      provides: ['ProductSearch'],
      note: 'Gated behind a toggle so the repo can exist without exposing search — a realistic missing-capability state.',
      children: [
        { id: 'Facets', name: 'Facets' },
        { id: 'FuzzyMatching', name: 'Fuzzy Matching' },
        { id: 'Synonyms', name: 'Synonyms' },
      ],
    },
  ],
};

const ORDER: Node = {
  id: 'OrderService',
  name: 'Order Service',
  provides: ['OrderManagement'],
  requires: ['PaymentProcessing', 'StockReservation'],
  note: 'Both provides and requires: it is a provider to the web app and a consumer of payment and stock.',
  children: [
    { id: 'OrderHistory', name: 'Order History', edge: 'mandatory' },
    {
      id: 'OrderEmails',
      name: 'Order Emails',
      requires: ['NotificationDelivery'],
      note: 'Optional dependency: only when this feature is on does the Order Service need a notification provider.',
    },
    { id: 'Returns', name: 'Returns' },
    { id: 'PartialShipment', name: 'Partial Shipment' },
    { id: 'GiftOrders', name: 'Gift Orders' },
  ],
};

const INVENTORY: Node = {
  id: 'InventoryService',
  name: 'Inventory Service',
  provides: ['StockReservation'],
  children: [
    { id: 'ReservationExpiry', name: 'Reservation Expiry', edge: 'mandatory' },
    { id: 'MultiWarehouse', name: 'Multi-warehouse' },
    { id: 'Backorders', name: 'Backorders' },
    {
      id: 'LowStockAlerts',
      name: 'Low-stock Alerts',
      requires: ['NotificationDelivery'],
      note: 'A second, unrelated requirer of Notification Delivery — one provider can serve several services at once.',
    },
  ],
};

const PAYMENT_CARD: Node = {
  id: 'CardPaymentService',
  name: 'Card Payment Service',
  provides: ['PaymentProcessing'],
  note: 'One of two independent providers of Payment Processing.',
  children: [
    { id: 'ThreeDSecure', name: '3-D Secure' },
    { id: 'MobileWallets', name: 'Mobile Wallets' },
    { id: 'Refunds', name: 'Refunds' },
    { id: 'SavedCards', name: 'Saved Cards', requires: ['Authentication'] },
  ],
};

const PAYMENT_INVOICE: Node = {
  id: 'InvoicePaymentService',
  name: 'Invoice Payment Service',
  provides: ['PaymentProcessing'],
  requires: ['Authentication'],
  note: 'A second, independent provider of Payment Processing. Needs a known customer, so it also requires Authentication.',
  children: [
    {
      id: 'PaymentTerms',
      name: 'Payment Terms',
      group: 'xor',
      children: [
        { id: 'Net14', name: 'Net 14' },
        { id: 'Net30', name: 'Net 30' },
      ],
    },
    { id: 'CreditCheck', name: 'Credit Check' },
    { id: 'Reminders', name: 'Payment Reminders', requires: ['NotificationDelivery'] },
  ],
};

const NOTIFICATION: Node = {
  id: 'NotificationService',
  name: 'Notification Service',
  children: [
    {
      id: 'Enabled',
      name: 'Enabled',
      gate: true,
      provides: ['NotificationDelivery'],
      children: [
        {
          id: 'Channels',
          name: 'Channels',
          edge: 'mandatory',
          group: 'or',
          children: [
            { id: 'Email', name: 'Email' },
            { id: 'Sms', name: 'SMS' },
            { id: 'Push', name: 'Push' },
          ],
        },
        { id: 'Templates', name: 'Templates' },
        { id: 'DailyDigest', name: 'Daily Digest' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tree -> feature records
// ---------------------------------------------------------------------------

interface Build {
  readonly features: Record<FeatureId, Feature>;
  readonly groups: Record<GroupId, FeatureGroup>;
  /** Prefix for feature ids, so several services can share one monolith. */
  readonly prefix: string;
  /** Keep provides/requires (decentralized), or drop them and fold gates away (centralized). */
  readonly keepCapabilities: boolean;
}

function visibleChildren(node: Node, keepCapabilities: boolean): readonly Node[] {
  const children = node.children ?? [];
  if (keepCapabilities) return children;
  return children.flatMap((child) => (child.gate ? visibleChildren(child, false) : [child]));
}

function addNode(node: Node, parentId: FeatureId | null, edge: EdgeKind, groupId: GroupId | undefined, build: Build): void {
  const id = build.prefix + node.id;
  const children = visibleChildren(node, build.keepCapabilities);
  const childIds = children.map((child) => build.prefix + child.id);
  build.features[id] = feature({
    id,
    name: node.name,
    parentId,
    edge,
    childIds,
    ...(groupId ? { groupId } : {}),
    ...(build.keepCapabilities && node.provides ? { provides: node.provides } : {}),
    ...(build.keepCapabilities && node.requires ? { requires: node.requires } : {}),
    ...(build.keepCapabilities && node.note ? { note: node.note } : {}),
  });
  const childGroupId = node.group && children.length > 0 ? `${id}-group` : undefined;
  if (node.group && childGroupId) {
    build.groups[childGroupId] = { id: childGroupId, parentId: id, kind: node.group, memberIds: childIds };
  }
  for (const child of children) {
    addNode(child, id, childGroupId ? 'grouped' : (child.edge ?? 'optional'), childGroupId, build);
  }
}

interface Service {
  readonly key: string;
  readonly node: Node;
  readonly dir: string;
  readonly colorToken: string;
}

const SERVICES: readonly Service[] = [
  { key: 'web-app', node: WEB_APP, dir: 'web-app', colorToken: '--team-connectivity' },
  { key: 'auth', node: AUTH, dir: 'auth-service', colorToken: '--team-keyboard' },
  { key: 'catalog', node: CATALOG, dir: 'catalog-service', colorToken: '--team-storage' },
  { key: 'search', node: SEARCH, dir: 'search-service', colorToken: '--team-messaging' },
  { key: 'order', node: ORDER, dir: 'order-service', colorToken: '--team-messaging' },
  { key: 'inventory', node: INVENTORY, dir: 'inventory-service', colorToken: '--team-storage' },
  { key: 'payment-card', node: PAYMENT_CARD, dir: 'payment-card-service', colorToken: '--team-keyboard' },
  { key: 'payment-invoice', node: PAYMENT_INVOICE, dir: 'payment-invoice-service', colorToken: '--team-connectivity' },
  { key: 'notification', node: NOTIFICATION, dir: 'notification-service', colorToken: '--surface-muted' },
];

function serviceByKey(key: string): Service {
  const service = SERVICES.find((s) => s.key === key);
  if (!service) throw new Error(`Unknown service "${key}"`);
  return service;
}

function serviceModel(service: Service): FeatureModel {
  const features: Record<FeatureId, Feature> = {};
  const groups: Record<GroupId, FeatureGroup> = {};
  addNode(service.node, null, 'optional', undefined, { features, groups, prefix: '', keepCapabilities: true });
  return {
    id: `ms.${service.key}`,
    name: service.node.name,
    rootId: service.node.id,
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: `shop/${service.dir}/`,
      assetKind: 'repo',
      modelFileName: `${service.key}.fm`,
      ownerLabel: `${service.node.name} scope`,
      colorToken: service.colorToken,
    },
    featureOrder: Object.keys(features),
  };
}

// ---------------------------------------------------------------------------
// Centralized model — the monolith, before it is split into services
// ---------------------------------------------------------------------------

function centralizedModel(): FeatureModel {
  const features: Record<FeatureId, Feature> = {};
  const groups: Record<GroupId, FeatureGroup> = {};
  const buildFor = (key: string): Build => ({ features, groups, prefix: `${key}.`, keepCapabilities: false });
  const rootOf = (key: string): FeatureId => `${key}.${serviceByKey(key).node.id}`;

  const mandatoryModules = ['web-app', 'auth', 'catalog', 'order', 'inventory'];
  const paymentModules = ['payment-card', 'payment-invoice'];
  const optionalModules = ['search', 'notification'];

  features['Webshop'] = feature({
    id: 'Webshop',
    name: 'Webshop',
    parentId: null,
    edge: 'mandatory',
    childIds: [...mandatoryModules.map(rootOf), 'Payments', ...optionalModules.map(rootOf)],
  });
  for (const key of mandatoryModules) addNode(serviceByKey(key).node, 'Webshop', 'mandatory', undefined, buildFor(key));

  features['Payments'] = feature({
    id: 'Payments',
    name: 'Payments',
    parentId: 'Webshop',
    edge: 'mandatory',
    childIds: paymentModules.map(rootOf),
  });
  groups['payment-method'] = { id: 'payment-method', parentId: 'Payments', kind: 'or', memberIds: paymentModules.map(rootOf) };
  for (const key of paymentModules) addNode(serviceByKey(key).node, 'Payments', 'grouped', 'payment-method', buildFor(key));

  for (const key of optionalModules) addNode(serviceByKey(key).node, 'Webshop', 'optional', undefined, buildFor(key));

  const implies = (source: FeatureId, target: FeatureId, rationale: string): Constraint => ({
    id: `${source}->${target}`,
    kind: 'implies',
    source,
    target,
    rationale,
  });

  return {
    id: 'ms.centralized',
    name: 'Webshop (monolith)',
    rootId: 'Webshop',
    features,
    groups,
    constraints: [
      implies('web-app.Search', rootOf('search'), 'The search box needs the search module.'),
      implies('order.OrderEmails', rootOf('notification'), 'Order emails need the notification module.'),
      implies('inventory.LowStockAlerts', rootOf('notification'), 'Low-stock alerts need the notification module.'),
      implies('payment-invoice.Reminders', rootOf('notification'), 'Payment reminders need the notification module.'),
    ],
    scope: {
      assetPath: 'shop/ (undivided)',
      assetKind: 'repo',
      modelFileName: 'webshop.fm',
      ownerLabel: 'Whoever owns the whole webshop',
      colorToken: '--surface-muted',
    },
    featureOrder: Object.keys(features),
  };
}

// ---------------------------------------------------------------------------

const ASSET_TREE: AssetNode = {
  path: 'shop/',
  kind: 'repo',
  children: SERVICES.map((s) => ({ path: `shop/${s.dir}/`, kind: 'repo', children: [], modelId: `ms.${s.key}` })),
};

/** A preset selection keyed by service key; services not listed get an empty selection. */
function selection(byService: Record<string, readonly FeatureId[]>): Record<string, readonly FeatureId[]> {
  return Object.fromEntries(SERVICES.map((s) => [`ms.${s.key}`, byService[s.key] ?? []]));
}

const PRESETS: readonly ConfigPreset[] = [
  {
    id: 'everything-wired',
    title: 'Everything wired',
    description:
      'Nine independently owned services, each making its own local choices. Every required capability has a provider — Payment Processing even has two, from two separate services.',
    selection: selection({
      'web-app': ['Search', 'GuestCheckout', 'Wishlist'],
      auth: ['Password', 'Totp'],
      catalog: ['Variants', 'Reviews'],
      search: ['Enabled', 'Facets', 'FuzzyMatching'],
      order: ['OrderEmails', 'Returns'],
      inventory: ['MultiWarehouse', 'LowStockAlerts'],
      'payment-card': ['ThreeDSecure', 'SavedCards'],
      'payment-invoice': ['Net30', 'Reminders'],
      notification: ['Enabled', 'Email', 'Push'],
    }),
  },
  {
    id: 'search-missing',
    title: 'Search on in the web app only',
    description:
      'The web app turns on its Search Box, but the Search Service never enabled search. The resolver notifies only the Search Service — not the web app, not any other service.',
    selection: selection({
      'web-app': ['Search'],
      auth: ['Password'],
      notification: ['Enabled', 'Email'],
    }),
  },
  {
    id: 'no-notifications',
    title: 'Three services want notifications, none are enabled',
    description:
      'Order Emails, Low-stock Alerts and Payment Reminders all require Notification Delivery. The Notification Service is deployed but disabled, so only it is notified — once, for all three requirers.',
    selection: selection({
      auth: ['Password'],
      order: ['OrderEmails'],
      inventory: ['LowStockAlerts'],
      'payment-invoice': ['Reminders'],
    }),
  },
];

export const MICROSERVICES_EXAMPLE: Example = {
  id: 'microservices',
  title: 'Microservices',
  blurb:
    'A generic, flat mesh of independently owned services. No layers — each service declares what it provides and requires, and capabilities connect them.',
  centralized: centralizedModel(),
  models: SERVICES.map(serviceModel),
  capabilities: CAPABILITIES,
  globalRules: [],
  assetTree: ASSET_TREE,
  presets: PRESETS,
  modelsAreOptional: true,
};

/**
 * Example 1 — Phone (hardware + software), from the paper.
 *
 * `PHONE_CENTRALIZED` reproduces Fig. 1 of "Towards Decentralized Feature
 * Models" (var2026/motexample.tex:3-19): the monolith shown before it is
 * split. `PHONE_EXAMPLE.models` reproduces Fig. 2 / panel C: four
 * independently-owned models (Messaging, Connectivity, Keyboard, Storage)
 * coordinated through capabilities. The `Keyboard`→{BaseKeyboard, Layouts,
 * EmojiSupport} and `Email`→{Attachments, ComicEmail} edges are left
 * undecorated in the paper's own figure; this data decorates them
 * explicitly (mandatory for BaseKeyboard/Layouts, optional for the rest) —
 * see the footnote on the Phone example page.
 */
import type {
  AssetNode,
  Capability,
  ConfigPreset,
  Example,
  Feature,
  FeatureGroup,
  FeatureModel,
  GlobalRule,
} from '../../core/model/feature-model.types';
import { feature } from './feature-helpers';

const CAPABILITIES: readonly Capability[] = [
  {
    id: 'InternetConnectivity',
    name: 'Internet Connectivity',
    description: 'Any network path the device can send and receive data over.',
  },
  {
    id: 'KeyboardInput',
    name: 'Keyboard Input',
    description: 'Any way of typing text, from the most basic layout upward.',
  },
  {
    id: 'EmojiRendering',
    name: 'Emoji Rendering',
    description: 'The ability to render emoji glyphs on screen.',
  },
  {
    id: 'SecureStorage',
    name: 'Secure Storage',
    description: 'An on-device store with at-rest encryption.',
  },
  {
    id: 'InsecureStorage',
    name: 'Insecure Storage',
    description: 'An on-device store without at-rest encryption — kept only for legacy compatibility.',
  },
];

const GLOBAL_RULES: readonly GlobalRule[] = [
  {
    kind: 'capability-mutex',
    a: 'SecureStorage',
    b: 'InsecureStorage',
    rationale:
      'A single device image ships one storage stack. Mixing an encrypted and an unencrypted volume defeats the guarantee encryption is meant to provide.',
  },
];

// ---------------------------------------------------------------------------
// Centralized model — Fig. 1
// ---------------------------------------------------------------------------

function centralizedModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Phone: feature({ id: 'Phone', name: 'Phone', parentId: null, edge: 'mandatory', childIds: ['Messaging', 'Connectivity', 'Keyboard'] }),
    Messaging: feature({ id: 'Messaging', name: 'Messaging', parentId: 'Phone', edge: 'mandatory', childIds: ['SMS', 'Email'] }),
    SMS: feature({ id: 'SMS', name: 'SMS', parentId: 'Messaging', edge: 'grouped', groupId: 'msg-type' }),
    Email: feature({ id: 'Email', name: 'Email', parentId: 'Messaging', edge: 'grouped', groupId: 'msg-type' }),
    Connectivity: feature({ id: 'Connectivity', name: 'Connectivity', parentId: 'Phone', edge: 'optional', childIds: ['MobileData', 'Wifi'] }),
    MobileData: feature({ id: 'MobileData', name: 'Mobile Data', parentId: 'Connectivity', edge: 'grouped', groupId: 'net-type' }),
    Wifi: feature({ id: 'Wifi', name: 'Wifi', parentId: 'Connectivity', edge: 'grouped', groupId: 'net-type' }),
    Keyboard: feature({ id: 'Keyboard', name: 'Keyboard', parentId: 'Phone', edge: 'mandatory', childIds: ['BaseKeyboard', 'Layouts', 'EmojiSupport'] }),
    BaseKeyboard: feature({ id: 'BaseKeyboard', name: 'Base Keyboard', parentId: 'Keyboard', edge: 'mandatory' }),
    Layouts: feature({ id: 'Layouts', name: 'Layouts', parentId: 'Keyboard', edge: 'mandatory', childIds: ['QWERTY', 'AZERTY', 'QWERTZ'] }),
    QWERTY: feature({ id: 'QWERTY', name: 'QWERTY', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    AZERTY: feature({ id: 'AZERTY', name: 'AZERTY', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    QWERTZ: feature({ id: 'QWERTZ', name: 'QWERTZ', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    EmojiSupport: feature({ id: 'EmojiSupport', name: 'Emoji Support', parentId: 'Keyboard', edge: 'optional' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'msg-type': { id: 'msg-type', parentId: 'Messaging', kind: 'or', memberIds: ['SMS', 'Email'] },
    'net-type': { id: 'net-type', parentId: 'Connectivity', kind: 'or', memberIds: ['MobileData', 'Wifi'] },
    'layout-type': { id: 'layout-type', parentId: 'Layouts', kind: 'xor', memberIds: ['QWERTY', 'AZERTY', 'QWERTZ'] },
  };

  return {
    id: 'phone.centralized',
    name: 'Phone (centralized)',
    rootId: 'Phone',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'repo/ (undivided)',
      assetKind: 'repo',
      modelFileName: 'phone.fm',
      ownerLabel: 'Whoever owns the whole phone team',
      colorToken: '--surface-muted',
    },
    featureOrder: Object.keys(features),
  };
}

// ---------------------------------------------------------------------------
// Decentralized models — Fig. 2 / panel C
// ---------------------------------------------------------------------------

function messagingModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Messaging: feature({
      id: 'Messaging',
      name: 'Messaging',
      parentId: null,
      edge: 'mandatory',
      childIds: ['SMS', 'Email', 'EncryptedMessaging'],
      requires: ['KeyboardInput'],
      note: 'Every messaging variant needs some way to type — this model requires KeyboardInput no matter which options below are chosen.',
    }),
    SMS: feature({ id: 'SMS', name: 'SMS', parentId: 'Messaging', edge: 'grouped', groupId: 'msg-type' }),
    Email: feature({
      id: 'Email',
      name: 'Email',
      parentId: 'Messaging',
      edge: 'grouped',
      groupId: 'msg-type',
      childIds: ['Attachments', 'ComicEmail'],
      requires: ['InternetConnectivity'],
    }),
    Attachments: feature({ id: 'Attachments', name: 'Attachments', parentId: 'Email', edge: 'optional' }),
    ComicEmail: feature({
      id: 'ComicEmail',
      name: 'Comic Email',
      parentId: 'Email',
      edge: 'optional',
      requires: ['EmojiRendering'],
      note: 'Renders email in a comic-book font with inline emoji — needs EmojiRendering from whichever scope provides it.',
    }),
    EncryptedMessaging: feature({
      id: 'EncryptedMessaging',
      name: 'Encrypted Messaging',
      parentId: 'Messaging',
      edge: 'optional',
      requires: ['SecureStorage'],
      note: 'End-to-end encrypted messages must land in an encrypted store — see the "honest friction" chapter.',
    }),
  };

  const groups: Record<string, FeatureGroup> = {
    'msg-type': { id: 'msg-type', parentId: 'Messaging', kind: 'or', memberIds: ['SMS', 'Email'] },
  };

  return {
    id: 'phone.messaging',
    name: 'Messaging',
    rootId: 'Messaging',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'repo/messaging/',
      assetKind: 'folder',
      modelFileName: 'messaging.fm',
      ownerLabel: 'Messaging scope',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function connectivityModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Connectivity: feature({ id: 'Connectivity', name: 'Connectivity', parentId: null, edge: 'mandatory', childIds: ['MobileData', 'Wifi'] }),
    MobileData: feature({
      id: 'MobileData',
      name: 'Mobile Data',
      parentId: 'Connectivity',
      edge: 'grouped',
      groupId: 'net-type',
      provides: ['InternetConnectivity'],
    }),
    Wifi: feature({
      id: 'Wifi',
      name: 'Wifi',
      parentId: 'Connectivity',
      edge: 'grouped',
      groupId: 'net-type',
      provides: ['InternetConnectivity'],
    }),
  };

  const groups: Record<string, FeatureGroup> = {
    'net-type': { id: 'net-type', parentId: 'Connectivity', kind: 'or', memberIds: ['MobileData', 'Wifi'] },
  };

  return {
    id: 'phone.connectivity',
    name: 'Connectivity',
    rootId: 'Connectivity',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'repo/connectivity/',
      assetKind: 'folder',
      modelFileName: 'connectivity.fm',
      ownerLabel: 'Connectivity scope',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

function keyboardModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Keyboard: feature({ id: 'Keyboard', name: 'Keyboard', parentId: null, edge: 'mandatory', childIds: ['BaseKeyboard', 'Layouts', 'EmojiSupport'] }),
    BaseKeyboard: feature({
      id: 'BaseKeyboard',
      name: 'Base Keyboard',
      parentId: 'Keyboard',
      edge: 'mandatory',
      provides: ['KeyboardInput'],
    }),
    Layouts: feature({ id: 'Layouts', name: 'Layouts', parentId: 'Keyboard', edge: 'mandatory', childIds: ['QWERTY', 'AZERTY', 'QWERTZ'] }),
    QWERTY: feature({ id: 'QWERTY', name: 'QWERTY', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    AZERTY: feature({ id: 'AZERTY', name: 'AZERTY', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    QWERTZ: feature({ id: 'QWERTZ', name: 'QWERTZ', parentId: 'Layouts', edge: 'grouped', groupId: 'layout-type' }),
    EmojiSupport: feature({
      id: 'EmojiSupport',
      name: 'Emoji Support',
      parentId: 'Keyboard',
      edge: 'optional',
      provides: ['EmojiRendering'],
    }),
  };

  const groups: Record<string, FeatureGroup> = {
    'layout-type': { id: 'layout-type', parentId: 'Layouts', kind: 'xor', memberIds: ['QWERTY', 'AZERTY', 'QWERTZ'] },
  };

  return {
    id: 'phone.keyboard',
    name: 'Keyboard',
    rootId: 'Keyboard',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'repo/keyboard/',
      assetKind: 'folder',
      modelFileName: 'keyboard.fm',
      ownerLabel: 'Keyboard scope',
      colorToken: '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function storageModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Storage: feature({ id: 'Storage', name: 'Storage', parentId: null, edge: 'mandatory', childIds: ['LegacyStorage', 'EncryptedVolume'] }),
    LegacyStorage: feature({
      id: 'LegacyStorage',
      name: 'Legacy Storage',
      parentId: 'Storage',
      edge: 'grouped',
      groupId: 'storage-type',
      provides: ['InsecureStorage'],
      note: 'Kept for devices upgrading from older firmware. Cannot coexist with an encrypted volume — see the global mutex rule.',
    }),
    EncryptedVolume: feature({
      id: 'EncryptedVolume',
      name: 'Encrypted Volume',
      parentId: 'Storage',
      edge: 'grouped',
      groupId: 'storage-type',
      provides: ['SecureStorage'],
    }),
  };

  const groups: Record<string, FeatureGroup> = {
    'storage-type': { id: 'storage-type', parentId: 'Storage', kind: 'or', memberIds: ['LegacyStorage', 'EncryptedVolume'] },
  };

  return {
    id: 'phone.storage',
    name: 'Storage',
    rootId: 'Storage',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'repo/storage/',
      assetKind: 'folder',
      modelFileName: 'storage.fm',
      ownerLabel: 'Storage scope',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

const ASSET_TREE: AssetNode = {
  path: 'repo/',
  kind: 'repo',
  children: [
    { path: 'repo/messaging/', kind: 'folder', children: [], modelId: 'phone.messaging' },
    { path: 'repo/connectivity/', kind: 'folder', children: [], modelId: 'phone.connectivity' },
    { path: 'repo/keyboard/', kind: 'folder', children: [], modelId: 'phone.keyboard' },
    { path: 'repo/storage/', kind: 'folder', children: [], modelId: 'phone.storage' },
  ],
};

const PRESETS: readonly ConfigPreset[] = [
  {
    id: 'comic-email',
    title: 'Comic Email',
    description:
      "The paper's own walkthrough. Messaging selects Email and Comic Email; Connectivity and Keyboard independently provide what Messaging needs — the resolver finds every required capability provided.",
    selection: {
      'phone.messaging': ['Email', 'ComicEmail'],
      'phone.connectivity': ['MobileData'],
      'phone.keyboard': ['BaseKeyboard', 'EmojiSupport', 'QWERTY'],
      'phone.storage': ['LegacyStorage'],
    },
  },
  {
    id: 'missing-internet',
    title: 'Missing Internet',
    description:
      'Same Messaging selection, but Connectivity has not picked a network feature yet. The resolver reports InternetConnectivity as missing — and notifies only the Connectivity scope, because that is the only scope that can provide it.',
    selection: {
      'phone.messaging': ['Email', 'ComicEmail'],
      'phone.connectivity': [],
      'phone.keyboard': ['BaseKeyboard', 'EmojiSupport', 'QWERTY'],
      'phone.storage': ['LegacyStorage'],
    },
  },
  {
    id: 'encrypted-friction',
    title: 'Encrypted Messaging vs. Legacy Storage',
    description:
      'Encrypted Messaging is satisfied — Storage provides SecureStorage via Encrypted Volume. But Storage also still provides InsecureStorage via Legacy Storage, and the global rule says a device cannot ship both. This is the "honest friction" the indirection through capabilities was built to surface cleanly, rather than as a silent direct constraint between two features that have never heard of each other.',
    selection: {
      'phone.messaging': ['Email', 'EncryptedMessaging'],
      'phone.connectivity': ['MobileData'],
      'phone.keyboard': ['BaseKeyboard', 'QWERTY'],
      'phone.storage': ['LegacyStorage', 'EncryptedVolume'],
    },
  },
];

export const PHONE_EXAMPLE: Example = {
  id: 'phone',
  title: 'Phone',
  blurb: 'Hardware and software, decomposed by subsystem — the paper’s own running example.',
  centralized: centralizedModel(),
  models: [messagingModel(), connectivityModel(), keyboardModel(), storageModel()],
  capabilities: CAPABILITIES,
  globalRules: GLOBAL_RULES,
  assetTree: ASSET_TREE,
  presets: PRESETS,
};

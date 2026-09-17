/**
 * Example 3 — an open-source distribution.
 *
 * No central owner at all: a kernel subsystem maintainer, a filesystem
 * maintainer, a distro integrator, and independent package maintainers
 * each keep their own model, on their own release cycle. Real anchors:
 * Kconfig's `depends on INET` is a de-facto capability edge; package
 * `Provides:`/`Requires:` metadata is a capability vocabulary that
 * already exists in practice.
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
  { id: 'inet', name: 'inet', description: 'Kernel networking support — the real Kconfig symbol INET.' },
  {
    id: 'mtd',
    name: 'mtd',
    description: 'Memory Technology Device layer for raw flash access.',
    vocabularyNote: 'No scope in this example provides it — left unprovidable on purpose, see the JFFS2 governance-gap preset.',
  },
  { id: 'display-server', name: 'display-server', description: 'Any windowing system a desktop session can run on.' },
  { id: 'tls-library', name: 'tls-library', description: 'A TLS implementation packages can link against.' },
];

function kernelNetModel(): FeatureModel {
  const features: Record<string, Feature> = {
    KernelNet: feature({ id: 'KernelNet', name: 'Kernel Networking', parentId: null, edge: 'mandatory', childIds: ['INET'] }),
    INET: feature({
      id: 'INET',
      name: 'INET',
      parentId: 'KernelNet',
      edge: 'optional',
      childIds: ['IPV6', 'TcpBbr'],
      provides: ['inet'],
      note: 'The real Kconfig symbol. Anything anywhere with `depends on INET` is, in this framework’s terms, Requires(inet).',
    }),
    IPV6: feature({ id: 'IPV6', name: 'IPv6', parentId: 'INET', edge: 'grouped', groupId: 'net-features' }),
    TcpBbr: feature({ id: 'TcpBbr', name: 'TCP BBR congestion control', parentId: 'INET', edge: 'grouped', groupId: 'net-features' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'net-features': { id: 'net-features', parentId: 'INET', kind: 'or', memberIds: ['IPV6', 'TcpBbr'] },
  };

  return {
    id: 'distro.kernel-net',
    name: 'Kernel Networking',
    rootId: 'KernelNet',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'linux/net/',
      assetKind: 'folder',
      modelFileName: 'net.fm',
      ownerLabel: 'Kernel networking maintainers',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

function jffs2Model(): FeatureModel {
  const features: Record<string, Feature> = {
    Jffs2Root: feature({ id: 'Jffs2Root', name: 'JFFS2', parentId: null, edge: 'mandatory', childIds: ['JFFS2_FS'] }),
    JFFS2_FS: feature({
      id: 'JFFS2_FS',
      name: 'Journalling Flash File System',
      parentId: 'Jffs2Root',
      edge: 'optional',
      childIds: ['DebugLevel', 'DefaultCompressionNone', 'DefaultCompressionPriority', 'DefaultCompressionSize', 'CompressData'],
      requires: ['mtd'],
      note: 'depends on MTD in the real kernel tree. No scope in this example provides mtd — selecting this shows the resolver’s "unprovidable" diagnosis, the paper’s capability-governance gap (challenge C3).',
    }),
    DebugLevel: feature({ id: 'DebugLevel', name: 'Debug Level', parentId: 'JFFS2_FS', edge: 'mandatory' }),
    DefaultCompressionNone: feature({
      id: 'DefaultCompressionNone',
      name: 'Default Compression: None',
      parentId: 'JFFS2_FS',
      edge: 'grouped',
      groupId: 'default-compression',
    }),
    DefaultCompressionPriority: feature({
      id: 'DefaultCompressionPriority',
      name: 'Default Compression: Priority',
      parentId: 'JFFS2_FS',
      edge: 'grouped',
      groupId: 'default-compression',
    }),
    DefaultCompressionSize: feature({
      id: 'DefaultCompressionSize',
      name: 'Default Compression: Size',
      parentId: 'JFFS2_FS',
      edge: 'grouped',
      groupId: 'default-compression',
    }),
    CompressData: feature({
      id: 'CompressData',
      name: 'Compress Data',
      parentId: 'JFFS2_FS',
      edge: 'optional',
      childIds: ['ZLIB', 'LZO'],
    }),
    ZLIB: feature({ id: 'ZLIB', name: 'ZLIB', parentId: 'CompressData', edge: 'grouped', groupId: 'compressor' }),
    LZO: feature({ id: 'LZO', name: 'LZO', parentId: 'CompressData', edge: 'grouped', groupId: 'compressor' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'default-compression': {
      id: 'default-compression',
      parentId: 'JFFS2_FS',
      kind: 'xor',
      memberIds: ['DefaultCompressionNone', 'DefaultCompressionPriority', 'DefaultCompressionSize'],
    },
    compressor: { id: 'compressor', parentId: 'CompressData', kind: 'or', memberIds: ['ZLIB', 'LZO'] },
  };

  return {
    id: 'distro.jffs2',
    name: 'JFFS2',
    rootId: 'Jffs2Root',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'linux/fs/jffs2/',
      assetKind: 'folder',
      modelFileName: 'jffs2.fm',
      ownerLabel: 'JFFS2 maintainers',
      colorToken: '--team-keyboard',
    },
    featureOrder: Object.keys(features),
  };
}

function distroIntegratorModel(): FeatureModel {
  const features: Record<string, Feature> = {
    Distro: feature({
      id: 'Distro',
      name: 'Distro',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Desktop', 'Server', 'Minimal', 'SystemdBoot'],
      requires: ['inet'],
    }),
    Desktop: feature({
      id: 'Desktop',
      name: 'Desktop',
      parentId: 'Distro',
      edge: 'grouped',
      groupId: 'distro-type',
      requires: ['display-server'],
    }),
    Server: feature({ id: 'Server', name: 'Server', parentId: 'Distro', edge: 'grouped', groupId: 'distro-type' }),
    Minimal: feature({ id: 'Minimal', name: 'Minimal', parentId: 'Distro', edge: 'grouped', groupId: 'distro-type' }),
    SystemdBoot: feature({ id: 'SystemdBoot', name: 'systemd-boot', parentId: 'Distro', edge: 'optional' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'distro-type': { id: 'distro-type', parentId: 'Distro', kind: 'or', memberIds: ['Desktop', 'Server', 'Minimal'] },
  };

  return {
    id: 'distro.integrator',
    name: 'Distro Integrator',
    rootId: 'Distro',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'distro/',
      assetKind: 'folder',
      modelFileName: 'distro.fm',
      ownerLabel: 'Distro integrator',
      colorToken: '--team-storage',
    },
    featureOrder: Object.keys(features),
  };
}

function mailPackageModel(): FeatureModel {
  const features: Record<string, Feature> = {
    MailPackage: feature({
      id: 'MailPackage',
      name: 'Mail Package',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Postfix', 'Exim', 'TlsSupport'],
      requires: ['inet'],
    }),
    Postfix: feature({ id: 'Postfix', name: 'postfix', parentId: 'MailPackage', edge: 'grouped', groupId: 'mta' }),
    Exim: feature({ id: 'Exim', name: 'exim', parentId: 'MailPackage', edge: 'grouped', groupId: 'mta' }),
    TlsSupport: feature({
      id: 'TlsSupport',
      name: 'TLS Support',
      parentId: 'MailPackage',
      edge: 'optional',
      requires: ['tls-library'],
    }),
  };

  const groups: Record<string, FeatureGroup> = {
    mta: { id: 'mta', parentId: 'MailPackage', kind: 'xor', memberIds: ['Postfix', 'Exim'] },
  };

  return {
    id: 'distro.mail',
    name: 'Mail Package',
    rootId: 'MailPackage',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'packages/mail/',
      assetKind: 'folder',
      modelFileName: 'mail.fm',
      ownerLabel: 'Mail package maintainer',
      colorToken: '--team-messaging',
    },
    featureOrder: Object.keys(features),
  };
}

function displayPackageModel(): FeatureModel {
  const features: Record<string, Feature> = {
    DisplayPackage: feature({
      id: 'DisplayPackage',
      name: 'Display Package',
      parentId: null,
      edge: 'mandatory',
      childIds: ['Xorg', 'Wayland'],
      provides: ['display-server'],
    }),
    Xorg: feature({ id: 'Xorg', name: 'Xorg', parentId: 'DisplayPackage', edge: 'grouped', groupId: 'display-type' }),
    Wayland: feature({ id: 'Wayland', name: 'Wayland', parentId: 'DisplayPackage', edge: 'grouped', groupId: 'display-type' }),
  };

  const groups: Record<string, FeatureGroup> = {
    'display-type': { id: 'display-type', parentId: 'DisplayPackage', kind: 'xor', memberIds: ['Xorg', 'Wayland'] },
  };

  return {
    id: 'distro.display',
    name: 'Display Package',
    rootId: 'DisplayPackage',
    features,
    groups,
    constraints: [],
    scope: {
      assetPath: 'packages/x/',
      assetKind: 'folder',
      modelFileName: 'x.fm',
      ownerLabel: 'Display package maintainer',
      colorToken: '--surface-muted',
    },
    featureOrder: Object.keys(features),
  };
}

function tlsPackageModel(): FeatureModel {
  const features: Record<string, Feature> = {
    TlsLibrary: feature({
      id: 'TlsLibrary',
      name: 'TLS Library',
      parentId: null,
      edge: 'mandatory',
      provides: ['tls-library'],
    }),
  };

  return {
    id: 'distro.tls',
    name: 'TLS Library',
    rootId: 'TlsLibrary',
    features,
    groups: {},
    constraints: [],
    scope: {
      assetPath: 'packages/tls/',
      assetKind: 'folder',
      modelFileName: 'tls.fm',
      ownerLabel: 'TLS library maintainer',
      colorToken: '--team-connectivity',
    },
    featureOrder: Object.keys(features),
  };
}

const ASSET_TREE: AssetNode = {
  path: '/',
  kind: 'repo',
  children: [
    {
      path: 'linux/',
      kind: 'folder',
      children: [
        { path: 'linux/net/', kind: 'folder', children: [], modelId: 'distro.kernel-net' },
        { path: 'linux/fs/jffs2/', kind: 'folder', children: [], modelId: 'distro.jffs2' },
      ],
    },
    { path: 'distro/', kind: 'folder', children: [], modelId: 'distro.integrator' },
    {
      path: 'packages/',
      kind: 'folder',
      children: [
        { path: 'packages/mail/', kind: 'folder', children: [], modelId: 'distro.mail' },
        { path: 'packages/x/', kind: 'folder', children: [], modelId: 'distro.display' },
        { path: 'packages/tls/', kind: 'folder', children: [], modelId: 'distro.tls' },
      ],
    },
  ],
};

const PRESETS: readonly ConfigPreset[] = [
  {
    id: 'desktop-with-mail',
    title: 'Desktop, with mail',
    description:
      'A desktop distro with a mail package — six independently released scopes, no central owner, everything resolves.',
    selection: {
      'distro.kernel-net': ['INET', 'IPV6'],
      'distro.jffs2': [],
      'distro.integrator': ['Desktop', 'SystemdBoot'],
      'distro.mail': ['Postfix', 'TlsSupport'],
      'distro.display': ['Wayland'],
      'distro.tls': [],
    },
  },
  {
    id: 'jffs2-governance-gap',
    title: 'JFFS2 governance gap',
    description:
      'Enable JFFS2 and the resolver reports mtd as unprovidable — no scope in this example provides it. Unlike a missing selection, no team can fix this by configuring differently. This is challenge C3, capability governance, made concrete.',
    selection: {
      'distro.kernel-net': ['INET', 'IPV6'],
      'distro.jffs2': ['JFFS2_FS', 'DebugLevel', 'DefaultCompressionNone'],
      'distro.integrator': ['Minimal'],
      'distro.mail': [],
      'distro.display': ['Xorg'],
      'distro.tls': [],
    },
  },
];

export const DISTRO_EXAMPLE: Example = {
  id: 'distro',
  title: 'Open-Source Distribution',
  blurb: 'A kernel subsystem, a filesystem, a distro integrator, and independent packages — no central owner at all.',
  models: [
    kernelNetModel(),
    jffs2Model(),
    distroIntegratorModel(),
    mailPackageModel(),
    displayPackageModel(),
    tlsPackageModel(),
  ],
  capabilities: CAPABILITIES,
  globalRules: [],
  assetTree: ASSET_TREE,
  presets: PRESETS,
};

import type { CloudDef, RockDef } from './MapDecorations.types';

// Copied verbatim from legacy MapDecorations.tsx:26-118
export const FIXED_ROCK_LAYOUT: RockDef[] = [
  // Four Strategic Corner Rocks
  { id: 'rock-tl', src: '/sprites/small_rock.gif', left: '3%', top: '3%', size: 22 },
  { id: 'rock-tr', src: '/sprites/medium_rock.gif', left: '97%', top: '3%', size: 24 },
  { id: 'rock-bl', src: '/sprites/mini_rock.gif', left: '3%', top: '97%', size: 18 },
  { id: 'rock-br', src: '/sprites/big_rock.gif', left: '97%', top: '97%', size: 26 },

  // Top Water Margin
  { id: 'rock-t1', src: '/sprites/mini_rock.gif', left: '26%', top: '2%', size: 16, desktopOnly: true },
  { id: 'rock-t2', src: '/sprites/small_rock.gif', left: '50%', top: '2%', size: 20 },
  { id: 'rock-t3', src: '/sprites/medium_rock.gif', left: '74%', top: '2%', size: 22, desktopOnly: true },

  // Bottom Water Margin
  { id: 'rock-b1', src: '/sprites/small_rock.gif', left: '24%', top: '98%', size: 18, desktopOnly: true },
  { id: 'rock-b2', src: '/sprites/medium_rock.gif', left: '50%', top: '98%', size: 24 },
  { id: 'rock-b3', src: '/sprites/mini_rock.gif', left: '76%', top: '98%', size: 16, desktopOnly: true },

  // Left Water Margin
  { id: 'rock-l1', src: '/sprites/medium_rock.gif', left: '2%', top: '28%', size: 22, desktopOnly: true },
  { id: 'rock-l2', src: '/sprites/small_rock.gif', left: '2%', top: '50%', size: 20 },
  { id: 'rock-l3', src: '/sprites/big_rock.gif', left: '2%', top: '72%', size: 24, desktopOnly: true },

  // Right Water Margin
  { id: 'rock-r1', src: '/sprites/small_rock.gif', left: '98%', top: '28%', size: 20, desktopOnly: true },
  { id: 'rock-r2', src: '/sprites/mini_rock.gif', left: '98%', top: '50%', size: 18 },
  { id: 'rock-r3', src: '/sprites/medium_rock.gif', left: '98%', top: '72%', size: 22, desktopOnly: true },
];

export const FIXED_CLOUD_LAYOUT: CloudDef[] = [
  // Top-Left Corner Cluster
  { id: 'cloud-tl-1', src: '/sprites/cloud_big.png', left: '-8%', top: '-8%', width: 104, height: 70, opacity: 0.9 },
  { id: 'cloud-tl-2', src: '/sprites/cloud_medium.png', left: '-3%', top: '-10%', width: 80, height: 54, opacity: 0.82, desktopOnly: true },
  { id: 'cloud-tl-3', src: '/sprites/cloud_small.png', left: '-10%', top: '-3%', width: 64, height: 44, opacity: 0.78, desktopOnly: true },
  { id: 'cloud-tl-4', src: '/sprites/cloud_medium.png', left: '4%', top: '-6%', width: 76, height: 50, opacity: 0.85 },
  { id: 'cloud-tl-5', src: '/sprites/cloud_small.png', left: '-6%', top: '4%', width: 60, height: 42, opacity: 0.8 },

  // Top-Right Corner Cluster
  { id: 'cloud-tr-1', src: '/sprites/cloud_big.png', left: '108%', top: '-8%', width: 104, height: 70, opacity: 0.9 },
  { id: 'cloud-tr-2', src: '/sprites/cloud_medium.png', left: '103%', top: '-10%', width: 80, height: 54, opacity: 0.82, desktopOnly: true },
  { id: 'cloud-tr-3', src: '/sprites/cloud_small.png', left: '110%', top: '-3%', width: 64, height: 44, opacity: 0.78, desktopOnly: true },
  { id: 'cloud-tr-4', src: '/sprites/cloud_medium.png', left: '96%', top: '-6%', width: 76, height: 50, opacity: 0.85 },
  { id: 'cloud-tr-5', src: '/sprites/cloud_small.png', left: '106%', top: '4%', width: 60, height: 42, opacity: 0.8 },

  // Bottom-Left Corner Cluster
  { id: 'cloud-bl-1', src: '/sprites/cloud_big.png', left: '-8%', top: '108%', width: 104, height: 70, opacity: 0.9 },
  { id: 'cloud-bl-2', src: '/sprites/cloud_medium.png', left: '-3%', top: '110%', width: 80, height: 54, opacity: 0.82, desktopOnly: true },
  { id: 'cloud-bl-3', src: '/sprites/cloud_small.png', left: '-10%', top: '103%', width: 64, height: 44, opacity: 0.78, desktopOnly: true },
  { id: 'cloud-bl-4', src: '/sprites/cloud_medium.png', left: '4%', top: '106%', width: 76, height: 50, opacity: 0.85 },
  { id: 'cloud-bl-5', src: '/sprites/cloud_small.png', left: '-6%', top: '96%', width: 60, height: 42, opacity: 0.8 },

  // Bottom-Right Corner Cluster
  { id: 'cloud-br-1', src: '/sprites/cloud_big.png', left: '108%', top: '108%', width: 104, height: 70, opacity: 0.9 },
  { id: 'cloud-br-2', src: '/sprites/cloud_medium.png', left: '103%', top: '110%', width: 80, height: 54, opacity: 0.82, desktopOnly: true },
  { id: 'cloud-br-3', src: '/sprites/cloud_small.png', left: '110%', top: '103%', width: 64, height: 44, opacity: 0.78, desktopOnly: true },
  { id: 'cloud-br-4', src: '/sprites/cloud_medium.png', left: '96%', top: '106%', width: 76, height: 50, opacity: 0.85 },
  { id: 'cloud-br-5', src: '/sprites/cloud_small.png', left: '106%', top: '96%', width: 60, height: 42, opacity: 0.8 },

  // Top Perimeter Edge Clouds
  { id: 'cloud-t1', src: '/sprites/cloud_medium.png', left: '16%', top: '-6%', width: 76, height: 50, opacity: 0.82 },
  { id: 'cloud-t2', src: '/sprites/cloud_small.png', left: '27%', top: '2%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-t3', src: '/sprites/cloud_medium.png', left: '38%', top: '-7%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-t4', src: '/sprites/cloud_small.png', left: '50%', top: '-4%', width: 64, height: 42, opacity: 0.8 },
  { id: 'cloud-t5', src: '/sprites/cloud_medium.png', left: '62%', top: '-7%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-t6', src: '/sprites/cloud_small.png', left: '73%', top: '2%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-t7', src: '/sprites/cloud_medium.png', left: '84%', top: '-6%', width: 76, height: 50, opacity: 0.82 },

  // Bottom Perimeter Edge Clouds
  { id: 'cloud-b1', src: '/sprites/cloud_medium.png', left: '16%', top: '106%', width: 76, height: 50, opacity: 0.82 },
  { id: 'cloud-b2', src: '/sprites/cloud_small.png', left: '27%', top: '98%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-b3', src: '/sprites/cloud_medium.png', left: '38%', top: '107%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-b4', src: '/sprites/cloud_small.png', left: '50%', top: '104%', width: 64, height: 42, opacity: 0.8 },
  { id: 'cloud-b5', src: '/sprites/cloud_medium.png', left: '62%', top: '107%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-b6', src: '/sprites/cloud_small.png', left: '73%', top: '98%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-b7', src: '/sprites/cloud_medium.png', left: '84%', top: '106%', width: 76, height: 50, opacity: 0.82 },

  // Left Perimeter Edge Clouds
  { id: 'cloud-l1', src: '/sprites/cloud_medium.png', left: '2%', top: '16%', width: 76, height: 50, opacity: 0.82 },
  { id: 'cloud-l2', src: '/sprites/cloud_small.png', left: '2%', top: '27%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-l3', src: '/sprites/cloud_medium.png', left: '2%', top: '38%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-l4', src: '/sprites/cloud_small.png', left: '2%', top: '50%', width: 64, height: 42, opacity: 0.8 },
  { id: 'cloud-l5', src: '/sprites/cloud_medium.png', left: '2%', top: '62%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-l6', src: '/sprites/cloud_small.png', left: '2%', top: '73%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-l7', src: '/sprites/cloud_medium.png', left: '2%', top: '84%', width: 76, height: 50, opacity: 0.82 },

  // Right Perimeter Edge Clouds
  { id: 'cloud-r1', src: '/sprites/cloud_medium.png', left: '98%', top: '16%', width: 76, height: 50, opacity: 0.82 },
  { id: 'cloud-r2', src: '/sprites/cloud_small.png', left: '98%', top: '27%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-r3', src: '/sprites/cloud_medium.png', left: '98%', top: '38%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-r4', src: '/sprites/cloud_small.png', left: '98%', top: '50%', width: 64, height: 42, opacity: 0.8 },
  { id: 'cloud-r5', src: '/sprites/cloud_medium.png', left: '98%', top: '62%', width: 74, height: 48, opacity: 0.85 },
  { id: 'cloud-r6', src: '/sprites/cloud_small.png', left: '98%', top: '73%', width: 60, height: 40, opacity: 0.78 },
  { id: 'cloud-r7', src: '/sprites/cloud_medium.png', left: '98%', top: '84%', width: 76, height: 50, opacity: 0.82 },

  // Corner-to-Edge Gap Fillers
  { id: 'cloud-t0', src: '/sprites/cloud_medium.png', left: '9%', top: '2%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-t8', src: '/sprites/cloud_medium.png', left: '91%', top: '2%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-b0', src: '/sprites/cloud_medium.png', left: '9%', top: '98%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-b8', src: '/sprites/cloud_medium.png', left: '91%', top: '98%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-l0', src: '/sprites/cloud_medium.png', left: '2%', top: '9%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-l8', src: '/sprites/cloud_medium.png', left: '2%', top: '91%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-r0', src: '/sprites/cloud_medium.png', left: '98%', top: '9%', width: 74, height: 48, opacity: 0.8 },
  { id: 'cloud-r8', src: '/sprites/cloud_medium.png', left: '98%', top: '91%', width: 74, height: 48, opacity: 0.8 },
];

export function toVisibleDecorations(isMobile: boolean): { rocks: RockDef[]; clouds: CloudDef[] } {
  return {
    rocks: isMobile ? FIXED_ROCK_LAYOUT.filter((rock) => !rock.desktopOnly) : FIXED_ROCK_LAYOUT,
    clouds: isMobile ? FIXED_CLOUD_LAYOUT.filter((cloud) => !cloud.desktopOnly) : FIXED_CLOUD_LAYOUT,
  };
}

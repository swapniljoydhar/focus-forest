/**
 * Procedural Tree Generator for Focus Forest
 * Generates unique SVG trees based on session data (duration, domain, timestamp)
 * Uses deterministic randomness so the same session always produces the same tree
 */

// Simple seeded random number generator (Mulberry32)
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Create a seed from session data
function createSeed(duration, domain, timestamp) {
  let hash = 0;
  const str = `${duration}-${domain}-${timestamp}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate tree parameters based on duration
function getTreeParams(duration, rand) {
  const minutes = duration / 60;
  
  // Tree size grows with time (max 200px height)
  const height = Math.min(20 + (minutes * 2), 200);
  const trunkHeight = height * 0.3;
  const canopyRadius = Math.min(15 + (minutes * 1.5), 80);
  
  // Number of branches based on time
  const branchCount = Math.min(3 + Math.floor(minutes / 5), 8);
  
  // Color based on time of day (extracted from timestamp if available, else random)
  const hue = Math.floor(rand() * 60) + 90; // Greens to Yellow-Greens
  const saturation = 60 + Math.floor(rand() * 20);
  const lightness = 35 + Math.floor(rand() * 15);
  
  return {
    height,
    trunkHeight,
    canopyRadius,
    branchCount,
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    leafColor: `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`
  };
}

// Generate SVG path for a branch
function generateBranch(x, y, length, angle, width, rand, depth = 0) {
  if (depth > 4 || length < 5) return '';
  
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  
  // Slight curve using quadratic bezier
  const controlX = x + Math.cos(angle - 0.2) * (length * 0.5);
  const controlY = y + Math.sin(angle - 0.2) * (length * 0.5);
  
  let path = `M ${x} ${y} Q ${controlX} ${controlY} ${endX} ${endY}`;
  
  // Recursively generate sub-branches
  const subBranches = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < subBranches; i++) {
    const subAngle = angle + (rand() - 0.5) * 1.5;
    const subLength = length * (0.6 + rand() * 0.2);
    const subWidth = Math.max(0.5, width * 0.7);
    path += generateBranch(endX, endY, subLength, subAngle, subWidth, rand, depth + 1);
  }
  
  return path;
}

// Generate canopy circles
function generateCanopy(cx, cy, radius, rand, count) {
  let circles = '';
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * radius * 0.8;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = radius * (0.3 + rand() * 0.4);
    
    const opacity = 0.6 + rand() * 0.4;
    circles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="currentColor" opacity="${opacity.toFixed(2)}" class="leaf" />`;
  }
  return circles;
}

// Main function to generate complete tree SVG
export function generateTreeSVG(duration, domain, timestamp = Date.now()) {
  const seed = createSeed(duration, domain, timestamp);
  const rand = mulberry32(seed);
  const params = getTreeParams(duration, rand);
  
  const centerX = 100;
  const groundY = 180;
  const trunkTopY = groundY - params.trunkHeight;
  
  // Generate trunk and branches
  let branches = '';
  // Main trunk
  branches += `M ${centerX} ${groundY} L ${centerX} ${trunkTopY}`;
  
  // Side branches
  for (let i = 0; i < params.branchCount; i++) {
    const branchY = groundY - (params.trunkHeight * (0.2 + rand() * 0.6));
    const angle = (rand() - 0.5) * 2.5; // -1.25 to 1.25 radians
    const length = params.canopyRadius * (0.4 + rand() * 0.4);
    branches += generateBranch(centerX, branchY, length, angle, 3, rand, 0);
  }
  
  // Generate canopy
  const canopy = generateCanopy(centerX, trunkTopY, params.canopyRadius, rand, 12);
  
  // Animation delay based on seed for variety
  const animDelay = (seed % 5000) / 1000;
  
  return `
    <svg viewBox="0 0 200 200" class="focus-tree" style="--anim-delay: ${animDelay}s">
      <defs>
        <linearGradient id="trunk-grad-${seed}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#5d4037;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#795548;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5d4037;stop-opacity:1" />
        </linearGradient>
      </defs>
      <g class="tree-group">
        <!-- Branches -->
        <path d="${branches}" stroke="url(#trunk-grad-${seed})" stroke-width="3" fill="none" stroke-linecap="round" class="branch" />
        <!-- Canopy -->
        <g fill="${params.leafColor}" class="canopy">
          ${canopy}
        </g>
      </g>
      <style>
        .focus-tree {
          width: ${Math.min(params.height + 20, 220)}px;
          height: 200px;
          overflow: visible;
        }
        .branch {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: grow-branch 1.5s ease-out forwards var(--anim-delay, 0s);
        }
        .leaf {
          opacity: 0;
          transform-origin: center;
          animation: leaf-appear 0.8s ease-out forwards var(--anim-delay, 0s), leaf-rustle 3s ease-in-out infinite calc(var(--anim-delay, 0s) + 1s);
        }
        @keyframes grow-branch {
          to { stroke-dashoffset: 0; }
        }
        @keyframes leaf-appear {
          from { opacity: 0; transform: scale(0); }
          to { opacity: var(--opacity, 0.8); transform: scale(1); }
        }
        @keyframes leaf-rustle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .branch, .leaf {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
            transform: none;
          }
        }
      </style>
    </svg>
  `;
}

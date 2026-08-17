/**
 * Procedural Tree Generator for Focus Forest
 * Generates unique SVG trees based on session data (duration, domain, timestamp)
 * Uses deterministic randomness so the same session always produces the same tree
 * Features: realistic organic shapes, asymmetrical and symmetrical branching, visible leaf-buds
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
  const trunkThickness = Math.min(3 + (minutes * 0.15), 8);
  
  // Number of primary branches (asymmetrical distribution)
  const primaryBranches = Math.min(3 + Math.floor(minutes / 8), 7);
  const secondaryBranchFactor = 0.4 + rand() * 0.4; // Randomness factor
  
  // Color palette based on time
  const hueBase = 90 + Math.floor(rand() * 40); // Greens to yellow-greens
  const trunkHue = 28 + Math.floor(rand() * 10); // Brown tones
  const trunkSaturation = 25 + Math.floor(rand() * 15);
  const trunkLightness = 35 + Math.floor(rand() * 10);
  
  return {
    height,
    trunkThickness,
    primaryBranches,
    secondaryBranchFactor,
    trunkColor: `hsl(${trunkHue}, ${trunkSaturation}%, ${trunkLightness}%)`,
    branchColor: `hsl(${hueBase - 10}, 45%, 52%)`,
    leafColor: `hsl(${hueBase}, 55%, ${40 + Math.floor(rand() * 15)}%)`,
    budColor: `hsl(${hueBase + 5}, 50%, ${55 + Math.floor(rand() * 10)}%)`
  };
}

// Generate a curved branch path with natural variation
function generateBranchPath(x, y, length, angle, thickness, rand, depth = 0, maxDepth = 4) {
  if (depth > maxDepth || length < 8 || thickness < 0.8) return { path: '', subBranches: '', buds: '' };
  
  // Natural curve with slight randomness
  const curvature = (rand() - 0.5) * 0.4;
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  
  // Control points for organic curve
  const midLength = length * 0.5;
  const controlX = x + Math.cos(angle + curvature) * midLength;
  const controlY = y + Math.sin(angle + curvature) * midLength;
  
  // Tapered branch path (wide at base, narrow at tip)
  const perpAngle = angle - Math.PI / 2;
  const startOffset = thickness;
  const endOffset = Math.max(0.3, thickness * 0.35);
  
  const leftStartX = x + Math.cos(perpAngle) * startOffset;
  const leftStartY = y + Math.sin(perpAngle) * startOffset;
  const rightStartX = x - Math.cos(perpAngle) * startOffset;
  const rightStartY = y - Math.sin(perpAngle) * startOffset;
  const leftEndX = endX + Math.cos(perpAngle + curvature * 0.5) * endOffset;
  const leftEndY = endY + Math.sin(perpAngle + curvature * 0.5) * endOffset;
  const rightEndX = endX - Math.cos(perpAngle + curvature * 0.5) * endOffset;
  const rightEndY = endY - Math.sin(perpAngle + curvature * 0.5) * endOffset;
  
  const midControlLeftX = controlX + Math.cos(perpAngle + curvature) * (startOffset * 0.6);
  const midControlLeftY = controlY + Math.sin(perpAngle + curvature) * (startOffset * 0.6);
  const midControlRightX = controlX - Math.cos(perpAngle + curvature) * (startOffset * 0.6);
  const midControlRightY = controlY - Math.sin(perpAngle + curvature) * (startOffset * 0.6);
  
  const path = `M${leftStartX.toFixed(2)} ${leftStartY.toFixed(2)} Q${midControlLeftX.toFixed(2)} ${midControlLeftY.toFixed(2)} ${leftEndX.toFixed(2)} ${leftEndY.toFixed(2)} L${rightEndX.toFixed(2)} ${rightEndY.toFixed(2)} Q${midControlRightX.toFixed(2)} ${midControlRightY.toFixed(2)} ${rightStartX.toFixed(2)} ${rightStartY.toFixed(2)} Z`;
  
  // Generate sub-branches (asymmetrical branching pattern)
  let subBranches = '';
  let buds = '';
  const numSubBranches = depth === 0 ? 1 + Math.floor(rand() * 2) : (rand() < secondaryBranchFactor ? 1 : 0);
  
  for (let i = 0; i < numSubBranches; i++) {
    const subAngle = angle + (rand() - 0.3) * 1.8; // Asymmetrical angle distribution
    const subLength = length * (0.5 + rand() * 0.25);
    const subThickness = Math.max(0.5, thickness * 0.6);
    const result = generateBranchPath(endX, endY, subLength, subAngle, subThickness, rand, depth + 1, maxDepth);
    subBranches += result.path + result.subBranches;
    buds += result.buds;
  }
  
  // Add leaf buds at terminal points or along branches
  if (depth >= maxDepth - 1 || numSubBranches === 0) {
    const budAngle = angle + (rand() - 0.5) * 0.8;
    const budX = endX + Math.cos(budAngle) * 3;
    const budY = endY + Math.sin(budAngle) * 3;
    const budScale = 0.6 + rand() * 0.5;
    buds += `<ellipse cx="${budX.toFixed(1)}" cy="${budY.toFixed(1)}" rx="${(3 * budScale).toFixed(1)}" ry="${(2 * budScale).toFixed(1)}" fill="currentColor" transform="rotate(${(budAngle * 180 / Math.PI).toFixed(0)} ${budX.toFixed(1)} ${budY.toFixed(1)})" class="leaf-bud" />`;
  }
  
  return { path, subBranches, buds };
}

// Main function to generate complete tree SVG with realistic organic structure
export function generateTreeSVG(duration, domain, timestamp = Date.now()) {
  const seed = createSeed(duration, domain, timestamp);
  const rand = mulberry32(seed);
  const params = getTreeParams(duration, rand);
  
  const centerX = 100;
  const groundY = 180;
  const trunkTopY = groundY - params.height * 0.35;
  
  // Generate main trunk with slight natural curve
  const trunkCurve = (rand() - 0.5) * 8;
  const trunkPath = `M${(centerX - params.trunkThickness).toFixed(2)} ${groundY.toFixed(2)} C${(centerX - params.trunkThickness - 3).toFixed(2)} ${(groundY - params.height * 0.2).toFixed(2)}, ${(centerX - params.trunkThickness + trunkCurve).toFixed(2)} ${(trunkTopY + 8).toFixed(2)}, ${(centerX - 2).toFixed(2)} ${trunkTopY.toFixed(2)} L${(centerX + 2).toFixed(2)} ${trunkTopY.toFixed(2)} C${(centerX + params.trunkThickness - trunkCurve).toFixed(2)} ${(trunkTopY + 8).toFixed(2)}, ${(centerX + params.trunkThickness + 3).toFixed(2)} ${(groundY - params.height * 0.2).toFixed(2)}, ${(centerX + params.trunkThickness).toFixed(2)} ${groundY.toFixed(2)} Z`;
  
  // Root flare at base
  const rootFlareLeft = `M${(centerX - params.trunkThickness).toFixed(2)} ${groundY.toFixed(2)} C${(centerX - params.trunkThickness - 8).toFixed(2)} ${(groundY + 4).toFixed(2)}, ${(centerX - params.trunkThickness - 12).toFixed(2)} ${(groundY + 2).toFixed(2)}, ${(centerX - params.trunkThickness - 6).toFixed(2)} ${groundY.toFixed(2)}`;
  const rootFlareRight = `M${(centerX + params.trunkThickness).toFixed(2)} ${groundY.toFixed(2)} C${(centerX + params.trunkThickness + 9).toFixed(2)} ${(groundY + 5).toFixed(2)}, ${(centerX + params.trunkThickness + 14).toFixed(2)} ${(groundY + 3).toFixed(2)}, ${(centerX + params.trunkThickness + 7).toFixed(2)} ${groundY.toFixed(2)}`;
  
  // Generate primary branches (asymmetrical arrangement)
  let allBranches = '';
  let allBuds = '';
  const branchAngles = [];
  
  for (let i = 0; i < params.primaryBranches; i++) {
    // Alternate left and right with varying angles for natural look
    const side = i % 2 === 0 ? 1 : -1;
    const baseAngle = (-0.4 - rand() * 0.6) * side; // Upward and outward
    const angleVariation = (rand() - 0.5) * 0.3;
    const branchAngle = baseAngle + angleVariation;
    branchAngles.push(branchAngle);
    
    const branchY = trunkTopY + (i * (params.height * 0.65) / params.primaryBranches);
    const branchLength = params.height * 0.25 * (0.7 + rand() * 0.5);
    const branchThickness = Math.max(1.5, params.trunkThickness * 0.5 * (1 - i / params.primaryBranches));
    
    const startX = i % 2 === 0 ? centerX + 2 : centerX - 2;
    const result = generateBranchPath(startX, branchY, branchLength, branchAngle, branchThickness, rand, 0, 3);
    allBranches += result.path + result.subBranches;
    allBuds += result.buds;
  }
  
  // Add some symmetrical upper branches for balance
  if (params.primaryBranches >= 3) {
    const upperLeftResult = generateBranchPath(centerX - 1, trunkTopY - 5, params.height * 0.2, -2.2, 2, rand, 0, 2);
    const upperRightResult = generateBranchPath(centerX + 1, trunkTopY - 5, params.height * 0.22, -0.9, 2.2, rand, 0, 2);
    allBranches += upperLeftResult.path + upperLeftResult.subBranches + upperRightResult.path + upperRightResult.subBranches;
    allBuds += upperLeftResult.buds + upperRightResult.buds;
  }
  
  // Animation delay based on seed
  const animDelay = (seed % 5000) / 1000;
  
  return `
    <svg viewBox="0 0 200 200" class="focus-tree" style="--anim-delay: ${animDelay}s">
      <defs>
        <linearGradient id="trunk-grad-${seed}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${params.trunkColor};stop-opacity:1" />
          <stop offset="50%" style="stop-color:hsl(${parseInt(params.trunkColor.match(/\\d+/)[0]) + 5}, ${parseInt(params.trunkColor.match(/\\d+/g)[1]) + 5}%, ${parseInt(params.trunkColor.match(/\\d+/g)[2]) + 8}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:${params.trunkColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <g class="tree-group">
        <!-- Root flare -->
        <path d="${rootFlareLeft} ${rootFlareRight}" fill="url(#trunk-grad-${seed})" class="root-flare" />
        <!-- Main trunk -->
        <path d="${trunkPath}" fill="url(#trunk-grad-${seed})" class="trunk" />
        <!-- Branches -->
        <g fill="${params.branchColor}" class="branches">
          ${allBranches}
        </g>
        <!-- Leaf buds -->
        <g fill="${params.budColor}" class="buds">
          ${allBuds}
        </g>
      </g>
      <style>
        .focus-tree {
          width: ${Math.min(params.height + 30, 230)}px;
          height: 200px;
          overflow: visible;
        }
        .trunk, .root-flare {
          stroke: none;
          opacity: 0.95;
        }
        .branches {
          opacity: 0.92;
        }
        .branch-path {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: grow-branch 1.8s ease-out forwards var(--anim-delay, 0s);
        }
        .leaf-bud {
          opacity: 0;
          transform-origin: center;
          animation: bud-appear 1s ease-out forwards calc(var(--anim-delay, 0s) + 0.6s), bud-sway 4s ease-in-out infinite calc(var(--anim-delay, 0s) + 1.5s);
        }
        @keyframes grow-branch {
          from { opacity: 0; }
          to { opacity: 0.92; }
        }
        @keyframes bud-appear {
          from { opacity: 0; transform: scale(0.3) rotate(var(--rotation, 0deg)); }
          to { opacity: 0.9; transform: scale(1) rotate(var(--rotation, 0deg)); }
        }
        @keyframes bud-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trunk, .branches, .leaf-bud {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      </style>
    </svg>
  `;
}

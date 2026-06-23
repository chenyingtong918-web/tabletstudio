/**
 * Universal Layout Engine
 * Ported from tabletplugin/src/plugin/utils/generateLayout.ts
 * 
 * Modifies VirtualNode JSON objects instead of Figma SceneNodes.
 */

export const BREAKPOINTS_CONFIG = {
  'Compact': {
    breakpoint: { name: 'Compact', minWidth: 0, maxWidth: 599, sizes: [{ width: 390, height: 844, label: '390 * 844' }] },
    grid: { columns: 4, margin: 8, gutter: 8 }
  },
  'Medium': {
    breakpoint: { name: 'Medium', minWidth: 600, maxWidth: 839, sizes: [{ width: 820, height: 1180, label: '820 * 1180 (竖屏)' }, { width: 800, height: 712, label: '800 * 712 (横屏)' }] },
    grid: { columns: 12, margin: 8, gutter: 8 }
  },
  'Expanded': {
    breakpoint: { name: 'Expanded', minWidth: 840, maxWidth: 1199, sizes: [{ width: 1024, height: 1366, label: '1024 * 1366 (竖屏)' }, { width: 1024, height: 768, label: '1024 * 768 (横屏)' }] },
    grid: { columns: 12, margin: 20, gutter: 8 }
  },
  'Large': {
    breakpoint: { name: 'Large', minWidth: 1200, maxWidth: 1599, sizes: [{ width: 1200, height: 1980, label: '1200 * 1980 (竖屏)' }, { width: 1366, height: 1024, label: '1366 * 1024 (横屏)' }] },
    grid: { columns: 20, margin: 24, gutter: 16 }
  },
  'Extra Large': {
    breakpoint: { name: 'Extra Large', minWidth: 1600, maxWidth: 9999, sizes: [{ width: 1920, height: 1200, label: '1920 * 1200' }] },
    grid: { columns: 24, margin: 32, gutter: 16 }
  }
};

const NO_ADAPT_KEYWORDS = [
  'popover', 'menu', 'slider', 'checkbox', 'radio', 'segmented control', 'home indicator',
  'chips', 'page control', 'switch', 'keyboard', 'key board', '键盘', '数字键盘',
  'switch', '开关', 'toast', '提示', 'avatar', '头像',
  'status bar', 'nav bar', 'top bar', 'bottom bar'
];

const noticeRule = {
  'Compact': { columns: 4, vConstraint: 'AUTO' },
  'Medium': { columns: 6, vConstraint: 'AUTO' },
  'Expanded': { columns: 6, vConstraint: 'AUTO' },
  'Large': { columns: 10, vConstraint: 'AUTO' },
  'Extra Large': { columns: 10, vConstraint: 'AUTO' }
};

const category2Rule = {
  'Compact': { columns: 4, vConstraint: 'AUTO' },
  'Medium': { columns: 6, vConstraint: 'AUTO' },
  'Expanded': { columns: 6, vConstraint: 'AUTO' },
  'Large': { columns: 8, vConstraint: 'AUTO' },
  'Extra Large': { columns: 8, vConstraint: 'AUTO' }
};

const MAPPED_SCALING_CONFIG = {
  'floating notice': noticeRule,
  'in-app push': noticeRule,
  'dialog': category2Rule,
  'intro panel': category2Rule
};

const SPECIAL_ADAPT_CONFIG = {
  'profile works': {
    'Compact': { columns: 3, gap: 1.5, aspectRatio: 3 / 4 },
    'Medium': { columns: 3, gap: 2, aspectRatio: 3 / 4 },
    'Expanded': { columns: 4, gap: 2, aspectRatio: 3 / 4 },
    'Large': { columns: 5, gap: 2, aspectRatio: 3 / 4 },
    'Extra Large': { columns: 5, gap: 2, aspectRatio: 3 / 4 }
  }
};

/**
 * Transforms a raw Figma API Node into our simplified VirtualNode.
 * We limit depth to 1! The user explicitly requested to only scan the 
 * outermost frames (e.g. the direct children of the root frame) for the preview.
 */
export const transformFigmaNodeToVirtualNode = (figmaNode, parentX = 0, parentY = 0, depth = 0) => {
  // depth 0 is the root frame. depth 1 are the direct children (the 11 frames).
  // We stop at depth 1, so the children of those 11 frames are ignored.
  if (!figmaNode || depth > 1) return null;

  // Filter out pure vector objects to save memory and DOM nodes
  const IGNORED_TYPES = ['VECTOR', 'STAR', 'POLYGON', 'ELLIPSE', 'BOOLEAN_OPERATION', 'LINE'];
  if (IGNORED_TYPES.includes(figmaNode.type)) return null;

  // Figma API provides absoluteBoundingBox
  const absBox = figmaNode.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 };
  const absX = absBox.x || 0;
  const absY = absBox.y || 0;
  const width = absBox.width || 0;
  const height = absBox.height || 0;

  // Calculate relative x/y based on parent
  // The root node (depth 0) should be positioned at 0,0 within the canvas.
  const x = depth === 0 ? 0 : absX - parentX;
  const y = depth === 0 ? 0 : absY - parentY;

  const vNode = {
    id: figmaNode.id,
    name: figmaNode.name || '',
    type: figmaNode.type,
    x,
    y,
    width,
    height,
    absX,
    absY,
    children: [],
    // Keep some original properties needed for layout logic
    layoutMode: figmaNode.layoutMode || 'NONE',
    fills: figmaNode.fills || [],
  };

  // Only traverse children if we haven't hit the depth limit (handled at top of function)
  if (figmaNode.children) {
    vNode.children = figmaNode.children
      .map(child => transformFigmaNodeToVirtualNode(child, absX, absY, depth + 1))
      .filter(Boolean);
  }

  return vNode;
};

// Simplified adaptation logic for Virtual Nodes
export const adjustVirtualNodeLayout = (
  vNode,
  bpName,
  targetFrameWidth,
  targetFrameHeight,
  oldFrameWidth,
  oldFrameHeight,
  rootFrame,
  originalBreakpoint
) => {
  if (!vNode) return;
  const nodeName = vNode.name.toLowerCase();
  const isNoAdapt = NO_ADAPT_KEYWORDS.some(keyword => nodeName.includes(keyword));

  // ==========================================
  // Rule 1: No Adapt
  // ==========================================
  if (isNoAdapt) {
    if (vNode.id !== rootFrame.id) {
      const originalAbsX = vNode.absX;
      const originalAbsY = vNode.absY;

      const rootAbsX = rootFrame.absX;
      const rootAbsY = rootFrame.absY;

      const distLeft = originalAbsX - rootAbsX;
      const distTop = originalAbsY - rootAbsY;
      const distRight = oldFrameWidth - (distLeft + vNode.width);
      const distBottom = oldFrameHeight - (distTop + vNode.height);

      const nodeCenterX = distLeft + (vNode.width / 2);
      const nodeCenterY = distTop + (vNode.height / 2);

      const halfWidth = oldFrameWidth / 2;
      const halfHeight = oldFrameHeight / 2;
      const TOLERANCE = 2;

      let newAbsX = originalAbsX;
      if (Math.abs(nodeCenterX - halfWidth) <= TOLERANCE) {
        newAbsX = rootAbsX + (targetFrameWidth / 2) - (vNode.width / 2);
      } else if (nodeCenterX < halfWidth) {
        newAbsX = rootAbsX + distLeft;
      } else {
        newAbsX = rootAbsX + targetFrameWidth - distRight - vNode.width;
      }

      let newAbsY = originalAbsY;
      if (Math.abs(nodeCenterY - halfHeight) <= TOLERANCE) {
        newAbsY = rootAbsY + (targetFrameHeight / 2) - (vNode.height / 2);
      } else if (nodeCenterY < halfHeight) {
        newAbsY = rootAbsY + distTop;
      } else {
        newAbsY = rootAbsY + targetFrameHeight - distBottom - vNode.height;
      }

      vNode.absX = newAbsX;
      vNode.absY = newAbsY;
      vNode.x = newAbsX - rootAbsX;
      vNode.y = newAbsY - rootAbsY;
    }
    vNode.appliedRule = 'No Adapt';
    return; // Stop recursive adapting
  }

  // ==========================================
  // Rule 2: Mapped Scaling
  // ==========================================
  let isMappedComponent = false;
  let ruleToApply = null;

  for (const [key, rules] of Object.entries(MAPPED_SCALING_CONFIG)) {
    if (nodeName.includes(key) || nodeName.includes(key.replace(' ', ''))) {
      if (rules[bpName]) {
        isMappedComponent = true;
        ruleToApply = rules[bpName];
        break;
      }
    }
  }

  if (isMappedComponent && ruleToApply) {
    const config = BREAKPOINTS_CONFIG[bpName];
    let mappedTargetWidth = vNode.width; // Fallback
    
    if (config) {
      const { columns, margin, gutter } = config.grid;
      const totalGutterWidth = (columns - 1) * gutter;
      const totalColumnWidth = targetFrameWidth - (margin * 2) - totalGutterWidth;
      const singleColumnWidth = totalColumnWidth / columns;

      mappedTargetWidth = (singleColumnWidth * ruleToApply.columns) + (gutter * (ruleToApply.columns - 1));
      
      // Update width but keep height unchanged
      vNode.width = mappedTargetWidth;

      // Center horizontally
      vNode.x = (targetFrameWidth - mappedTargetWidth) / 2;
      vNode.absX = rootFrame.absX + vNode.x;
    }
    
    // Scale children proportionally for preview
    if (vNode.children) {
      const scaleChildren = (node, scaleX) => {
        for (const child of node.children) {
          child.x *= scaleX;
          child.width *= scaleX;
          child.absX = node.absX + child.x;
          if (child.children) scaleChildren(child, scaleX);
        }
      };
      const safeOldWidth = vNode.width || 1;
      const scaleX = mappedTargetWidth / safeOldWidth;
      scaleChildren(vNode, scaleX);
    }
    vNode.appliedRule = `Mapped: ${ruleToApply.columns} cols`;
    return;
  }

  // ==========================================
  // Rule 3: Special Adaptation
  // ==========================================
  const isPortrait = targetFrameHeight > targetFrameWidth || bpName === 'Compact';
  const isCommentNodeName = (name) => name === 'comment' || name === 'comments' || name === '评论' || name === '评论区' || name.includes('comment panel');
  const isCommentPanel = isCommentNodeName(nodeName) && !isPortrait;

  if (isCommentPanel) {
    if (bpName !== 'Compact') {
      const config = BREAKPOINTS_CONFIG[bpName];
      if (config) {
        const { columns, margin, gutter } = config.grid;
        const totalGutterWidth = (columns - 1) * gutter;
        const totalColumnWidth = targetFrameWidth - (margin * 2) - totalGutterWidth;
        const singleColumnWidth = totalColumnWidth / columns;
        
        const targetCols = (bpName === 'Large' || bpName === 'Extra Large') ? 6 : 4;
        const commentTargetWidth = (singleColumnWidth * targetCols) + (gutter * (targetCols - 1)) + margin;

        vNode.width = commentTargetWidth;
        vNode.height = targetFrameHeight;
        vNode.x = targetFrameWidth - commentTargetWidth;
        vNode.y = 0;
        vNode.absX = rootFrame.absX + vNode.x;
        vNode.absY = rootFrame.absY + vNode.y;
        vNode.appliedRule = 'Special: Comment';
        return;
      }
    }
  }

  const isSheetNodeName = (name) => name === 'sheet' || name.includes('sheet');
  const isSheetPanel = (isSheetNodeName(nodeName) || (isCommentNodeName(nodeName) && isPortrait));

  if (isSheetPanel) {
    if (bpName !== 'Compact') {
      const config = BREAKPOINTS_CONFIG[bpName];
      if (config) {
        const { columns, margin, gutter } = config.grid;
        const totalGutterWidth = (columns - 1) * gutter;
        const totalColumnWidth = targetFrameWidth - (margin * 2) - totalGutterWidth;
        const singleColumnWidth = totalColumnWidth / columns;
        
        const targetCols = (bpName === 'Large' || bpName === 'Extra Large') ? 8 : 6;
        const sheetTargetWidth = (singleColumnWidth * targetCols) + (gutter * (targetCols - 1));

        vNode.width = sheetTargetWidth;
        vNode.x = (targetFrameWidth - sheetTargetWidth) / 2;
        vNode.y = targetFrameHeight - vNode.height - 32;
        vNode.absX = rootFrame.absX + vNode.x;
        vNode.absY = rootFrame.absY + vNode.y;
        vNode.appliedRule = 'Special: Sheet';
        return;
      }
    }
  }

  if (nodeName.includes('blur00')) {
    vNode.width = targetFrameWidth;
    vNode.height = targetFrameHeight;
    vNode.x = 0;
    vNode.y = 0;
    vNode.absX = rootFrame.absX;
    vNode.absY = rootFrame.absY;
    vNode.appliedRule = 'Special: Blur';
    return;
  }

  // Restore Special Adapt for 'profile works'
  let isSpecialComponent = false;
  let specialRuleToApply = null;

  for (const [key, rules] of Object.entries(SPECIAL_ADAPT_CONFIG)) {
    if (nodeName.includes(key) || nodeName.includes(key.replace(' ', ''))) {
      const rule = rules[bpName];
      if (rule) {
        isSpecialComponent = true;
        specialRuleToApply = rule;
        break;
      }
    }
  }

  if (isSpecialComponent && specialRuleToApply) {
    // For profile works, it stretches to full width
    vNode.width = targetFrameWidth;
    vNode.x = 0;
    vNode.absX = rootFrame.absX;
    vNode.appliedRule = `Special: ${specialRuleToApply.columns} cols`;
    return;
  }

  if (nodeName.includes('fypvideo')) {
    const originalWidth = vNode.width || 1;
    const originalHeight = vNode.height || 1;
    const aspectRatio = originalWidth / originalHeight;

    const originalTopDistance = vNode.y;
    const originalBottomDistance = oldFrameHeight - (vNode.y + vNode.height);

    const newHeight = targetFrameHeight - originalTopDistance - originalBottomDistance;
    const newWidth = newHeight * aspectRatio;

    const originalCenterX = vNode.x + (originalWidth / 2);

    vNode.width = newWidth;
    vNode.height = newHeight;
    
    let effectiveWidth = targetFrameWidth;
    if (bpName !== 'Compact') {
      const hasComment = rootFrame.children && rootFrame.children.some(c => isCommentNodeName(c.name.toLowerCase()));
      if (hasComment && !isPortrait) {
        const config = BREAKPOINTS_CONFIG[bpName];
        if (config) {
          const { columns, margin, gutter } = config.grid;
          const totalColumnWidth = targetFrameWidth - (margin * 2) - ((columns - 1) * gutter);
          const singleColumnWidth = totalColumnWidth / columns;
          const targetCols = (bpName === 'Large' || bpName === 'Extra Large') ? 6 : 4;
          const commentTargetWidth = (singleColumnWidth * targetCols) + (gutter * (targetCols - 1)) + margin;
          effectiveWidth = targetFrameWidth - commentTargetWidth;
        }
      }
    }

    const relativeX = (effectiveWidth / 2) + centerOffset;
    vNode.x = relativeX - (newWidth / 2);
    vNode.absX = rootFrame.absX + vNode.x;
    vNode.appliedRule = 'Special: FYP Video';
    return;
  }

  // ==========================================
  // Fallback: Default placement (Only stretch root, center others)
  // ==========================================
  const isIcon = ['icon', '图标', 'indicator', 'logo'].some(kw => nodeName.includes(kw));
  if (!isIcon && vNode.width > 64) {
    if (vNode.id === rootFrame.id) {
      vNode.width = targetFrameWidth;
      vNode.height = targetFrameHeight;
      vNode.appliedRule = 'Fallback: Root';
    } else {
      // For the original breakpoint, do NOT stretch! User requested to keep original design bounds.
      if (bpName === originalBreakpoint) {
        const originalCenterX = vNode.x + (vNode.width / 2);
        vNode.x = (targetFrameWidth / 2) - (vNode.width / 2) + (originalCenterX - (oldFrameWidth / 2));
        vNode.absX = rootFrame.absX + vNode.x;
        vNode.appliedRule = 'Fallback: Original Size';
      } else {
        // Restore Direct Stretch width for Tablet/Desktop
        const originalCenterX = vNode.x + (vNode.width / 2);
        const widthScale = targetFrameWidth / (oldFrameWidth || 1);
        
        vNode.width *= widthScale; // Stretch it!
        const newCenterX = originalCenterX * widthScale;
        
        vNode.x = newCenterX - (vNode.width / 2);
        vNode.absX = rootFrame.absX + vNode.x;
        vNode.appliedRule = 'Fallback: Direct Stretch';
      }
    }
  } else {
    vNode.appliedRule = 'Fallback: Default';
  }

  if (vNode.children) {
    for (const child of vNode.children) {
      adjustVirtualNodeLayout(
        child,
        bpName,
        targetFrameWidth,
        targetFrameHeight,
        oldFrameWidth,
        oldFrameHeight,
        rootFrame,
        originalBreakpoint
      );
    }
  }
};

/**
 * Main entry point for layout engine. Generates all breakpoint previews.
 */
export const generateVirtualLayouts = (rawFigmaData) => {
  if (!rawFigmaData) return null;

  // Assuming rawFigmaData is a single node document (e.g. fetched with ?ids=...)
  // The structure is usually the node itself if fetched correctly
  const rootNode = rawFigmaData;
  const originalWidth = rootNode.absoluteBoundingBox?.width || 390;
  const originalHeight = rootNode.absoluteBoundingBox?.height || 844;

  const vRoot = transformFigmaNodeToVirtualNode(rootNode);

  // Determine original breakpoint
  let originalBreakpoint = 'Compact'; // Default
  for (const [bp, config] of Object.entries(BREAKPOINTS_CONFIG)) {
    if (originalWidth >= config.breakpoint.minWidth && originalWidth <= config.breakpoint.maxWidth) {
      originalBreakpoint = bp;
      break;
    }
  }

  const layouts = {};

  for (const bpName of Object.keys(BREAKPOINTS_CONFIG)) {
    const config = BREAKPOINTS_CONFIG[bpName];
    layouts[bpName] = {};
    
    // Create one preview per orientation size defined
    config.breakpoint.sizes.forEach(size => {
      const isPortrait = size.height > size.width || bpName === 'Compact';
      const oriKey = isPortrait ? 'Portrait' : 'Landscape';

      // Deep clone the virtual node tree
      const clonedVRoot = JSON.parse(JSON.stringify(vRoot));
      
      adjustVirtualNodeLayout(
        clonedVRoot,
        bpName,
        size.width,
        size.height,
        originalWidth,
        originalHeight,
        clonedVRoot,
        originalBreakpoint
      );

      layouts[bpName][oriKey] = {
        bpName,
        size,
        vNode: clonedVRoot
      };
    });
  }

  return layouts;
};

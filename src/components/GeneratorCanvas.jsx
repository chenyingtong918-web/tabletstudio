import React, { useState, useRef, useEffect, useLayoutEffect, useContext, useMemo } from 'react';
import { Cloud, Undo, Redo, Code, Play, Download, RefreshCw, Share2, X, Grid3X3 } from 'lucide-react';
import { ChatContext } from '../data/ChatContext';
import { generateVirtualLayouts, BREAKPOINTS_CONFIG } from '../utils/layoutEngine';
import './GeneratorCanvas.css';

// A simple recursive renderer for VirtualNodes
const VirtualNodeRenderer = ({ node, imagesMap }) => {
  if (!node) return null;

  try {
    const imageUrl = imagesMap && imagesMap[node.id];
    
    // Render a simple wireframe
    const style = {
      position: 'absolute',
      left: `${node.x || 0}px`,
      top: `${node.y || 0}px`,
      width: `${node.width || 0}px`,
      height: `${node.height || 0}px`,
      border: imageUrl ? 'none' : '1px solid rgba(0,0,0,0.1)',
      backgroundColor: imageUrl ? 'transparent' : 'rgba(0,0,0,0.02)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    };

    if (!imageUrl && node.fills && Array.isArray(node.fills) && node.fills.length > 0 && node.fills[0].type === 'SOLID' && node.fills[0].color) {
      const { r, g, b, a } = node.fills[0].color;
      style.backgroundColor = `rgba(${(r||0)*255}, ${(g||0)*255}, ${(b||0)*255}, ${a ?? 1})`;
    }

    return (
      <div style={style} title={`${node.name}\nRule: ${node.appliedRule || 'None'}`}>
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            {node.appliedRule && node.appliedRule !== 'Fallback: Root' && (
              <div style={{
                position: 'absolute', top: 0, left: 0, background: 'rgba(0,120,255,0.8)', 
                color: 'white', fontSize: '10px', padding: '2px 6px', zIndex: 10
              }}>
                {node.name} • {node.appliedRule}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Simple label for frames/components that are relatively large */}
            {node.width > 50 && node.height > 20 && node.type !== 'TEXT' && (
              <span style={{ 
                fontSize: '10px', color: '#666', padding: '2px 4px', display: 'block', 
                background: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
              }}>
                {node.name}
                {node.appliedRule && <span style={{ color: 'blue', marginLeft: '4px' }}>[{node.appliedRule}]</span>}
              </span>
            )}
            {node.children && Array.isArray(node.children) && node.children.map(child => (
              <VirtualNodeRenderer key={child.id || Math.random()} node={child} imagesMap={imagesMap} />
            ))}
          </>
        )}
      </div>
    );
  } catch (e) {
    console.error("VirtualNodeRenderer Error:", e);
    return null; // Fail gracefully instead of white screening
  }
};

const GridOverlay = ({ show, width, breakpoint }) => {
  if (!show) return null;
  const config = BREAKPOINTS_CONFIG[breakpoint];
  if (!config) return null;
  
  const { columns, margin, gutter } = config.grid;
  
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 9999, display: 'flex',
      padding: `0 ${margin}px`, gap: `${gutter}px`,
      boxSizing: 'border-box'
    }}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: 'rgba(255, 0, 0, 0.08)', height: '100%' }} />
      ))}
    </div>
  );
};

const GeneratorCanvas = () => {
  const [breakpoint, setBreakpoint] = useState('Medium');
  const [orientation, setOrientation] = useState('Landscape');
  const [scale, setScale] = useState(0.8);
  const [showGrid, setShowGrid] = useState(false);
  const workspaceRef = useRef(null);
  const { figmaData, figmaImages, preGeneratedLayouts } = useContext(ChatContext);

  // Auto-detect breakpoint based on root frame dimensions
  useEffect(() => {
    if (figmaData && figmaData.absoluteBoundingBox) {
      const w = figmaData.absoluteBoundingBox.width;
      const h = figmaData.absoluteBoundingBox.height;
      const isPortrait = h >= w;
      const minDimension = Math.min(w, h);
      
      let matchedBp = 'Medium';
      if (minDimension < 600) matchedBp = 'Compact';
      else if (minDimension >= 600 && minDimension < 840) matchedBp = 'Medium';
      else if (minDimension >= 840 && minDimension < 1200) matchedBp = 'Expanded';
      else if (minDimension >= 1200 && minDimension < 1600) matchedBp = 'Large';
      else if (minDimension >= 1600) matchedBp = 'Extra Large';

      setBreakpoint(matchedBp);
      
      // Compact is forced portrait. Extra large typically landscape, but we respect actual aspect.
      if (matchedBp === 'Compact') {
        setOrientation('Portrait');
      } else {
        setOrientation(isPortrait ? 'Portrait' : 'Landscape');
      }
    }
  }, [figmaData]);

  const layouts = useMemo(() => {
    if (preGeneratedLayouts && Object.keys(preGeneratedLayouts).length > 0) {
      // If we have pre-generated layouts from Figma URL params, use them!
      return preGeneratedLayouts;
    }
    if (!figmaData) return null;
    try {
      return generateVirtualLayouts(figmaData);
    } catch (e) {
      console.error("Layout Generation Error:", e);
      return null;
    }
  }, [figmaData, preGeneratedLayouts]);

  const activeLayout = useMemo(() => {
    if (!layouts || Object.keys(layouts).length === 0) return null;
    return layouts[breakpoint]?.[orientation] || layouts[breakpoint]?.['Portrait'] || null;
  }, [layouts, breakpoint, orientation]);

  const handleBreakpointChange = (bp) => {
    setBreakpoint(bp);
    if (bp === 'Extra Large' && orientation === 'Portrait') {
      setOrientation('Landscape');
    } else if (bp === 'Compact' && orientation === 'Landscape') {
      setOrientation('Portrait');
    }
  };

  const getCanvasDimensions = () => {
    if (activeLayout) {
      return { w: activeLayout.size.width, h: activeLayout.size.height };
    }
    const isPortrait = orientation === 'Portrait';
    switch (breakpoint) {
      case 'Compact': return { w: 390, h: 844 };
      case 'Medium': return isPortrait ? { w: 820, h: 1180 } : { w: 800, h: 712 };
      case 'Expanded': return isPortrait ? { w: 1024, h: 1366 } : { w: 1024, h: 768 };
      case 'Large': return isPortrait ? { w: 1200, h: 1980 } : { w: 1366, h: 1024 };
      case 'Extra Large': return { w: 1920, h: 1200 };
      default: return { w: 800, h: 712 };
    }
  };

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const updateScale = () => {
      const width = workspace.clientWidth;
      const height = workspace.clientHeight;
      const padding = 64; // Ensure 32px padding on each side

      const { w, h } = getCanvasDimensions();
      const scaleX = (width - padding) / w;
      const scaleY = (height - padding) / h;
      
      // Scale to fit within container, max scale is 1
      setScale(Math.min(scaleX, scaleY, 1));
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [breakpoint, orientation]);

  return (
    <div className="generator-canvas-container">
      <div className="generator-toolbar">
        <div className="toolbar-left">
          <div className="breakpoint-toggles" style={{ marginRight: '8px', flexShrink: 0 }}>
            {['Compact', 'Medium', 'Expanded', 'Large', 'Extra Large'].map(bp => (
              <button 
                key={bp}
                className={`bp-btn ${breakpoint === bp ? 'active' : ''}`}
                onClick={() => handleBreakpointChange(bp)}
              >{bp}</button>
            ))}
          </div>
          <div className="breakpoint-toggles" style={{ flexShrink: 0 }}>
            <button 
              className={`bp-btn ${orientation === 'Landscape' ? 'active' : ''}`}
              onClick={() => breakpoint !== 'Compact' && setOrientation('Landscape')}
              style={{ opacity: breakpoint !== 'Compact' ? 1 : 0.4, cursor: breakpoint !== 'Compact' ? 'pointer' : 'not-allowed' }}
              title={breakpoint === 'Compact' ? 'Landscape not available' : ''}
            >Landscape</button>
            <button 
              className={`bp-btn ${orientation === 'Portrait' ? 'active' : ''}`}
              onClick={() => breakpoint !== 'Extra Large' && setOrientation('Portrait')}
              style={{ opacity: breakpoint !== 'Extra Large' ? 1 : 0.4, cursor: breakpoint !== 'Extra Large' ? 'pointer' : 'not-allowed' }}
              title={breakpoint === 'Extra Large' ? 'Portrait not available' : ''}
            >Portrait</button>
          </div>
        </div>

        <div className="toolbar-right">
          <button 
            className={`bp-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid System"
            style={{ marginRight: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Grid3X3 size={16} /> Grid
          </button>
          <button className="btn btn-primary" style={{ padding: '0 24px', height: '38px', fontSize: '14px' }}>Go to Figma</button>
        </div>
      </div>
      
      <div className="canvas-workspace" ref={workspaceRef}>
        <div 
          className={`canvas-preview-box bp-${breakpoint.toLowerCase().replace(' ', '-')} ori-${orientation.toLowerCase()}`}
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'center center',
            width: `${getCanvasDimensions().w}px`,
            height: `${getCanvasDimensions().h}px`,
            position: 'relative'
          }}
        >
          {activeLayout ? (
            <div key={`${breakpoint}-${orientation}`} className="canvas-content-wrapper">
              <VirtualNodeRenderer node={activeLayout.vNode} imagesMap={figmaImages} />
              <GridOverlay show={showGrid} width={activeLayout.size.width} breakpoint={breakpoint} />
            </div>
          ) : (
            <div className="placeholder-content">
              <p>Canvas Preview Area</p>
              <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                {breakpoint} - {orientation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratorCanvas;

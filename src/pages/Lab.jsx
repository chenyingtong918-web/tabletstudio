import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GeneratorCanvas from '../components/GeneratorCanvas';
import { ChatContext } from '../data/ChatContext';
import { parseFigmaUrl, fetchFigmaNode, fetchFigmaImage } from '../utils/figmaApi';
import { transformFigmaNodeToVirtualNode } from '../utils/layoutEngine';
import { Loader2 } from 'lucide-react';
import './Lab.css';

const Lab = () => {
  const [searchParams] = useSearchParams();
  const figmaUrl = searchParams.get('figmaUrl');
  const md_p = searchParams.get('md_p');
  const md_l = searchParams.get('md_l');
  const ex_p = searchParams.get('ex_p');
  const ex_l = searchParams.get('ex_l');
  const lg_p = searchParams.get('lg_p');
  const lg_l = searchParams.get('lg_l');
  const xl = searchParams.get('xl');

  const { setFigmaData, setFigmaImages, setPreGeneratedLayouts } = useContext(ChatContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!figmaUrl) return;

    const loadFigmaData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const figmaMatch = parseFigmaUrl(figmaUrl);
        if (!figmaMatch) {
          throw new Error('无效的 Figma 链接格式');
        }

        // Always fetch the original figma data
        const nodeData = await fetchFigmaNode(figmaMatch.fileKey, figmaMatch.nodeId);
        setFigmaData(nodeData);

        // Map layout nodes if they exist in query params
        const layoutKeys = [
          { key: 'Medium_Portrait', id: md_p },
          { key: 'Medium_Landscape', id: md_l },
          { key: 'Expanded_Portrait', id: ex_p },
          { key: 'Expanded_Landscape', id: ex_l },
          { key: 'Large_Portrait', id: lg_p },
          { key: 'Large_Landscape', id: lg_l },
          { key: 'Extra Large_Landscape', id: xl }
        ].filter(item => item.id);

        let mergedImagesMap = {};

        // Helper function to fetch images for a node
        const fetchImagesForNode = async (node) => {
          if (node && node.children && Array.isArray(node.children)) {
            const childIds = node.children.map(c => c.id).join(',');
            if (childIds) {
              try {
                const imagesMap = await fetchFigmaImage(figmaMatch.fileKey, childIds);
                mergedImagesMap = { ...mergedImagesMap, ...imagesMap };
              } catch (imgError) {
                console.error("Failed to fetch figma images:", imgError);
              }
            }
          }
        };

        // Fetch images for original node (children images for dynamic layouts)
        await fetchImagesForNode(nodeData);

        if (layoutKeys.length > 0) {
          // ALSO fetch the root image for nodeData so Compact Portrait is 1:1
          try {
            const rootImageMap = await fetchFigmaImage(figmaMatch.fileKey, nodeData.id);
            if (rootImageMap) {
              mergedImagesMap = { ...mergedImagesMap, ...rootImageMap };
            }
          } catch (e) {
            console.error("Failed to fetch root image for original node", e);
          }

          // Fetch pre-generated layouts concurrently
          const fetchPromises = layoutKeys.map(async ({ key, id }) => {
            try {
              const layoutNode = await fetchFigmaNode(figmaMatch.fileKey, id);
              // Fetch root image for 1:1 perfect rendering
              const rootImageMap = await fetchFigmaImage(figmaMatch.fileKey, id);
              if (rootImageMap) {
                mergedImagesMap = { ...mergedImagesMap, ...rootImageMap };
              }
              return { key, layoutNode };
            } catch (err) {
              console.error(`Failed to fetch node ${id}`, err);
              return null;
            }
          });

          const results = await Promise.all(fetchPromises);
          
          const preGenMap = {
            Compact: {
              Portrait: {
                vNode: transformFigmaNodeToVirtualNode(nodeData),
                size: { width: nodeData.absoluteBoundingBox?.width || 0, height: nodeData.absoluteBoundingBox?.height || 0 }
              }
            }
          };
          results.forEach(result => {
            if (result && result.layoutNode) {
              const [breakpoint, orientation] = result.key.split('_');
              if (!preGenMap[breakpoint]) preGenMap[breakpoint] = {};
              preGenMap[breakpoint][orientation] = {
                vNode: transformFigmaNodeToVirtualNode(result.layoutNode),
                size: { width: result.layoutNode.absoluteBoundingBox?.width || 0, height: result.layoutNode.absoluteBoundingBox?.height || 0 }
              };
            }
          });

          setPreGeneratedLayouts(preGenMap);
        } else {
          setPreGeneratedLayouts(null);
        }

        setFigmaImages(mergedImagesMap);

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadFigmaData();
  }, [figmaUrl, md_p, md_l, ex_p, ex_l, lg_p, lg_l, xl, setFigmaData, setFigmaImages, setPreGeneratedLayouts]);

  return (
    <div className="lab-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
      {isLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.8)', zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <Loader2 className="animate-spin" size={48} color="#007AFF" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', fontWeight: 500, color: '#333' }}>正在从 Figma 并发拉取 8 个真实画板数据...</p>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: '#FFF3F3', color: '#D8000C', padding: '12px',
          textAlign: 'center', borderBottom: '1px solid #FFD2D2', zIndex: 101
        }}>
          Figma 数据拉取失败: {error}
        </div>
      )}

      <GeneratorCanvas />
    </div>
  );
};

export default Lab;

/**
 * Utility functions to interact with the Figma REST API.
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Get the user's PAT from localStorage
const getHeaders = () => {
  const token = localStorage.getItem('figma_pat');
  if (!token) {
    throw new Error("Figma Personal Access Token is missing. Please add it in Settings.");
  }
  return {
    'X-Figma-Token': token
  };
};

/**
 * Extracts file_key and node_id from a Figma URL
 * @param {string} url - The Figma URL
 * @returns { {fileKey: string, nodeId: string | null} | null }
 */
export const parseFigmaUrl = (text) => {
  // Typical URLs:
  // https://www.figma.com/design/FILE_KEY/Title?node-id=NODE_ID&t=...
  
  // Extract the actual URL string if the user pasted it with text
  const urlMatch = text.match(/https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s]+/);
  if (!urlMatch) return null;
  const figmaUrl = urlMatch[0];
  
  const figmaUrlRegex = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]{22,})\//;
  const match = figmaUrl.match(figmaUrlRegex);
  
  if (!match) return null;
  
  const fileKey = match[1];
  
  // Try to extract node-id if present
  let nodeId = null;
  try {
    const urlObj = new URL(figmaUrl);
    const nodeIdParam = urlObj.searchParams.get('node-id');
    if (nodeIdParam) {
      // Figma uses hyphens in URL, but the API expects colons. 
      nodeId = nodeIdParam.replace('-', ':');
    }
  } catch (e) {
    // Invalid URL structure, but regex matched.
  }

  // We enforce nodeId for previews to prevent fetching the entire document
  if (!nodeId) {
    throw new Error("请确保你复制的是某个图层（Frame）的链接，而不是整个文件的链接（链接里需要包含 node-id 参数）。");
  }

  return { fileKey, nodeId };
};

/**
 * Fetch a specific node from a Figma file.
 * If nodeId is null, fetches the entire file document (can be huge, not recommended).
 */
export const fetchFigmaNode = async (fileKey, nodeId) => {
  let endpoint = `${FIGMA_API_BASE}/files/${fileKey}`;
  if (nodeId) {
    endpoint += `/nodes?ids=${nodeId}`;
  }

  const response = await fetch(endpoint, { headers: getHeaders() });
  
  if (!response.ok) {
    if (response.status === 403) throw new Error("Invalid Figma Token or unauthorized.");
    if (response.status === 404) throw new Error("Figma file or node not found.");
    throw new Error(`Figma API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // If we fetched specific nodes, the structure is data.nodes[nodeId].document
  // If we fetched the whole file, the structure is data.document
  if (nodeId) {
    if (!data.nodes || !data.nodes[nodeId] || !data.nodes[nodeId].document) {
      throw new Error(`找不到图层 (Node-ID: ${nodeId})。请检查链接是否正确，或者该图层是否被删除。`);
    }
    return data.nodes[nodeId].document;
  } else if (data.document) {
    return data.document;
  }
  
  throw new Error("Could not parse Figma node data.");
};

/**
 * Fetch the rendered image URL for specific nodes
 * @param {string} fileKey
 * @param {string} nodeIds - Comma separated list of node IDs
 */
export const fetchFigmaImage = async (fileKey, nodeIds, format = 'png', scale = 1) => {
  if (!nodeIds) throw new Error("nodeIds is required to fetch image.");
  
  const endpoint = `${FIGMA_API_BASE}/images/${fileKey}?ids=${nodeIds}&format=${format}&scale=${scale}`;
  const response = await fetch(endpoint, { headers: getHeaders() });
  
  if (!response.ok) {
    throw new Error(`Figma Image API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.images) {
    return data.images; // Returns a map of { nodeId: imageUrl }
  }
  
  throw new Error("Could not retrieve image URL from Figma.");
};

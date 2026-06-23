import { transformFigmaNodeToVirtualNode } from './src/utils/layoutEngine.js';

const mockFigmaNode = {
  id: "1:1",
  name: "Compact Portrait",
  type: "FRAME",
  absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
  children: [
    {
      id: "2:1",
      name: "Header",
      type: "FRAME",
      absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 100 },
      children: [
        { id: "3:1", type: "TEXT", name: "Title" }
      ]
    },
    {
      id: "2:2",
      name: "Image",
      type: "RECTANGLE",
      absoluteBoundingBox: { x: 20, y: 120, width: 350, height: 200 }
    }
  ]
};

const vNode = transformFigmaNodeToVirtualNode(mockFigmaNode);
console.log("Root vNode:", JSON.stringify(vNode, null, 2));


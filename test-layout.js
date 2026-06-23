import { generateVirtualLayouts, transformFigmaNodeToVirtualNode } from './src/utils/layoutEngine.js';
import fs from 'fs';

// Mock figma node
const mockData = {
  id: "0:1",
  name: "Mock Frame",
  type: "FRAME",
  absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
  children: [
    {
      id: "0:2",
      name: "dialog",
      type: "FRAME",
      absoluteBoundingBox: { x: 10, y: 10, width: 370, height: 200 },
      children: [
        {
          id: "0:3",
          name: "button",
          type: "FRAME",
          absoluteBoundingBox: { x: 20, y: 20, width: 100, height: 40 }
        }
      ]
    }
  ]
};

try {
  const layouts = generateVirtualLayouts(mockData);
  console.log("Success! Layouts generated:", layouts.length);
  // check for NaN or Infinity
  const dialog = layouts[0].vNode.children[0];
  console.log("Dialog width:", dialog.width, "height:", dialog.height);
} catch (e) {
  console.error("CRASH!", e);
}

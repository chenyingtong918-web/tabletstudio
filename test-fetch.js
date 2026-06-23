import { fetchFigmaNode } from './src/utils/figmaApi.js';

// Setup fake localStorage
global.localStorage = {
  getItem: () => 'YOUR_FIGMA_TOKEN'
};
global.fetch = async (url, options) => {
  const https = await import('https');
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: async () => JSON.parse(data)
      }));
    });
    req.on('error', reject);
    req.end();
  });
};

async function run() {
  try {
    const data = await fetchFigmaNode('KysAAQhMONK8LtPEmAaECr', '119-23803');
    console.log("Root:", data.name);
    console.log("Children:");
    data.children.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, Width: ${c.absoluteBoundingBox?.width}, Height: ${c.absoluteBoundingBox?.height}`);
    });
  } catch (e) {
    console.error(e);
  }
}
run();

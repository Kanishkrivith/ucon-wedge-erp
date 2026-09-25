const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let key = '';
for (const line of env.split('\n')) {
  if (line.trim().startsWith('GEMINI_API_KEY=')) {
    key = line.trim().substring('GEMINI_API_KEY='.length).replace(/^['"]|['"]$/g, '');
  }
}

async function run() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
  const data = await res.json();
  const flashModels = (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''));
  console.log('Available generateContent models:\n', flashModels);
}
run().catch(console.error);

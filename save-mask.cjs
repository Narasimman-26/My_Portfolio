const fs = require('fs');
const content = fs.readFileSync('C:/Users/P.Narasimman/.gemini/antigravity/brain/3c9dbdd6-337a-48af-b795-908cfc4a7a6d/.system_generated/steps/628/output.txt', 'utf8').trim();
let base64Data = content;
if (base64Data.startsWith('"') && base64Data.endsWith('"')) {
  base64Data = JSON.parse(base64Data);
}
const clean = base64Data.replace(/^data:image\/png;base64,/, '');
const buf = Buffer.from(clean, 'base64');
fs.writeFileSync('public/paint-splash-mask.png', buf);
console.log('Saved public/paint-splash-mask.png, bytes:', buf.length);

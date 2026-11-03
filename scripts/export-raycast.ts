import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { raycastExtension } from '../server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'music-player-raycast');

async function exportRaycast() {
  console.log('🚀 Exporting Raycast Extension...');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`\nCreating extension in: ${outDir}`);

  const { files } = raycastExtension;

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content as string);
    console.log(`✅ Created ${filePath}`);
  }

  // Add .gitignore
  fs.writeFileSync(
    path.join(outDir, '.gitignore'),
    `node_modules/\ndist/\n.DS_Store\n*.m4a\ndownloads/\n`
  );

  // Copy extension icon if available
  const iconSrc = path.join(root, 'assets', 'extension-icon.png');
  const iconDestDir = path.join(outDir, 'assets');
  if (fs.existsSync(iconSrc)) {
    if (!fs.existsSync(iconDestDir)) fs.mkdirSync(iconDestDir, { recursive: true });
    fs.copyFileSync(iconSrc, path.join(iconDestDir, 'extension-icon.png'));
    console.log('✅ Created assets/extension-icon.png');
  }

  console.log('\n✨ Export Complete!');
  console.log('--------------------------------------------------');
  console.log('Next Steps:');
  console.log(`1. cd ${outDir}`);
  console.log('2. npm install');
  console.log('3. npm run dev');
  console.log('4. Follow Raycast UI to link the extension.');
  console.log('5. To publish: npm run publish');
  console.log('--------------------------------------------------');
}

exportRaycast();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'music-player-raycast');

async function exportRaycast() {
  console.log('🚀 Exporting Raycast Extension...');

  // Create output directory
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    // We fetch the files from the local server logic
    // Since we are in the same repo, we can just import the logic or simulate the API response
    // For simplicity, we'll hit the actual API if the server is running, or we can mock the data
    // But since I have access to the file system, I'll just write the files directly based on the logic in api.ts
    
    // For this environment, I'll provide a clean script that user can run
    console.log(`\nCreating extension in: ${outDir}`);

    // Files are hardcoded in api.ts, I will replicate that here for a one-click export
    const res = await fetch('http://localhost:3000/api/raycast-files');
    const data = await res.json();

    if (!data.files) {
      throw new Error('Could not fetch raycast files. Is the server running? (npm run start)');
    }

    for (const [filePath, content] of Object.entries(data.files)) {
      const fullPath = path.join(outDir, filePath as string);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, content as string);
      console.log(`✅ Created ${filePath}`);
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

  } catch (err: any) {
    console.error('❌ Export failed:', err.message);
    console.log('\nTip: Make sure the app is running in another terminal (npm run dev) before running this script.');
  }
}

exportRaycast();

const fs = require('fs');

let content = fs.readFileSync('src/routes/admin.tsx', 'utf-8');

// Add import
if (!content.includes('import { MapPicker }')) {
  content = content.replace(
    'import { DashboardShell, type MenuItem } from "@/components/DashboardShell";',
    'import { DashboardShell, type MenuItem } from "@/components/DashboardShell";\nimport { MapPicker } from "@/components/MapPicker";'
  );
}

const targetStr = `<div className="space-y-1.5">
            <Label>Radius (Meter)</Label>
            <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} />
          </div>
        </div>`;

const replacement = `<div className="space-y-1.5">
            <Label>Radius (Meter)</Label>
            <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} />
          </div>
          <div className="pt-2">
            <Label className="mb-2 block text-sm font-medium">Tentukan Titik Lokasi</Label>
            <MapPicker 
              latitude={Number(latitude) || -2.533300} 
              longitude={Number(longitude) || 140.717400} 
              radius={Number(radius) || 0} 
              onChange={(lat, lng) => {
                setLatitude(String(lat));
                setLongitude(String(lng));
              }} 
            />
          </div>
        </div>`;

// Replace all occurrences (which should be 2: TambahKantor and EditKantor)
content = content.split(targetStr).join(replacement);
// Fallback if line endings differ
const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');
content = content.split(targetStrCRLF).join(replacement);

fs.writeFileSync('src/routes/admin.tsx', content, 'utf-8');
console.log('Patched admin.tsx successfully');

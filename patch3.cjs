const fs = require('fs');

let content = fs.readFileSync('src/routes/admin.tsx', 'utf-8');

const targetStr = `          (err) => {
            console.warn("Geolocation error", err);
          }
        );`;

const replacement = `          (err) => {
            console.warn("Geolocation error", err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );`;

content = content.replace(targetStr, replacement);
content = content.replace(targetStr.replace(/\n/g, '\r\n'), replacement);

fs.writeFileSync('src/routes/admin.tsx', content, 'utf-8');
console.log('Patched admin.tsx geolocation options successfully');

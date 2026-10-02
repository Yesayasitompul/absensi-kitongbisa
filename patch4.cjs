const fs = require('fs');

let content = fs.readFileSync('src/routes/pegawai.tsx', 'utf-8');

const targetStr = `  const sisaCuti = (profile?.jatah_cuti ?? 0) - terpakaiCuti;`;
const replacement = `  const sisaCuti = (profile?.jatah_cuti ?? 12) - terpakaiCuti;`;

content = content.replace(targetStr, replacement);
content = content.replace(targetStr.replace(/\n/g, '\r\n'), replacement);

fs.writeFileSync('src/routes/pegawai.tsx', content, 'utf-8');
console.log('Patched sisaCuti default successfully');

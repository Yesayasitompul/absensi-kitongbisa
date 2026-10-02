const fs = require('fs');

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf-8');
  content = content.replace(/import kbfLogo from [^\n]+;\n?/g, '');
  content = content.replace(/src=\{kbfLogo\.url\}/g, 'src="/favicon.png"');
  fs.writeFileSync(filepath, content, 'utf-8');
}

patchFile('src/routes/auth.tsx');
patchFile('src/components/DashboardShell.tsx');
patchFile('src/components/PageShell.tsx');
console.log('Patched all logos');

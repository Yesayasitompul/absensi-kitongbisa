const fs = require('fs');
let content = fs.readFileSync('src/integrations/supabase/client.server.ts', 'utf-8');
content = content.replace(
  'const SUPABASE_URL = process.env.SUPABASE_URL;',
  'const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;'
);
fs.writeFileSync('src/integrations/supabase/client.server.ts', content, 'utf-8');
console.log('Patched client.server.ts');

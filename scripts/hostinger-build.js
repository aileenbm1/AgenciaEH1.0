// Compilación para desplegar el repositorio directamente en Hostinger (GitHub o ZIP del código).
// Hostinger corre en la raíz: `npm install` (dependencias de ejecución) y `npm run build` (este script).
// Resultado, junto a server.js / start.js:
//   web/  → sitio Next.js compilado (modo standalone, con sus propios node_modules)
//   api/  → API NestJS compilada (sus dependencias vienen del node_modules de la raíz)
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const run = (cmd, cwd) => { console.log(`▶ ${cmd}  (${path.relative(ROOT, cwd) || '.'})`); execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }); };
const copy = (from, to) => fs.cpSync(path.join(ROOT, from), path.join(ROOT, to), { recursive: true, verbatimSymlinks: true });
const clean = (dir) => fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });

// 1) Sitio
run('npm ci --include=dev --no-audit --no-fund', path.join(ROOT, 'frontend'));
execSync('npm run build', { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
clean('web');
copy('frontend/.next/standalone', 'web');
copy('frontend/.next/static', 'web/.next/static');
copy('frontend/public', 'web/public');

// 2) API
run('npm ci --include=dev --no-audit --no-fund', path.join(ROOT, 'backend'));
run('npm run build', path.join(ROOT, 'backend'));
clean('api');
for (const f of ['dist', 'database', 'scripts', 'package.json', '.env.example']) copy(`backend/${f}`, `api/${f}`);

// 3) Liberar espacio: las dependencias de compilación ya no se necesitan.
clean('frontend/node_modules'); clean('backend/node_modules');
console.log('✔ Agencia EH compilada: arranca con `npm start` (server.js).');

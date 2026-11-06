#!/usr/bin/env bash
# Genera los paquetes compilados para subir a Hostinger (Node.js Web Apps o VPS).
#
#   bash scripts/build-hostinger.sh
#
# Resultado en deploy/:
#   agencia-eh-frontend.zip  → sitio Next.js (modo standalone). Arranca con: node server.js
#   agencia-eh-api.zip       → API NestJS compilada.            Arranca con: node dist/main.js
#
# Ambos ZIP incluyen sus node_modules de producción, así que funcionan sin
# compilar en el servidor. Las URLs y credenciales se configuran con variables
# de entorno en Hostinger; no hace falta recompilar al cambiar de dominio.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy"
STAGE="$OUT/.stage"
command -v zip >/dev/null || { echo "Falta el comando 'zip' (apt-get install zip)."; exit 1; }

rm -rf "$OUT"
mkdir -p "$STAGE/frontend" "$STAGE/api"

echo "▶ Compilando frontend…"
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
npm run build

STANDALONE="$ROOT/frontend/.next/standalone"
[ -f "$STANDALONE/server.js" ] || { echo "No se encontró .next/standalone/server.js"; exit 1; }
cp -R "$STANDALONE/." "$STAGE/frontend/"
mkdir -p "$STAGE/frontend/.next"
cp -R "$ROOT/frontend/.next/static" "$STAGE/frontend/.next/static"
cp -R "$ROOT/frontend/public" "$STAGE/frontend/public"
cp "$ROOT/frontend/.env.example" "$STAGE/frontend/.env.example"
# package.json de despliegue: sin script de build (ya está compilado).
node -e '
const src=require(process.argv[1]); const lock=require(process.argv[2]);
const v=n=>lock.packages["node_modules/"+n].version;
const pkg={name:src.name,version:src.version,private:true,
  scripts:{start:"node server.js",build:"echo \"Ya compilado: no hace falta build\""},
  dependencies:{next:v("next"),react:v("react"),"react-dom":v("react-dom")},
  engines:{node:">=20.9"}};
require("fs").writeFileSync(process.argv[3],JSON.stringify(pkg,null,2)+"\n");
' "$ROOT/frontend/package.json" "$ROOT/frontend/package-lock.json" "$STAGE/frontend/package.json"
rm -f "$STAGE/frontend/.env" "$STAGE/frontend/.env.local"

echo "▶ Compilando API…"
cd "$ROOT/backend"
npm ci --no-audit --no-fund
npm run build
cp -R dist scripts database package.json package-lock.json .env.example "$STAGE/api/"
cd "$STAGE/api"
npm ci --omit=dev --no-audit --no-fund
node -e '
const f=process.argv[1],p=require(f);
p.scripts={start:"node dist/main.js",build:"echo \"Ya compilado: no hace falta build\"","db:check":p.scripts["db:check"],"admin:create":p.scripts["admin:create"]};
delete p.devDependencies;
require("fs").writeFileSync(f,JSON.stringify(p,null,2)+"\n");
' "$STAGE/api/package.json"
rm -f package-lock.json

echo "▶ Empaquetando…"
(cd "$STAGE/frontend" && zip -qr -y "$OUT/agencia-eh-frontend.zip" .)
(cd "$STAGE/api" && zip -qr -y "$OUT/agencia-eh-api.zip" .)
rm -rf "$STAGE"

echo
echo "Listo:"
ls -lh "$OUT"/*.zip
echo "Sigue la guía docs/DESPLIEGUE-HOSTINGER.md para subirlos."

# Despliegue en Hostinger

Agencia EH tiene dos aplicaciones Node.js y una base MySQL:

| Pieza | Paquete | Arranque | Dominio sugerido |
|---|---|---|---|
| Sitio (Next.js) | `deploy/agencia-eh-frontend.zip` | `node server.js` | `tudominio.com` |
| API (NestJS) | `deploy/agencia-eh-api.zip` | `node dist/main.js` | `api.tudominio.com` |
| Base de datos | `backend/database/schema.sql` | — | MySQL de Hostinger |

> **Requisito:** un plan de Hostinger que ejecute Node.js (planes con *Node.js Web Apps*, como Business o Cloud, o un VPS). El hosting compartido básico solo sirve PHP y no puede ejecutar estas aplicaciones.

El navegador solo habla con el sitio: el sitio reenvía `/api/v1/*` a la API (proxy interno). Por eso **no hace falta CORS** ni compilar con el dominio: la dirección de la API se indica con la variable `API_URL` y se puede cambiar sin recompilar.

---

## 1. Generar los paquetes compilados

En tu computadora (Node.js 20 o superior):

```bash
bash scripts/build-hostinger.sh
```

Se crean `deploy/agencia-eh-frontend.zip` y `deploy/agencia-eh-api.zip`. Ya incluyen sus `node_modules`, así que no hace falta compilar en el servidor.

## 2. Base de datos MySQL

1. hPanel → **Bases de datos → MySQL**: crea la base y su usuario. Apunta host, nombre, usuario y contraseña.
2. Abre **phpMyAdmin**, selecciona la base e importa `backend/database/schema.sql`.

## 3. API (NestJS)

1. hPanel → **Sitios web → Agregar sitio web → Aplicación Node.js** (el nombre exacto del menú puede variar). Usa el subdominio `api.tudominio.com`.
2. Elige **Subir archivos** y sube `agencia-eh-api.zip`.
3. Configuración:
   - Versión de Node.js: **20 o superior** (recomendado 22).
   - Archivo de entrada: `dist/main.js` (o comando de inicio `npm start`).
   - Comando de build: déjalo vacío (o `npm run build`, que no hace nada porque ya está compilado).
4. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | El host de MySQL que muestra hPanel (normalmente `localhost`) |
   | `DB_PORT` | `3306` |
   | `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Datos de la base del paso 2 |
   | `JWT_ACCESS_SECRET` | Texto aleatorio de 32+ caracteres |
   | `JWT_REFRESH_SECRET` | **Otro** texto aleatorio de 32+ caracteres |
   | `WEB_ORIGIN` | `https://tudominio.com` |

   Hostinger define `PORT` por su cuenta; no lo cambies. Para generar secretos: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
5. Despliega y comprueba que `https://api.tudominio.com/api/v1/health` responde `{"status":"ok",...}`.
6. Crea el administrador desde la terminal de la aplicación (o por SSH, dentro de su carpeta):

   ```bash
   npm run admin:create -- admin@tudominio.com "Nombre Apellido" "una-contraseña-segura"
   ```

   Si no tienes terminal, regístrate normalmente en el sitio y en phpMyAdmin cambia `Role` a `ADMIN` en la tabla `Users`.

## 4. Sitio (Next.js)

1. Crea otra **Aplicación Node.js** para `tudominio.com` y sube `agencia-eh-frontend.zip`.
2. Configuración:
   - Versión de Node.js: **20 o superior**.
   - Archivo de entrada: `server.js` (o comando de inicio `npm start`).
   - Comando de build: vacío.
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `API_URL` | `https://api.tudominio.com/api/v1` |

4. Despliega y abre `https://tudominio.com`. Activa el **SSL** de ambos dominios en hPanel: la cookie de sesión exige HTTPS en producción.

## 5. Alternativa: VPS de Hostinger

Con un VPS (Ubuntu) las dos aplicaciones pueden vivir en el mismo servidor:

```bash
sudo apt-get install -y unzip nginx mysql-server
sudo npm install -g pm2
```

```bash
mkdir -p ~/agencia-eh/web ~/agencia-eh/api
unzip agencia-eh-frontend.zip -d ~/agencia-eh/web
unzip agencia-eh-api.zip -d ~/agencia-eh/api
```

Crea `~/agencia-eh/api/.env` a partir de `.env.example` (con `PORT=4000`) y arranca:

```bash
cd ~/agencia-eh/api && pm2 start dist/main.js --name eh-api
```

```bash
cd ~/agencia-eh/web && PORT=3000 API_URL=http://127.0.0.1:4000/api/v1 pm2 start server.js --name eh-web --update-env
```

```bash
pm2 save && pm2 startup
```

En Nginx basta con publicar el sitio (`proxy_pass http://127.0.0.1:3000;`); la API queda interna y el sitio la consulta por `127.0.0.1`. Activa HTTPS con Certbot.

## 6. Actualizar una versión

1. `git pull` y `bash scripts/build-hostinger.sh`.
2. Sube los ZIP nuevos a cada aplicación y vuelve a desplegar (las variables de entorno se conservan).
3. Si cambió el esquema, respalda la base antes de importar el SQL nuevo.

## Problemas comunes

- **El catálogo sale vacío o «API no disponible»**: revisa `API_URL` en el sitio y que `/api/v1/health` de la API responda.
- **La API no arranca, «No fue posible conectar con MySQL»**: revisa `DB_HOST` y las credenciales; si la base está en otro servidor, habilita *MySQL remoto* en hPanel para la IP de la aplicación.
- **La API no arranca, «Configura secretos JWT»**: faltan `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` o tienen menos de 32 caracteres.
- **Se cierra la sesión al recargar**: el sitio no está en HTTPS; la cookie `Secure` no se guarda en HTTP.

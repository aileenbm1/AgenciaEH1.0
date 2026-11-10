# Despliegue en Hostinger

Agencia EH tiene dos aplicaciones Node.js y una base MySQL:

| Pieza | Paquete | Arranque | Dominio sugerido |
|---|---|---|---|
| Sitio (Next.js) | `deploy/agencia-eh-frontend.zip` | `node server.js` | `tudominio.com` |
| API (NestJS) | `deploy/agencia-eh-api.zip` | `node dist/main.js` | `api.tudominio.com` |
| Base de datos | `backend/database/schema.sql` | — | MySQL de Hostinger |
| **Sitio + API juntos** | `deploy/agencia-eh-sitio-unico.zip` | `node start.js` | `tudominio.com` |

> **Requisito:** un plan de Hostinger que ejecute Node.js (planes con *Node.js Web Apps*, como Business o Cloud, o un VPS). El hosting compartido básico solo sirve PHP y no puede ejecutar estas aplicaciones.

El navegador solo habla con el sitio: el sitio reenvía `/api/v1/*` a la API (proxy interno). Por eso **no hace falta CORS** ni compilar con el dominio: la dirección de la API se indica con la variable `API_URL` y se puede cambiar sin recompilar.

---

## Opción A (recomendada): todo en UN solo sitio

`deploy/agencia-eh-sitio-unico.zip` trae el sitio y la API juntos. `start.js` arranca la API como servicio interno (en `127.0.0.1`, con un puerto libre asignado por el sistema) y el sitio en el puerto que asigna Hostinger. No necesitas subdominio para la API.

### Si el dominio ya tiene un sitio PHP
Hostinger no convierte un sitio PHP en Node.js; hay que crear uno nuevo con el mismo dominio:
1. Respalda el sitio PHP si tiene algo que conservar (hPanel → **Archivos → Copias de seguridad**).
2. hPanel → **Sitios web** → en el sitio PHP, **⋮ → Eliminar sitio web**. Esto libera el dominio. Las bases de datos MySQL se administran aparte; confirma que no borras la que vas a usar.
3. hPanel → **Sitios web → Agregar sitio web → Aplicaciones Node.js** y elige ese mismo dominio.

> Necesitas un plan con Node.js (Business o Cloud). Si no aparece la opción *Aplicaciones Node.js*, el plan no lo incluye y hay que mejorarlo.

### Subir el paquete
1. Elige **Subir archivos** y sube `agencia-eh-sitio-unico.zip`.
2. Configuración:
   - Versión de Node.js: **20 o superior** (recomendado 22).
   - Framework: *Otro* / *Express* (no *Next.js*, porque ya viene compilado).
   - Archivo de entrada: `start.js`.
   - Comando de build: vacío (o `npm run build`, que no hace nada).
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | Host de MySQL que muestra hPanel (normalmente `localhost`) |
   | `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Datos de tu base |
   | `JWT_ACCESS_SECRET` | Texto aleatorio de 32+ caracteres |
   | `JWT_REFRESH_SECRET` | **Otro** texto aleatorio de 32+ caracteres |

   | `ADMIN_EMAILS` | (Opcional) Correos de administradores separados por comas. Esas personas se registran normalmente y pasan a ADMIN al registrarse o iniciar sesión. Quitar un correo de la lista **no** le retira el rol (eso se hace en phpMyAdmin). |
   | `UPLOADS_DIR` | (Opcional) Carpeta de las fotos. Por defecto `~/agencia-eh-uploads`, fuera de la app, para que subir un ZIP nuevo no las borre. |

   | `SMTP_HOST` | `smtp.hostinger.com` (para enviar correos de recuperación y verificación) |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | Cuenta de correo creada en hPanel → Correos (p. ej. `no-reply@tudominio.com`) |
   | `SMTP_PASSWORD` | Contraseña de esa cuenta de correo |
   | `MAIL_FROM` | (Opcional) Remitente, p. ej. `Agencia EH <no-reply@tudominio.com>` |

   | `PUBLIC_SIGNUP` | (Opcional) `false` para cerrar el registro público. Por defecto está abierto: compradores entran al instante; agentes, agencias y desarrolladores quedan por aprobar. |

   No pongas `API_URL` ni `PORT`: `start.js` y Hostinger los configuran solos.
4. Despliega y activa el **SSL** del dominio. Las tablas se crean solas al arrancar si no existen (también puedes importar `backend/database/schema.sql` en phpMyAdmin).
5. Comprueba `https://tudominio.com/api/v1/health` → `{"status":"ok",...,"tablas":{"ok":true,...}}`.
6. Crea el administrador desde la terminal de la aplicación: `npm run admin:create -- admin@tudominio.com "Nombre" "contraseña-segura"`.

Si la base de datos está mal configurada, el sitio sigue abriendo (el catálogo indica que la API no está disponible) y el error aparece en el registro de la aplicación.

## Opción B: sitio y API por separado

Útil si prefieres la API en su propio subdominio. Usa `agencia-eh-frontend.zip` y `agencia-eh-api.zip` con los pasos 3 y 4.

## 1. Generar los paquetes compilados

En tu computadora (Node.js 20 o superior):

```bash
bash scripts/build-hostinger.sh
```

Se crean `deploy/agencia-eh-sitio-unico.zip` (opción A), `deploy/agencia-eh-frontend.zip` y `deploy/agencia-eh-api.zip` (opción B). Ya incluyen sus `node_modules`, así que no hace falta compilar en el servidor.

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

- **No llegan los correos de recuperación/verificación**: revisa en `/api/v1/health` el campo `correo`: `configured:false` = faltan variables `SMTP_*`; `lastError` = motivo del último fallo (p. ej. contraseña del correo incorrecta). Revisa también la carpeta de spam.

- **«La API no está disponible»** (paquete de un solo sitio): abre `https://tudominio.com/api/v1/health`. El campo `api.error` dice el motivo exacto (por ejemplo `Faltan las variables: DB_NAME…` o `ER_ACCESS_DENIED_ERROR` si la contraseña de MySQL es incorrecta). La API se reintenta sola con espera creciente (30 s, 1, 2, 4… hasta 15 min), pero si cambias variables de entorno vuelve a desplegar.
- **Por qué la API usa `net.Server#listen`**: Hostinger ejecuta las apps con LiteSpeed (`lsnode`), que solo atiende la primera llamada a `http.Server#listen` del proceso y manda la salida estándar a `/dev/null`. El sitio usa esa primera llamada; la API escucha por otra vía en `127.0.0.1` con un puerto libre que asigna el sistema (en hosting compartido `127.0.0.1` es común a todas las cuentas y un puerto fijo como 4000 puede estar ocupado por otra). Mientras la API no está lista, el sitio no reenvía ninguna petición.

- **El catálogo sale vacío o «API no disponible»**: revisa `API_URL` en el sitio y que `/api/v1/health` de la API responda.
- **La API no arranca, «No fue posible conectar con MySQL»**: revisa `DB_HOST` y las credenciales; si la base está en otro servidor, habilita *MySQL remoto* en hPanel para la IP de la aplicación.
- **La API no arranca, «Configura secretos JWT»**: faltan `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` o tienen menos de 32 caracteres.
- **Se cierra la sesión al recargar**: el sitio no está en HTTPS; la cookie `Secure` no se guarda en HTTP.

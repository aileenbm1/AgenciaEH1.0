# Guía de uso con capturas y video

Herramientas que generan la guía por tipo de usuario (visitante, comprador, agente,
agencia, desarrolladora y administrador) a partir del sitio corriendo con los datos de prueba.

1. `reset.sh` deja la base local con `datos-prueba.sql` y una cuenta `admin.demo@example.com`
   (contraseña `PruebaEH2026`). Solo para una base de pruebas: borra los usuarios que no son administradores.
2. `node recorrido.js <carpeta>` recorre el sitio en `http://localhost:3900` con Playwright:
   toma las capturas (`<carpeta>/img`), graba un video por tipo de usuario (`<carpeta>/video`)
   y escribe `pasos.json`. La carpeta debe tener un `tile.png` (fondo para los mapas).
3. Une los videos con ffmpeg (ver comandos en la conversación de la versión 0.19) y
   `python3 generar.py <carpeta>` arma `index.html` con las capturas, los pasos y el video.

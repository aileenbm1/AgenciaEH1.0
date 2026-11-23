// Punto de entrada estándar para Hostinger: su detector reconoce una app Express
// por un server.js que usa Express. La API de Agencia EH es NestJS sobre Express;
// el arranque completo (sitio Next.js + API) está en start.js.
require('express');
require('./start.js');

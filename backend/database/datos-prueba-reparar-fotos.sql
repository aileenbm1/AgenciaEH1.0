-- ============================================================================
-- Agencia EH · CAMBIAR LAS FOTOS DE LOS DATOS DE PRUEBA
-- Reemplaza las fotos de las propiedades de prueba por las fotos nuevas
-- (residencias, casas coloniales e interior de departamento).
-- Solo toca las fotos de prueba (Id que empieza con d3e01): las borra y las
-- vuelve a crear. No modifica propiedades, usuarios ni tus datos reales.
-- Requiere el ZIP 0.15.1 o posterior (trae las fotos en /demo/).
-- IMPORTANTE: antes de importar, selecciona tu base u291620803_AgenciaEH en la
-- lista de la izquierda de phpMyAdmin.
-- ============================================================================
SET NAMES utf8mb4;
DELETE FROM PropertyImages WHERE Id LIKE 'd3e01%';
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01010-0000-4000-8000-000000001010','d3e00101-0000-4000-8000-000000000101','/demo/residencia-1.jpg','Casa con jardín en El Molino',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01011-0000-4000-8000-000000001011','d3e00101-0000-4000-8000-000000000101','/demo/residencia-6.jpg','Casa con jardín en El Molino',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01020-0000-4000-8000-000000001020','d3e00102-0000-4000-8000-000000000102','/demo/departamento-interior.jpg','Departamento amueblado cerca de Plaza Mayor',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01030-0000-4000-8000-000000001030','d3e00103-0000-4000-8000-000000000103','/demo/residencia-2.jpg','Residencia en Campestre con alberca',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01031-0000-4000-8000-000000001031','d3e00103-0000-4000-8000-000000000103','/demo/residencia-3.jpg','Residencia en Campestre con alberca',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01032-0000-4000-8000-000000001032','d3e00103-0000-4000-8000-000000000103','/demo/residencia-4.jpg','Residencia en Campestre con alberca',2);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01040-0000-4000-8000-000000001040','d3e00104-0000-4000-8000-000000000104','/demo/local-10.jpg','Local comercial sobre Blvd. López Mateos',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01050-0000-4000-8000-000000001050','d3e00105-0000-4000-8000-000000000105','/demo/colonial-fachada.jpg','Casa colonial en el centro de Guanajuato',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01051-0000-4000-8000-000000001051','d3e00105-0000-4000-8000-000000000105','/demo/colonial-patio.jpg','Casa colonial en el centro de Guanajuato',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01060-0000-4000-8000-000000001060','d3e00106-0000-4000-8000-000000000106','/demo/departamento-interior.jpg','Departamento para estudiantes cerca de la UG',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01070-0000-4000-8000-000000001070','d3e00107-0000-4000-8000-000000000107','/demo/residencia-5.jpg','Casa en fraccionamiento con vigilancia',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01080-0000-4000-8000-000000001080','d3e00108-0000-4000-8000-000000000108','/demo/terreno-8.jpg','Terreno habitacional en Silao',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01090-0000-4000-8000-000000001090','d3e00109-0000-4000-8000-000000000109','/demo/oficina-12.jpg','Oficina ejecutiva en Celaya',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01091-0000-4000-8000-000000001091','d3e00109-0000-4000-8000-000000000109','/demo/oficina-13.jpg','Oficina ejecutiva en Celaya',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01100-0000-4000-8000-000000001100','d3e00110-0000-4000-8000-000000000110','/demo/colonial-vista.jpg','Casa con vista en San Miguel de Allende',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01101-0000-4000-8000-000000001101','d3e00110-0000-4000-8000-000000000110','/demo/colonial-patio.jpg','Casa con vista en San Miguel de Allende',1);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01110-0000-4000-8000-000000001110','d3e00111-0000-4000-8000-000000000111','/demo/departamento-interior.jpg','Departamento nuevo en preventa',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01120-0000-4000-8000-000000001120','d3e00112-0000-4000-8000-000000000112','/demo/local-11.jpg','Bodega industrial en Irapuato',0);
INSERT IGNORE INTO PropertyImages(Id,PropertyId,Url,Alt,Position) VALUES('d3e01140-0000-4000-8000-000000001140','d3e00114-0000-4000-8000-000000000114','/demo/terreno-9.jpg','Terreno sin papeles (rechazado)',0);

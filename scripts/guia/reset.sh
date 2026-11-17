#!/usr/bin/env bash
# Deja la base de prueba como recién instalada con los datos demo (para grabar la guía).
set -e
cd /home/user/AgenciaEH1.0/backend
mysql --default-character-set=utf8mb4 agenciaeh -e "DELETE FROM Users WHERE Email IN ('admin.demo@example.com','admin.prueba@example.com')"
mysql --default-character-set=utf8mb4 agenciaeh < database/borrar-usuarios-excepto-admin.sql > /dev/null
mysql --default-character-set=utf8mb4 agenciaeh -e "DELETE FROM Fanpages; DELETE FROM FanpageVersions; DELETE FROM FanpageEvents; DELETE FROM SiteSettings;"
mysql --default-character-set=utf8mb4 agenciaeh < database/datos-prueba.sql
H=$(node -e "require('bcryptjs').hash('PruebaEH2026',10).then(h=>console.log(h))")
mysql --default-character-set=utf8mb4 agenciaeh -e "INSERT INTO Users(Id,Email,FullName,PasswordHash,Role,EmailVerifiedAt) VALUES(UUID(),'admin.demo@example.com','Administración Agencia EH','$H','ADMIN',UTC_TIMESTAMP());
UPDATE Properties SET Latitude=21.1619, Longitude=-101.6921, ShowExactLocation=0 WHERE Id='d3e00102-0000-4000-8000-000000000102';
UPDATE Properties SET Latitude=21.0190, Longitude=-101.2574, ShowExactLocation=1 WHERE Id='d3e00105-0000-4000-8000-000000000105';
UPDATE Properties SET Latitude=21.1236, Longitude=-101.6800, ShowExactLocation=0 WHERE Id='d3e00101-0000-4000-8000-000000000101';
UPDATE Properties SET Latitude=20.6767, Longitude=-101.3563, ShowExactLocation=0 WHERE Id='d3e00107-0000-4000-8000-000000000107';"
echo "datos listos"

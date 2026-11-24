-- ============================================================================
-- Mi Casa · ACTIVAR RENTA POR NOCHE, SEMANA Y MES EN TODAS LAS RENTAS
--
-- Para las propiedades en renta que tengan configuradas sus reservas solo por
-- mes (o sin noche/semana), activa también "Por noche" y "Por semana".
-- Respeta los precios que ya existan; si falta alguno, lo calcula de la renta
-- mensual (noche = renta ÷ 30, semana = renta ÷ 4, redondeados hacia arriba).
-- Las propiedades sin configuración ya aceptan las tres modalidades: no se tocan.
--
-- Cómo usarlo: phpMyAdmin → selecciona tu base → pestaña "SQL" → pega todo → Continuar.
-- Se puede ejecutar más de una vez.
-- ============================================================================
SET NAMES utf8mb4;
UPDATE RentalSettings rs
JOIN Properties p ON p.Id = rs.PropertyId
SET rs.Enabled = 1,
    rs.Modes = 'NIGHTLY,WEEKLY,MONTHLY',
    rs.NightPrice = COALESCE(rs.NightPrice, CEIL((CASE WHEN p.Operation = 'BOTH' THEN p.RentPrice ELSE p.Price END) / 30 / 10) * 10),
    rs.WeekPrice  = COALESCE(rs.WeekPrice,  CEIL((CASE WHEN p.Operation = 'BOTH' THEN p.RentPrice ELSE p.Price END) / 4 / 50) * 50),
    rs.MinStay = LEAST(rs.MinStay, 30),
    rs.UpdatedAt = UTC_TIMESTAMP()
WHERE p.Operation IN ('RENT', 'BOTH')
  AND (CASE WHEN p.Operation = 'BOTH' THEN p.RentPrice ELSE p.Price END) > 0;

-- Resultado: cada renta con sus modalidades y precios.
SELECT p.Title, rs.Modes, rs.NightPrice AS PrecioNoche, rs.WeekPrice AS PrecioSemana,
       (CASE WHEN p.Operation = 'BOTH' THEN p.RentPrice ELSE p.Price END) AS RentaMensual
FROM RentalSettings rs JOIN Properties p ON p.Id = rs.PropertyId
WHERE p.Operation IN ('RENT', 'BOTH');

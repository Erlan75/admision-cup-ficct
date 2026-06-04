-- ==========================================
-- TRIGGERS Y DISPARADORES - POSTGRESQL 18
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- Automatización e Integración de Reglas de Negocio
-- ==========================================

-- 1. Función disparadora para calcular el promedio ponderado y estado de aprobación
-- Ponderación: Parcial 1 (30%), Parcial 2 (30%), Examen Final (40%)
-- Nota de aprobación: mayor o igual a 60.00 puntos (regla institucional FICCT/CUP)
CREATE OR REPLACE FUNCTION fn_trg_01_calcular_nota()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular promedio ponderado dinámicamente
    NEW.promedio_ponderado := (NEW.parcial_1 * 0.30) + (NEW.parcial_2 * 0.30) + (NEW.examen_final * 0.40);

    -- Determinar estado lógico de aprobación de forma automatizada
    IF NEW.promedio_ponderado >= 60.00 THEN
        NEW.estado_aprobacion := TRUE;
    ELSE
        NEW.estado_aprobacion := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Definición del disparador antes de inserciones o actualizaciones en la tabla calificaciones
CREATE OR REPLACE TRIGGER trg_01_calcular_nota
BEFORE INSERT OR UPDATE ON calificaciones
FOR EACH ROW
EXECUTE FUNCTION fn_trg_01_calcular_nota();


-- 3. Trigger adicional para registrar automáticamente eventos de auditoría en bitácoras
CREATE OR REPLACE FUNCTION fn_trg_02_auditar_calificaciones()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bitacoras (user_id, accion, tabla_afectada, ip_address, v_data_json)
    VALUES (
        NULL, -- Se asocia mediante auditoría de base de datos
        TG_OP, 
        'calificaciones', 
        '127.0.0.1', 
        row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Definición del disparador de auditoría para calificaciones
CREATE OR REPLACE TRIGGER trg_02_auditar_calificaciones
AFTER INSERT OR UPDATE OR DELETE ON calificaciones
FOR EACH ROW
EXECUTE FUNCTION fn_trg_02_auditar_calificaciones();

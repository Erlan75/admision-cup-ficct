-- ==========================================
-- PROCEDIMIENTOS Y FUNCIONES EN POSTGRESQL 18
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- Lógica Operativa y de Planificación
-- ==========================================

-- 1. Procedimiento para asignar postulantes a grupos disponibles de forma balanceada
-- Aplica el control de capacidad máxima de 60 alumnos estricta por aula
CREATE OR REPLACE PROCEDURE prc_asignar_postulante_grupo(
    p_postulante_id BIGINT,
    p_materia_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_grupo_id BIGINT;
    v_capacidad_max INTEGER;
    v_inscritos INTEGER;
BEGIN
    -- Buscar un grupo para la materia dada que no haya excedido la capacidad estricta de su aula (máx 60)
    SELECT g.id, a.capacidad_fisica, g.cupo_inscritos 
    INTO v_grupo_id, v_capacidad_max, v_inscritos
    FROM grupos g
    JOIN aulas a ON g.aula_id = a.id
    WHERE g.materia_id = p_materia_id AND g.cupo_inscritos < a.capacidad_fisica
    ORDER BY g.cupo_inscritos ASC
    LIMIT 1;

    -- Si se encuentra un grupo con cupo disponible
    IF v_grupo_id IS NOT NULL THEN
        -- Insertar la inscripción correspondiente
        INSERT INTO inscripciones (postulante_id, grupo_id, fecha_inscripcion)
        VALUES (p_postulante_id, v_grupo_id, CURRENT_TIMESTAMP);

        -- Incrementar de forma atómica el cupo de inscritos del grupo
        UPDATE grupos 
        SET cupo_inscritos = cupo_inscritos + 1 
        WHERE id = v_grupo_id;
        
        RAISE NOTICE 'Postulante % inscrito exitosamente en el grupo %', p_postulante_id, v_grupo_id;
    ELSE
        -- Lanzar una excepción de negocio en caso de que no haya aulas disponibles
        RAISE EXCEPTION 'Capacidad excedida: No existen paralelos o aulas con cupos disponibles para la materia %', p_materia_id;
    END IF;
END;
$$;


-- 2. Función para obtener el estado académico actual de un postulante por su CI
CREATE OR REPLACE FUNCTION fn_obtener_estado_postulante(p_ci VARCHAR(20))
RETURNS TABLE (
    postulante_nombres VARCHAR(100),
    postulante_apellidos VARCHAR(100),
    promedio NUMERIC(5,2),
    aprobado BOOLEAN,
    estado VARCHAR(30)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.nombres, p.apellidos, c.promedio_ponderado, c.estado_aprobacion, p.estado_final
    FROM postulantes p
    LEFT JOIN inscripciones i ON p.id = i.postulante_id
    LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
    WHERE p.ci = p_ci
    LIMIT 1;
END;
$$;

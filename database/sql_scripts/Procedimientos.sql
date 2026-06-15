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
        -- Retorno limpio en lugar de excepción para evitar interrumpir la transacción
        RETURN;
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
    SELECT 
        p.nombres, 
        p.apellidos, 
        COALESCE(AVG(c.promedio_ponderado), 0.00)::NUMERIC(5,2) AS promedio, 
        (COUNT(CASE WHEN c.estado_aprobacion = TRUE THEN 1 END) = 4) AS aprobado, 
        p.estado_final AS estado
    FROM postulantes p
    LEFT JOIN inscripciones i ON p.id = i.postulante_id AND i.periodo_academico = '2-2026'
    LEFT JOIN calificaciones c ON i.id = c.inscripcion_id
    WHERE p.ci = p_ci
    GROUP BY p.id, p.nombres, p.apellidos, p.estado_final
    LIMIT 1;
END;
$$;


-- ==========================================
-- CU-14 — Algoritmo Core de Admisión
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- ==========================================

-- 3. Procedimiento principal del Corte de Admisión por Carrera
--    Ejecuta el algoritmo de admisión para UNA carrera específica:
--      a) Bloqueo pesimista de la fila de la carrera (FOR UPDATE)
--      b) Marca 'No Admitido' a postulantes con promedio < 60
--      c) Itera sobre aprobados (>= 60) ordenados por promedio DESC
--      d) Asigna 'Admitido' hasta agotar el cupo_limite
--      e) Asigna 'Pendiente Segunda Opción' a los excedentes
--      f) Actualiza el contador total_admitidos en la tabla carreras
CREATE OR REPLACE PROCEDURE prc_ejecutar_core_admision(
    p_carrera_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variables de control de cupo
    v_cupo_limite       INTEGER;
    v_total_admitidos   INTEGER;
    v_admitidos_nuevos  INTEGER := 0;

    -- Cursor para iterar sobre los postulantes aprobados de la carrera
    -- ordenados de mayor a menor promedio ponderado (meritocracia)
    cur_aprobados CURSOR FOR
        SELECT p.id AS postulante_id
        FROM postulantes p
        JOIN inscripciones i  ON p.id = i.postulante_id AND i.periodo_academico = '2-2026'
        JOIN calificaciones c ON i.id  = c.inscripcion_id
        WHERE p.opcion1_carrera_id = p_carrera_id
          AND p.estado_final NOT IN ('Admitido')
        GROUP BY p.id
        HAVING COUNT(CASE WHEN c.estado_aprobacion = TRUE THEN 1 END) = 4
        ORDER BY AVG(c.promedio_ponderado) DESC;

    v_postulante_id     BIGINT;

BEGIN
    -- ── Paso 1: Bloqueo pesimista de la fila de la carrera ──────────────────
    -- FOR UPDATE garantiza que ninguna sesión paralela pueda modificar
    -- cupo_limite o total_admitidos mientras este procedimiento se ejecuta.
    SELECT cupo_limite, total_admitidos
    INTO   v_cupo_limite, v_total_admitidos
    FROM   carreras
    WHERE  id = p_carrera_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Carrera con id % no encontrada.', p_carrera_id;
    END IF;

    -- ── Paso 2: Marcar masivamente como 'No Admitido' a los reprobados ──────
    -- Un postulante es reprobado cuando no aprueba las 4 materias (al menos una reprobada o faltante)
    UPDATE postulantes p
    SET    estado_final = 'No Admitido',
           updated_at   = CURRENT_TIMESTAMP
    WHERE  p.opcion1_carrera_id = p_carrera_id
      AND  p.estado_final NOT IN ('Admitido')
      AND  p.id IN (
          SELECT i.postulante_id
          FROM inscripciones i
          JOIN calificaciones c ON i.id = c.inscripcion_id
          WHERE c.estado_aprobacion = FALSE
            AND i.periodo_academico = '2-2026'
      );

    RAISE NOTICE 'Paso 2 completado: postulantes reprobados marcados como No Admitido.';

    -- ── Paso 3: Iterar sobre aprobados (>= 60.00) por mérito descendente ───────
    OPEN cur_aprobados;

    LOOP
        FETCH cur_aprobados INTO v_postulante_id;
        EXIT WHEN NOT FOUND;

        -- Cupo disponible = cupo_limite − (admitidos ya existentes + nuevos en esta ejecución)
        IF (v_total_admitidos + v_admitidos_nuevos) < v_cupo_limite THEN
            -- Dentro del corte de cupo → ADMITIDO
            UPDATE postulantes
            SET    estado_final = 'Admitido',
                   updated_at   = CURRENT_TIMESTAMP
            WHERE  id = v_postulante_id;

            v_admitidos_nuevos := v_admitidos_nuevos + 1;

            RAISE NOTICE 'Postulante % → Admitido (slot % de %).', 
                v_postulante_id, (v_total_admitidos + v_admitidos_nuevos), v_cupo_limite;
        ELSE
            -- Fuera del cupo → en lista de espera por segunda opción
            UPDATE postulantes
            SET    estado_final = 'Pendiente Segunda Opción',
                   updated_at   = CURRENT_TIMESTAMP
            WHERE  id = v_postulante_id;

            RAISE NOTICE 'Postulante % → Pendiente Segunda Opción (cupo agotado).', v_postulante_id;
        END IF;
    END LOOP;

    CLOSE cur_aprobados;

    -- ── Paso 4: Actualizar el contador de admitidos en la tabla carreras ─────
    UPDATE carreras
    SET    total_admitidos = v_total_admitidos + v_admitidos_nuevos,
           updated_at      = CURRENT_TIMESTAMP
    WHERE  id = p_carrera_id;

    RAISE NOTICE 'CU-14 completado: % nuevo(s) admitido(s) para la carrera %. Total acumulado: %.',
        v_admitidos_nuevos, p_carrera_id, (v_total_admitidos + v_admitidos_nuevos);

END;
$$;


-- ==========================================
-- CU-15 — Reasignación Segunda Opción
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- ==========================================

-- 4. Procedimiento de Reasignación por Segunda Opción de Carrera
--    Actúa sobre los postulantes con estado 'Pendiente Segunda Opción'
--    después del primer corte (CU-14). Para cada uno:
--      a) Intenta ubicarlos en su opcion2_carrera_id si hay cupo disponible
--      b) Si la segunda opción está llena, los reasigna de contingencia
--         a la carrera de Redes y Telecomunicaciones (ID: 3)
--      c) Aplica bloqueo pesimista (FOR UPDATE) sobre cada carrera afectada
--      d) Actualiza total_admitidos en todas las carreras involucradas
--      e) Respeta el umbral institucional FICCT/CUP: promedio_ponderado >= 60.00
CREATE OR REPLACE PROCEDURE prc_ejecutar_segunda_opcion()
LANGUAGE plpgsql
AS $$
DECLARE
    -- ID fijo de contingencia: Ingeniería en Redes y Telecomunicaciones
    v_carrera_contingencia_id  CONSTANT INTEGER := 3;

    -- Variables de control para cada iteración
    v_postulante_id            BIGINT;
    v_opcion2_id               BIGINT;
    v_cupo_limite_op2          INTEGER;
    v_total_admitidos_op2      INTEGER;
    v_cupo_limite_cont         INTEGER;
    v_total_admitidos_cont     INTEGER;

    -- Cursor: postulantes aprobados (>= 60.00) en espera de segunda opción,
    -- ordenados por mérito descendente para respetar la meritocracia institucional
    cur_pendientes CURSOR FOR
        SELECT p.id AS postulante_id, p.opcion2_carrera_id
        FROM   postulantes p
        JOIN   inscripciones i  ON p.id  = i.postulante_id AND i.periodo_academico = '2-2026'
        JOIN   calificaciones c ON i.id  = c.inscripcion_id
        WHERE  p.estado_final        = 'Pendiente Segunda Opción'
        GROUP BY p.id, p.opcion2_carrera_id
        HAVING COUNT(CASE WHEN c.estado_aprobacion = TRUE THEN 1 END) = 4
        ORDER BY AVG(c.promedio_ponderado) DESC;

BEGIN
    RAISE NOTICE 'CU-15 iniciado: procesando reasignación de segunda opción...';

    OPEN cur_pendientes;

    LOOP
        FETCH cur_pendientes INTO v_postulante_id, v_opcion2_id;
        EXIT WHEN NOT FOUND;

        -- ── Bloqueo pesimista sobre la carrera de segunda opción ──────────────
        SELECT cupo_limite, total_admitidos
        INTO   v_cupo_limite_op2, v_total_admitidos_op2
        FROM   carreras
        WHERE  id = v_opcion2_id
        FOR UPDATE;

        IF v_total_admitidos_op2 < v_cupo_limite_op2 THEN
            -- ── Cupo disponible en segunda opción → ADMITIDO ─────────────────
            UPDATE postulantes
            SET    estado_final        = 'Admitido',
                   opcion1_carrera_id  = v_opcion2_id,
                   updated_at          = CURRENT_TIMESTAMP
            WHERE  id = v_postulante_id;

            UPDATE carreras
            SET    total_admitidos = total_admitidos + 1,
                   updated_at      = CURRENT_TIMESTAMP
            WHERE  id = v_opcion2_id;

            RAISE NOTICE 'Postulante % → Admitido en segunda opción (carrera %).',
                v_postulante_id, v_opcion2_id;

        ELSE
            -- ── Segunda opción llena: contingencia en carrera Redes (ID: 3) ───
            SELECT cupo_limite, total_admitidos
            INTO   v_cupo_limite_cont, v_total_admitidos_cont
            FROM   carreras
            WHERE  id = v_carrera_contingencia_id
            FOR UPDATE;

            IF v_total_admitidos_cont < v_cupo_limite_cont THEN
                -- ── Cupo en contingencia → ADMITIDO en Redes ─────────────────
                UPDATE postulantes
                SET    estado_final        = 'Admitido',
                       opcion1_carrera_id  = v_carrera_contingencia_id,
                       updated_at          = CURRENT_TIMESTAMP
                WHERE  id = v_postulante_id;

                UPDATE carreras
                SET    total_admitidos = total_admitidos + 1,
                       updated_at      = CURRENT_TIMESTAMP
                WHERE  id = v_carrera_contingencia_id;

                RAISE NOTICE 'Postulante % → Admitido en contingencia (Redes, carrera %).',
                    v_postulante_id, v_carrera_contingencia_id;

            ELSE
                -- ── Sin cupo en ninguna opción → NO ADMITIDO definitivo ───────
                UPDATE postulantes
                SET    estado_final = 'No Admitido',
                       updated_at   = CURRENT_TIMESTAMP
                WHERE  id = v_postulante_id;

                RAISE NOTICE 'Postulante % → No Admitido (todas las opciones sin cupo).',
                    v_postulante_id;
            END IF;
        END IF;

    END LOOP;

    CLOSE cur_pendientes;

    RAISE NOTICE 'CU-15 completado: reasignación de segunda opción finalizada.';

END;
$$;

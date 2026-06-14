-- ==========================================
-- DDL DE BASE DE DATOS - POSTGRESQL 18
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- Centralización del Esquema Físico Relacional
-- ==========================================

-- 1. Tabla: roles
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla: carreras
CREATE TABLE carreras (
    id BIGSERIAL PRIMARY KEY,
    nombre_carrera VARCHAR(100) UNIQUE NOT NULL,
    cupo_limite INTEGER NOT NULL,
    total_admitidos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: materias
CREATE TABLE materias (
    id BIGSERIAL PRIMARY KEY,
    sigla VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: aulas
CREATE TABLE aulas (
    id BIGSERIAL PRIMARY KEY,
    codigo_aula VARCHAR(50) UNIQUE NOT NULL,
    capacidad_fisica INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_capacidad_max CHECK (capacidad_fisica <= 60)
);

-- 5. Tabla: users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    rol_id BIGINT NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- 6. Tabla: bitacoras
CREATE TABLE bitacoras (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    ip_address TEXT NOT NULL,
    v_data_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bitacoras_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Tabla: postulantes
CREATE TABLE postulantes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo CHAR(1) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    colegio_procedencia VARCHAR(150),
    ciudad VARCHAR(50),
    opcion1_carrera_id BIGINT NOT NULL,
    opcion2_carrera_id BIGINT NOT NULL,
    estado_final VARCHAR(30) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_postulantes_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_postulantes_carreras_1 FOREIGN KEY (opcion1_carrera_id) REFERENCES carreras(id),
    CONSTRAINT fk_postulantes_carreras_2 FOREIGN KEY (opcion2_carrera_id) REFERENCES carreras(id)
);

-- 8. Tabla: documentos
CREATE TABLE documentos (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    url_archivo VARCHAR(255) NOT NULL,
    validado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documentos_postulantes FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE
);

-- 9. Tabla: pagos
CREATE TABLE pagos (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    transaccion_uuid VARCHAR(100) UNIQUE NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    estado_pago VARCHAR(20) DEFAULT 'Pendiente',
    fecha_pago TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagos_postulantes FOREIGN KEY (postulante_id) REFERENCES postulantes(id)
);

-- 10. Tabla: docentes
CREATE TABLE docentes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    especialidad_maestria VARCHAR(150) NOT NULL,
    diplomado_superior BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_docentes_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Tabla: grupos
CREATE TABLE grupos (
    id BIGSERIAL PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    aula_id BIGINT NOT NULL,
    nombre_paralelo VARCHAR(20) NOT NULL,
    cupo_inscritos INTEGER DEFAULT 0,
    dia_semana VARCHAR(20),
    hora_inicio TIME,
    hora_fin TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupos_materias FOREIGN KEY (materia_id) REFERENCES materias(id),
    CONSTRAINT fk_grupos_docentes FOREIGN KEY (docente_id) REFERENCES docentes(id),
    CONSTRAINT fk_grupos_aulas FOREIGN KEY (aula_id) REFERENCES aulas(id)
);

-- 12. Tabla: inscripciones
CREATE TABLE inscripciones (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inscripciones_postulantes FOREIGN KEY (postulante_id) REFERENCES postulantes(id),
    CONSTRAINT fk_inscripciones_grupos FOREIGN KEY (grupo_id) REFERENCES grupos(id)
);

-- 13. Tabla: calificaciones
CREATE TABLE calificaciones (
    id BIGSERIAL PRIMARY KEY,
    inscripcion_id BIGINT UNIQUE NOT NULL,
    parcial_1 NUMERIC(5,2) DEFAULT 0.00,
    parcial_2 NUMERIC(5,2) DEFAULT 0.00,
    examen_final NUMERIC(5,2) DEFAULT 0.00,
    promedio_ponderado NUMERIC(5,2) DEFAULT 0.00,
    estado_aprobacion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_calificaciones_inscripciones FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE CASCADE
);

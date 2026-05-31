-- ==========================================
-- SCRIPT DE POBLACIÓN (DML) - POSTGRESQL 18
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- Carga de Datos de Configuración Iniciales
-- ==========================================

-- 1. Insertar roles institucionales
INSERT INTO roles (nombre_rol, descripcion) VALUES
('Administrador', 'Rol administrativo central con privilegios totales de fiscalización y reportes'),
('Docente', 'Rol académico docente para el registro de calificaciones del examen'),
('Postulante', 'Rol por defecto asignado a los alumnos postulantes del CUP');

-- 2. Insertar carreras oficiales de la FICCT
INSERT INTO carreras (nombre_carrera, cupo_limite, total_admitidos) VALUES
('Ingeniería Informática', 150, 0),
('Ingeniería de Sistemas', 180, 0),
('Ingeniería en Redes y Telecomunicaciones', 120, 0),
('Ingeniería Robótica', 100, 0);

-- 3. Insertar materias básicas del examen CUP
INSERT INTO materias (sigla, nombre) VALUES
('MAT-101', 'Introducción a la Informática'),
('MAT-102', 'Cálculo I'),
('MAT-103', 'Física I');

-- 4. Insertar aulas con restricción de capacidad (tope estricto <= 60)
INSERT INTO aulas (codigo_aula, capacidad_fisica) VALUES
('Aula 236 - Bloque Nuevo', 60),
('Aula 237 - Bloque Nuevo', 50),
('Laboratorio L1 - Planta Baja', 40),
('Laboratorio L2 - Planta Baja', 40);

-- 5. Insertar usuarios administrativos y docentes de prueba
-- Nota: Contraseñas en texto plano de prueba encriptadas mediante hashes estándar
INSERT INTO users (rol_id, email, password_hash, full_name, is_active) VALUES
(1, 'garzon.admin@uagrm.edu.bo', '$2y$10$wN1Qy2J1wN1Qy2J1wN1Qy.e5F.xT/cTzVz1234567890123456789', 'Ing. Garzón Administrador', TRUE),
(2, 'docente.test@uagrm.edu.bo', '$2y$10$wN1Qy2J1wN1Qy2J1wN1Qy.e5F.xT/cTzVz1234567890123456789', 'Lic. Roberto Castro', TRUE);

-- 6. Asignar datos del docente de prueba
INSERT INTO docentes (user_id, especialidad_maestria, diplomado_superior) VALUES
(2, 'Maestría en Ingeniería de Software y Ciencia de Datos', TRUE);

-- 7. Registrar grupos de estudio asociados a docentes y aulas
INSERT INTO grupos (materia_id, docente_id, aula_id, nombre_paralelo, cupo_inscritos) VALUES
(1, 1, 1, 'Grupo A - Mañana', 0),
(2, 1, 2, 'Grupo B - Tarde', 0);

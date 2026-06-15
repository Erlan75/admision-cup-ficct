-- ==========================================
-- SCRIPT DE POBLACIÓN (DML) - POSTGRESQL 18
-- Sistema de Admisión CUP - FICCT (UAGRM)
-- Carga de Datos de Configuración Iniciales
-- ==========================================

-- 1. Insertar roles institucionales
INSERT INTO roles (nombre_rol, descripcion) VALUES
('Administrador', 'Rol administrativo central con privilegios totales de fiscalización y reportes'),
('Docente', 'Rol académico docente para el registro de calificaciones del examen'),
('Postulante', 'Rol por defecto asignado a los alumnos postulantes del CUP'),
('Autoridad', 'Rol directivo de fiscalización académica superior y lectura de reportes analíticos');

-- 2. Insertar carreras oficiales de la FICCT
INSERT INTO carreras (nombre_carrera, cupo_limite, total_admitidos) VALUES
('Ingeniería Informática', 150, 0),
('Ingeniería de Sistemas', 180, 0),
('Ingeniería en Redes y Telecomunicaciones', 120, 0),
('Ingeniería Robótica', 100, 0);

-- 3. Insertar materias básicas del examen CUP
INSERT INTO materias (sigla, nombre) VALUES
('COMP-101', 'Computación'),
('MAT-101', 'Matemáticas'),
('FIS-101', 'Física'),
('ING-101', 'Inglés');

-- 4. Insertar aulas con restricción de capacidad (tope estricto <= 60)
INSERT INTO aulas (codigo_aula, capacidad_fisica) VALUES
('Aula 236 - Bloque Nuevo', 60),
('Aula 237 - Bloque Nuevo', 60),
('Laboratorio L1 - Planta Baja', 60),
('Laboratorio L2 - Planta Baja', 60);

-- 5. Insertar usuarios administrativos y docentes de prueba
-- Nota: Contraseñas en texto plano de prueba encriptadas mediante hashes estándar
INSERT INTO users (rol_id, email, password_hash, full_name, is_active) VALUES
(1, 'garzon.admin@uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ing. Garzón Administrador', TRUE),
(2, 'carlos.perez@uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ing. Carlos Perez', TRUE),
(2, 'juana.gomez@uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'MSc. Juana Gomez', TRUE),
(2, 'alan.brito@uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Alan Brito', TRUE),
(2, 'sarah.smith@uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lic. Sarah Smith', TRUE);

INSERT INTO users (rol_id, email, password_hash, full_name, is_active) VALUES 
(4, 'autoridad@ficct.uagrm.edu.bo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Decano Ing. Nelson Saldaña', TRUE);

-- 6. Asignar datos del docente de prueba
INSERT INTO docentes (user_id, especialidad_maestria, diplomado_superior) VALUES
(2, 'Ciencias de la Computación', TRUE),
(3, 'Matemáticas Puras', TRUE),
(4, 'Ciencias Físicas', TRUE),
(5, 'Enseñanza de Inglés', TRUE);

-- 7. Registrar grupos de estudio asociados a docentes y aulas
INSERT INTO grupos (materia_id, docente_id, aula_id, nombre_paralelo, cupo_inscritos) VALUES
(1, 1, 1, 'Grupo A - COMP', 0),
(2, 2, 2, 'Grupo B - MAT', 0),
(3, 3, 3, 'Grupo C - FIS', 0),
(4, 4, 4, 'Grupo D - ING', 0);

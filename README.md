# Sistema de Admisión CUP - FICCT (UAGRM)

El **Sistema de Admisión CUP** es una plataforma web integral de alto rendimiento diseñada para la gestión, control, fiscalización y automatización del proceso del **CUP (Cupo Universitario de Preferencia)** de la **Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones (FICCT)** en la **Universidad Autónoma Gabriel René Moreno (UAGRM)**.

---

## 📌 Descripción del Proyecto

Este sistema centraliza de manera transaccional y robusta los principales flujos del CUP:
- **Autoinscripción de Alumnos**: Registro público externo y automatizado de postulantes cargando sus datos civiles e institucionales de forma segura.
- **Planificación de Opciones**: Soporte para la doble opción de carreras de ingeniería de la facultad.
- **Control de Evaluaciones**: Carga simplificada de notas parciales y examen final de alumnos por paralelo.
- **Grupos Dinámicos y Aulas**: Balanceo inteligente de asignación de cupos basado en el tope físico y estricto de **60 alumnos por aula**.
- **Panel Administrativo e Indicadores (Dashboard)**: Visualización en tiempo real de métricas, aprobados, reprobados y cantidad de paralelos dinámicos requeridos para fines organizativos.
- **Módulo de Fiscalización Académica**: Emisión de reportes listados generales, admitidos (aprobados) y no admitidos (reprobados).

---

## 🗄️ Arquitectura y Estructura del Ecosistema

El ecosistema está construido bajo un enfoque desacoplado, modular y altamente cohesivo, garantizando la transaccionalidad atómica y optimizando las consultas.

### 1. Base de Datos (PostgreSQL 18)
La persistencia física está centralizada en `database/sql_scripts/` e integrada mediante marcas de tiempo en las migraciones de Laravel. Destacan las siguientes características del motor relacional:
- **Triggers Nativos (`Triggers.sql`)**: 
  - `trg_01_calcular_nota`: Calcula automáticamente al hacer `INSERT` o `UPDATE` en la tabla `calificaciones` el promedio ponderado del estudiante (P1: 25%, P2: 25%, Final: 50%) y establece su `estado_aprobacion` de acuerdo con la nota mínima de **51.00 puntos**. Esto desliga completamente al servidor backend PHP del cálculo aritmético.
  - `trg_02_auditar_calificaciones`: Registra instantáneamente trazas JSONB en bitácoras cada vez que se modifican datos de exámenes.
- **Procedimientos de Negocio (`Procedimientos.sql`)**: 
  - `prc_asignar_postulante_grupo`: Automatiza la inscripción atómica en aulas balanceando los grupos de paralelos sin superar el tope estricto de **60 alumnos**.
- **Esquema Físico y Semilla (`Script.sql` y `Poblacion.sql`)**: Aseguran un esquema normalizado de 13 tablas relacionales pobladas con datos institucionales iniciales (roles, 4 ingenierías, materias oficiales, etc.).

### 2. Backend (Laravel 10 / PHP 8.2)
El servidor API proporciona robustez y transaccionalidad mediante los siguientes módulos:
- **Control de Autenticación (`AuthController`)**: Asegura el acceso utilizando **Laravel Sanctum** para el manejo de tokens.
- **Control de Postulantes (`PostulanteController`)**: Ejecuta registros mediante transacciones de base de datos (`DB::beginTransaction()`) garantizando consistencia total entre la cuenta de usuario (`users`) y los datos civiles del postulante (`postulantes`).
- **Control Académico (`AcademicoController`)**: Registra calificaciones y expone las métricas agregadas del panel administrativo.
- **Módulo de Reportes (`ReporteController`)**: Suministra los reportes oficiales utilizando optimización de consultas (*Eager Loading* con `with()`) y filtros eficientes basados en subconsultas relacionales (*whereHas*).

### 3. Frontend (React.js + TailwindCSS)
Ubicado en `resources/js/components/`, la interfaz visual está diseñada bajo un estilo **oscuro premium nocturno de alto contraste** con sutiles resplandores degradados:
- **`RegistroPostulante.jsx`**: Formulario público con validaciones locales en español y selectores dinámicos para las carreras de la FICCT.
- **`Login.jsx`**: Panel de acceso seguro que consume la API de Sanctum y almacena el estado de sesión local.
- **`DashboardAdmin.jsx`**: Cuadrícula de KPIs que despliega en tiempo real inscritos, aprobados, reprobados y grupos calculados.
- **`RegistroNotas.jsx`**: Formulario docente que interactúa con el disparador automático de PostgreSQL.
- **`PanelReportes.jsx`**: Módulo de fiscalización con pestañas interactivas y filtrado rápido por CI integrado en el cliente.

---

## 🚀 Endpoints de la API (Diccionario de Rutas)

| Método | Endpoint | Middleware | Controlador y Acción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/login` | Público | `AuthController@iniciarSesion` | Autentica al usuario y genera un token Sanctum |
| **POST** | `/api/postulantes/registro` | Público | `PostulanteController@registrar` | Autoregistro externo de nuevos postulantes del CUP |
| **POST** | `/api/logout` | `auth:sanctum` | `AuthController@cerrarSesion` | Revoca y elimina el token de acceso actual |
| **GET** | `/api/postulantes` | `auth:sanctum` | `PostulanteController@listar` | Listado completo de postulantes registrados |
| **GET** | `/api/postulantes/buscar/{ci}` | `auth:sanctum` | `PostulanteController@buscar` | Busca un postulante específico a través de su CI |
| **POST** | `/api/academicos/notas` | `auth:sanctum` | `AcademicoController@registrarNotas` | Registra/actualiza notas (el Trigger autocalcula el resultado) |
| **GET** | `/api/academicos/dashboard` | `auth:sanctum` | `AcademicoController@obtenerEstadisticasDashboard` | Devuelve KPIs globales y grupos dinámicos necesarios |
| **GET** | `/api/reportes/general` | `auth:sanctum` | `ReporteController@listaGeneral` | Reporte detallado general de todos los postulantes |
| **GET** | `/api/reportes/aprobados` | `auth:sanctum` | `ReporteController@postulantesAprobados` | Reporte filtrado de postulantes admitidos al CUP |
| **GET** | `/api/reportes/reprobados` | `auth:sanctum` | `ReporteController@postulantesReprobados` | Reporte filtrado de postulantes reprobados |

---

## 🛠️ Instrucciones de Despliegue Local

Sigue estos pasos secuenciales para clonar y ejecutar el proyecto en tu entorno local:

### Requisitos Previos
- **PHP** >= 8.2 (Asegúrate de habilitar `pdo_pgsql` y `pgsql` en tu `php.ini`)
- **Composer**
- **Node.js** & **npm**
- **PostgreSQL 18** (Con una base de datos creada llamada `parcial2_CUP`)

### Pasos de Instalación

1. **Clonar e instalar dependencias del Backend**:
   ```bash
   composer install
   ```

2. **Instalar dependencias del Frontend**:
   ```bash
   npm install
   ```

3. **Configurar el Entorno (`.env`)**:
   Duplica el archivo de ejemplo y configura tus credenciales de PostgreSQL:
   ```bash
   copy .env.example .env
   ```
   Ajusta los parámetros de conexión:
   ```env
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=parcial2_CUP
   DB_USERNAME=tu_usuario
   DB_PASSWORD=tu_contraseña
   ```

4. **Ejecutar las Migraciones del Sistema**:
   Levanta la estructura de base de datos de forma limpia:
   ```bash
   php artisan migrate:fresh
   ```

5. **Cargar los scripts PostgreSQL 18**:
   (Opcional si usas el cliente de Postgres) Ejecuta los scripts ubicados en `database/sql_scripts/` en el orden:
   `Script.sql` -> `Triggers.sql` -> `Procedimientos.sql` -> `Poblacion.sql`.

6. **Iniciar el Servidor Backend**:
   ```bash
   php artisan serve
   ```

7. **Iniciar el Servidor de Desarrollo Frontend**:
   ```bash
   npm run dev
   ```

---
Diseñado y construido de manera profesional para la FICCT - UAGRM.

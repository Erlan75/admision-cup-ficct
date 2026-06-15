<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\AcademicoController;
use App\Http\Controllers\ReporteController;

/*
|--------------------------------------------------------------------------
| Rutas de la API (API Routes)
|--------------------------------------------------------------------------
|
| Aquí es donde puedes registrar las rutas de la API para tu aplicación.
| Estas rutas son cargadas por el RouteServiceProvider y se les asignará
| el grupo de middleware "api".
|
*/

// ==========================================
// Rutas Públicas (Sin Autenticación)
// ==========================================

// Iniciar sesión (Generar token Sanctum)
Route::post('/login', [AuthController::class, 'iniciarSesion']);

// Ruta de despliegue temporal para inicializar la base de datos de producción
Route::get('/dev/deploy-db', function () {
    try {
        // Ejecutar migraciones
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true]);
        $output1 = \Illuminate\Support\Facades\Artisan::output();
        
        // Ejecutar scripts SQL
        $files = [
            database_path('sql_scripts/Script.sql'),
            database_path('sql_scripts/Poblacion.sql'),
            database_path('sql_scripts/Procedimientos.sql'),
            database_path('sql_scripts/Triggers.sql'),
        ];
        
        foreach ($files as $file) {
            if (!file_exists($file)) {
                throw new \Exception("File not found: " . basename($file));
            }
            $sql = file_get_contents($file);
            try {
                \Illuminate\Support\Facades\DB::unprepared($sql);
            } catch (\Exception $e) {
                $msg = $e->getMessage();
                if (str_contains($msg, 'already exists') || str_contains($msg, 'ya existe')) {
                    // Ignorar duplicados tal como hace load_sql.php
                } else {
                    throw $e;
                }
            }
        }
        $output2 = "SQL scripts loaded successfully.";
        
        // Ejecutar el sembrado
        ob_start();
        include base_path('tinker_seed.php');
        $output3 = ob_get_clean();
        
        return response()->json([
            'status' => 'success',
            'migrations' => $output1,
            'sql_load' => $output2,
            'seed' => $output3
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Registro externo/público de postulantes
Route::post('/postulantes/registro', [PostulanteController::class, 'registrar']);


// ==========================================
// Rutas Protegidas (Middleware auth:sanctum)
// ==========================================
Route::middleware('auth:sanctum')->group(function () {
    
    // Obtener los datos del usuario autenticado actual
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Cerrar sesión de usuario (revocar token)
    Route::post('/logout', [AuthController::class, 'cerrarSesion']);

    // --- Control de Postulantes ---
    // Listar todos los postulantes
    Route::get('/postulantes', [PostulanteController::class, 'listar']);
    
    // Buscar un postulante por su Cédula de Identidad (CI)
    Route::get('/postulantes/buscar/{ci}', [PostulanteController::class, 'buscar']);

    // CU-03 — Carga Masiva de Postulantes (CSV/Excel)
    Route::post('/postulantes/importar-lote', [PostulanteController::class, 'importarLoteCSV']);

    // CU-07 — Simulación de Pasarela de Pagos QR (Webhook)
    Route::post('/postulantes/webhook-pago-qr', [PostulanteController::class, 'simularPasarelaQR']);

    // --- Rutas del Portal del Estudiante ---
    Route::get('/estudiante/periodos', [PostulanteController::class, 'getPeriodosPostulante']);
    Route::get('/estudiante/notas/{periodo}', [PostulanteController::class, 'getNotasPostulante']);

    // --- Control Académico ---
    // CU-12 / CU-13: Registrar acta masiva de calificaciones (lote) con cálculo de promedios vía trigger
    Route::post('/academicos/notas', [AcademicoController::class, 'registrarNotas']);

    // Obtener indicadores clave de planificación y rendimiento para el Dashboard
    Route::get('/academicos/dashboard', [AcademicoController::class, 'obtenerEstadisticasDashboard']);

    // CU-12: Listar todos los grupos con sus inscritos y calificaciones actuales (pre-poblado de planilla)
    Route::get('/academicos/grupos', [AcademicoController::class, 'listarGruposConInscritos']);

    // CU-10 — Algoritmo de Distribución Áulica
    // Distribuye automáticamente los postulantes sin inscripción en grupos áulicos
    // invocando el procedimiento almacenado prc_asignar_postulante_grupo(p_postulante_id, p_materia_id)
    Route::post('/academicos/distribuir-aulas', [AcademicoController::class, 'distribuirPostulantesAulas']);

    // CU-14 — Algoritmo Core de Admisión
    // Ejecuta el corte de admisión por carrera: bloqueo pesimista, asignación por mérito
    // y actualización de cupos mediante prc_ejecutar_core_admision(p_carrera_id)
    Route::post('/academicos/corte-admision', [AcademicoController::class, 'procesarCorteAdmision']);

    // CU-15 — Reasignación Segunda Opción
    // Reasigna automáticamente los postulantes 'Pendiente Segunda Opción' a su carrera
    // alternativa o de contingencia (Redes, ID: 3) mediante prc_ejecutar_segunda_opcion()
    Route::post('/academicos/segunda-opcion', [AcademicoController::class, 'procesarSegundaOpcion']);

    // --- CU-16: Módulo de Reportes Obligatorios ---
    Route::prefix('reportes')->group(function () {
        Route::get('/general', [ReporteController::class, 'getReporteGeneral']);
        Route::get('/aprobados', [ReporteController::class, 'getReporteAprobados']);
        Route::get('/reprobados', [ReporteController::class, 'getReporteReprobados']);
        Route::get('/estadisticas', [ReporteController::class, 'getEstadisticasGlobales']);
        Route::get('/rendimiento-grupos', [ReporteController::class, 'getRendimientoGrupos']);
        Route::get('/bitacora', [ReporteController::class, 'getBitacoraLogs']);
    });

    // CU-11: Control de Choques de Horarios y Carga Docente
    Route::post('/academicos/grupos/asignar-docente', [AcademicoController::class, 'asignarDocenteGrupo']);
});

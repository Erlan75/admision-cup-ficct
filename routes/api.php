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

    // --- Control Académico ---
    // Registrar o actualizar notas
    Route::post('/academicos/notas', [AcademicoController::class, 'registrarNotas']);
    
    // Obtener indicadores clave de planificación y rendimiento para el Dashboard
    Route::get('/academicos/dashboard', [AcademicoController::class, 'obtenerEstadisticasDashboard']);

    // --- Módulo de Reportes ---
    // Reporte de lista general de postulantes
    Route::get('/reportes/general', [ReporteController::class, 'listaGeneral']);
    
    // Reporte de postulantes aprobados
    Route::get('/reportes/aprobados', [ReporteController::class, 'postulantesAprobados']);
    
    // Reporte de postulantes reprobados
    Route::get('/reportes/reprobados', [ReporteController::class, 'postulantesReprobados']);
});

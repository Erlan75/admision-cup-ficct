<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$carreras = App\Models\Carrera::select('id', 'nombre_carrera', 'cupo_limite', 'total_admitidos')->get()->toArray();
$postulantesCount = App\Models\Postulante::count();
$pagosCount = App\Models\Pago::count();
$gruposCount = App\Models\Grupo::count();
$inscripcionesCount = App\Models\Inscripcion::count();
$calificacionesCount = App\Models\Calificacion::count();

$grupos = App\Models\Grupo::with('materia')->get()->map(function($g) {
    return [
        'id' => $g->id,
        'nombre_paralelo' => $g->nombre_paralelo,
        'materia' => $g->materia->nombre,
        'cupo_inscritos' => $g->cupo_inscritos
    ];
})->toArray();

echo json_encode([
    'carreras' => $carreras,
    'postulantes_count' => $postulantesCount,
    'pagos_count' => $pagosCount,
    'grupos_count' => $gruposCount,
    'inscripciones_count' => $inscripcionesCount,
    'calificaciones_count' => $calificacionesCount,
    'grupos' => $grupos
], JSON_PRETTY_PRINT);

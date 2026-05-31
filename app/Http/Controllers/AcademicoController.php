<?php

namespace App\Http\Controllers;

use App\Models\Inscripcion;
use App\Models\Calificacion;
use App\Models\Grupo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AcademicoController extends Controller
{
    /**
     * Registrar o actualizar las notas parciales y finales de un alumno.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function registrarNotas(Request $request): JsonResponse
    {
        $request->validate([
            'inscripcion_id' => ['required', 'integer', 'exists:inscripciones,id'],
            'parcial_1' => ['required', 'numeric', 'between:0.00,100.00'],
            'parcial_2' => ['required', 'numeric', 'between:0.00,100.00'],
            'examen_final' => ['required', 'numeric', 'between:0.00,100.00'],
        ], [
            'inscripcion_id.exists' => 'La inscripción proporcionada no existe en el sistema.',
            'parcial_1.between' => 'La nota del Primer Parcial debe estar entre 0.00 y 100.00.',
            'parcial_2.between' => 'La nota del Segundo Parcial debe estar entre 0.00 y 100.00.',
            'examen_final.between' => 'La nota del Examen Final debe estar entre 0.00 y 100.00.',
        ]);

        // Buscar si ya existe una calificación registrada para la inscripción dada
        $calificacion = Calificacion::firstOrNew([
            'inscripcion_id' => $request->inscripcion_id,
        ]);

        // Asignar o actualizar únicamente los tres campos de las notas
        $calificacion->parcial_1 = $request->parcial_1;
        $calificacion->parcial_2 = $request->parcial_2;
        $calificacion->examen_final = $request->examen_final;

        // Guardar en la base de datos (aquí se disparará el Trigger trg_01_calcular_nota en PostgreSQL)
        $calificacion->save();

        // Refrescar el modelo para capturar los valores calculados dinámicamente por el Trigger en la BD
        $calificacion->refresh();

        return response()->json([
            'mensaje' => 'Notas del examen registradas con éxito en el sistema.',
            'calificacion' => $calificacion->load('inscripcion.postulante'),
        ]);
    }

    /**
     * Obtener los indicadores clave de rendimiento académico para el Dashboard.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerEstadisticasDashboard(): JsonResponse
    {
        // 1. Total de inscritos
        $totalInscritos = Inscripcion::count();

        // 2. Total de aprobados
        $totalAprobados = Calificacion::where('estado_aprobacion', true)->count();

        // 3. Total de reprobados
        $totalReprobados = Calificacion::where('estado_aprobacion', false)->count();

        // 4. Cantidad de grupos dinámicos necesarios basados en la capacidad física máxima estricta de 60 por aula
        $gruposNecesarios = ceil($totalInscritos / 60);

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'total_aprobados' => $totalAprobados,
            'total_reprobados' => $totalReprobados,
            'grupos_necesarios_calculados' => (int) $gruposNecesarios,
        ]);
    }
}

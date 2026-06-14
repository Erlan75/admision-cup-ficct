<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use App\Models\Calificacion;
use App\Models\Materia;
use App\Models\Grupo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    /**
     * Retornar todos los postulantes registrados con sus relaciones principales.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReporteGeneral(): JsonResponse
    {
        // Eager Loading estricto para evitar N+1
        $postulantes = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2', 'inscripciones.calificacion'])->get();

        return response()->json($postulantes);
    }

    /**
     * Retornar la lista de postulantes aprobados en el examen (>= 60).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReporteAprobados(): JsonResponse
    {
        $aprobados = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2', 'inscripciones.calificacion'])
            ->whereHas('inscripciones.calificacion', function ($query) {
                $query->where('estado_aprobacion', true);
            }, '=', 4)
            ->get();

        return response()->json($aprobados);
    }

    /**
     * Retornar la lista de postulantes reprobados en el examen (< 60).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReporteReprobados(): JsonResponse
    {
        $reprobados = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2', 'inscripciones.calificacion'])
            ->whereHas('inscripciones.calificacion', function ($query) {
                $query->where('estado_aprobacion', false);
            })
            ->get();

        return response()->json($reprobados);
    }

    /**
     * Retornar métricas globales del proceso de admisión.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEstadisticasGlobales(): JsonResponse
    {
        $totalInscritos = Postulante::has('inscripciones')->count();
        $promedioGeneral = Calificacion::avg('promedio_ponderado') ?? 0;

        // Desglose por materia
        $materias = Materia::withCount('grupos as total_grupos')
            ->get()
            ->map(function ($materia) {
                $inscritosMateria = DB::table('inscripciones')
                    ->join('grupos', 'inscripciones.grupo_id', '=', 'grupos.id')
                    ->where('grupos.materia_id', $materia->id)
                    ->count();

                $promedioMateria = DB::table('calificaciones')
                    ->join('inscripciones', 'calificaciones.inscripcion_id', '=', 'inscripciones.id')
                    ->join('grupos', 'inscripciones.grupo_id', '=', 'grupos.id')
                    ->where('grupos.materia_id', $materia->id)
                    ->avg('promedio_ponderado');

                return [
                    'materia' => $materia->nombre,
                    'inscritos' => $inscritosMateria,
                    'promedio' => round((float) $promedioMateria, 2),
                    'aulas_proyectadas' => ceil($inscritosMateria / 60)
                ];
            });

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'promedio_general' => round((float) $promedioGeneral, 2),
            'desglose_materias' => $materias
        ]);
    }

    /**
     * Retornar el ranking de rendimiento por grupos (mayor cantidad de aprobados).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getRendimientoGrupos(): JsonResponse
    {
        $ranking = Grupo::with(['materia', 'docente.usuario', 'aula'])
            ->withCount(['inscripciones as total_aprobados' => function ($query) {
                $query->whereHas('calificacion', function ($q) {
                    $q->where('promedio_ponderado', '>=', 60.00);
                });
            }])
            ->withCount('inscripciones as total_inscritos')
            ->orderByDesc('total_aprobados')
            ->take(10)
            ->get()
            ->map(function ($grupo) {
                return [
                    'grupo' => $grupo->nombre_paralelo,
                    'materia' => $grupo->materia->nombre,
                    'docente' => $grupo->docente->usuario->full_name,
                    'aula' => $grupo->aula->codigo_aula,
                    'total_inscritos' => $grupo->total_inscritos,
                    'total_aprobados' => $grupo->total_aprobados,
                    'porcentaje_aprobacion' => $grupo->total_inscritos > 0 
                        ? round(($grupo->total_aprobados / $grupo->total_inscritos) * 100, 2) 
                        : 0
                ];
            });

        return response()->json($ranking);
    }
}

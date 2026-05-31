<?php

namespace App\Http\Controllers;

use App\Models\Postulante;
use Illuminate\Http\JsonResponse;

class ReporteController extends Controller
{
    /**
     * Retornar todos los postulantes registrados con sus relaciones principales.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listaGeneral(): JsonResponse
    {
        // Eager Loading para optimizar las consultas en PostgreSQL
        $postulantes = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2'])->get();

        return response()->json($postulantes);
    }

    /**
     * Retornar la lista de postulantes aprobados en el examen.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function postulantesAprobados(): JsonResponse
    {
        // Filtrar usando subconsultas whereHas en las relaciones anidadas
        $aprobados = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2'])
            ->whereHas('inscripciones.calificacion', function ($query) {
                $query->where('estado_aprobacion', true);
            })
            ->get();

        return response()->json($aprobados);
    }

    /**
     * Retornar la lista de postulantes reprobados en el examen.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function postulantesReprobados(): JsonResponse
    {
        // Filtrar usando subconsultas whereHas en las relaciones anidadas
        $reprobados = Postulante::with(['usuario', 'carreraOpcion1', 'carreraOpcion2'])
            ->whereHas('inscripciones.calificacion', function ($query) {
                $query->where('estado_aprobacion', false);
            })
            ->get();

        return response()->json($reprobados);
    }
}

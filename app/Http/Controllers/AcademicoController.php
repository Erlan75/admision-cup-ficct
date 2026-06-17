<?php

namespace App\Http\Controllers;

use App\Models\Inscripcion;
use App\Models\Calificacion;
use App\Models\Carrera;
use App\Models\Grupo;
use App\Models\Postulante;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class AcademicoController extends Controller
{
    /**
     * CU-12 — Registrar Calificaciones (guardado masivo por lote / acta completa).
     *
     * Acepta un array JSON de calificaciones bajo la clave "calificaciones".
     * Cada elemento puede omitir las notas (si aún no se han ingresado) o
     * incluirlas para que el trigger trg_01_calcular_nota de PostgreSQL calcule
     * automáticamente promedio_ponderado y estado_aprobacion.
     *
     * Toda la operación se ejecuta dentro de una transacción atómica:
     * si cualquier fila falla, se hace rollback completo.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function registrarNotas(Request $request): JsonResponse
    {
        if ($request->user()->rol_id == 4) {
            return response()->json(["error" => "No autorizado"], 403);
        }

        if ($request->user()->rol_id == 2) {
            $docente = \App\Models\Docente::where('user_id', $request->user()->id)->first();
            if (!$docente) {
                return response()->json(["error" => "No autorizado"], 403);
            }
            
            // Validar que todas las calificaciones pertenecen a inscripciones del docente
            $calificaciones = $request->input('calificaciones', []);
            if (is_array($calificaciones) && count($calificaciones) > 0) {
                $inscripcionIds = collect($calificaciones)->pluck('inscripcion_id')->filter()->unique()->toArray();
                
                $unauthorizedExists = \App\Models\Inscripcion::whereIn('id', $inscripcionIds)
                    ->whereHas('grupo', function ($query) use ($docente) {
                        $query->where('docente_id', '!=', $docente->id);
                    })
                    ->exists();
                
                if ($unauthorizedExists) {
                    return response()->json(["error" => "No autorizado"], 403);
                }
            }
        }

        // ── Validación del lote ────────────────────────────────────────────────
        $request->validate([
            'calificaciones'                       => ['required', 'array', 'min:1'],
            'calificaciones.*.inscripcion_id'      => ['required', 'integer', 'exists:inscripciones,id'],
            'calificaciones.*.parcial_1'           => ['nullable', 'numeric', 'between:0,100'],
            'calificaciones.*.parcial_2'           => ['nullable', 'numeric', 'between:0,100'],
            'calificaciones.*.examen_final'        => ['nullable', 'numeric', 'between:0,100'],
        ], [
            'calificaciones.required'                         => 'Se requiere un array de calificaciones.',
            'calificaciones.*.inscripcion_id.required'        => 'Cada registro debe tener un inscripcion_id válido.',
            'calificaciones.*.inscripcion_id.exists'          => 'Una de las inscripciones indicadas no existe en el sistema.',
            'calificaciones.*.parcial_1.between'              => 'La nota del Primer Parcial debe estar entre 0 y 100.',
            'calificaciones.*.parcial_2.between'              => 'La nota del Segundo Parcial debe estar entre 0 y 100.',
            'calificaciones.*.examen_final.between'           => 'La nota del Examen Final debe estar entre 0 y 100.',
        ]);

        DB::beginTransaction();

        try {
            $resultados = [];

            foreach ($request->calificaciones as $item) {
                // Upsert: buscar por inscripcion_id o crear nuevo registro
                $calificacion = Calificacion::firstOrNew([
                    'inscripcion_id' => $item['inscripcion_id'],
                ]);

                // Solo actualizar campos que vienen en el payload
                if (array_key_exists('parcial_1', $item)) {
                    $calificacion->parcial_1 = $item['parcial_1'] ?? 0.00;
                }
                if (array_key_exists('parcial_2', $item)) {
                    $calificacion->parcial_2 = $item['parcial_2'] ?? 0.00;
                }
                if (array_key_exists('examen_final', $item)) {
                    $calificacion->examen_final = $item['examen_final'] ?? 0.00;
                }

                // Persistir — el trigger trg_01_calcular_nota se dispara aquí
                $calificacion->save();

                // CU-13: Refrescar para obtener promedio_ponderado y estado_aprobacion
                // calculados automáticamente por el trigger de PostgreSQL
                $calificacion->refresh();
                $calificacion->load('inscripcion.postulante');

                $resultados[] = $calificacion;
            }

            DB::commit();

            return response()->json([
                'mensaje'        => count($resultados) . ' calificación(es) guardada(s) y promedio(s) calculado(s) con éxito.',
                'calificaciones' => $resultados,
            ], 200);

        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'error'   => 'Error al guardar el acta de calificaciones.',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * CU-12 — Listar grupos con sus inscripciones y calificaciones existentes.
     *
     * Devuelve todos los grupos con sus postulantes inscritos y las
     * calificaciones actuales para pre-poblar la planilla de actas.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listarGruposConInscritos(): JsonResponse
    {
        $grupos = Grupo::with([
            'inscripciones' => function ($query) {
                $query->where('periodo_academico', '2-2026');
            },
            'inscripciones.postulante',
            'inscripciones.calificacion',
            'docente.usuario',
        ])->orderBy('nombre_paralelo')->get();

        return response()->json([
            'grupos' => $grupos,
        ], 200);
    }

    /**
     * Obtener los indicadores clave de rendimiento académico para el Dashboard.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obtenerEstadisticasDashboard(): JsonResponse
    {
        // 1. Total de inscritos únicos
        $totalInscritos = Postulante::count();

        $totalAprobados = DB::table('inscripciones')
            ->join('calificaciones', 'inscripciones.id', '=', 'calificaciones.inscripcion_id')
            ->join('postulantes as p', 'inscripciones.postulante_id', '=', 'p.id')
            ->where('calificaciones.estado_aprobacion', true)
            ->select('p.id')
            ->groupBy('p.id')
            ->havingRaw('COUNT(calificaciones.id) = 4')
            ->get()
            ->count();

        // 3. Total de reprobados (alumnos que reprobaron al menos una materia)
        $totalReprobados = DB::table('inscripciones')
            ->join('calificaciones', 'inscripciones.id', '=', 'calificaciones.inscripcion_id')
            ->where('calificaciones.estado_aprobacion', false)
            ->distinct('inscripciones.postulante_id')
            ->count('inscripciones.postulante_id');

        // 4. Cantidad de grupos dinámicos necesarios basados en la capacidad física máxima estricta de 60 por aula
        $aforoMaximo = 60;
        $gruposNecesarios = ceil($totalInscritos / $aforoMaximo);

        return response()->json([
            'total_inscritos'              => $totalInscritos,
            'total_aprobados'              => $totalAprobados,
            'total_reprobados'             => $totalReprobados,
            'grupos_necesarios_calculados' => (int) $gruposNecesarios,
        ]);
    }

    /**
     * CU-10 — Algoritmo de Distribución Áulica.
     *
     * Recupera todos los postulantes que aún no tienen una inscripción activa
     * en ningún grupo e invoca el procedimiento almacenado
     * prc_asignar_postulante_grupo(p_postulante_id, p_materia_id) por cada uno
     * de ellos dentro de una transacción atómica.
     *
     * Si el trigger de capacidad máxima (60 alumnos por aula) lanza una
     * excepción, se captura el mensaje original del motor y se devuelve
     * al cliente con un código HTTP 422 (Unprocessable Entity).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function distribuirPostulantesAulas(Request $request): JsonResponse
    {
        if ($request->user()->rol_id != 1) {
            return response()->json(["error" => "No autorizado"], 403);
        }

        DB::beginTransaction();

        try {
            // Recuperar postulantes que todavía no poseen una inscripción activa
            $postulantes = Postulante::whereDoesntHave('inscripciones')->get();

            if ($postulantes->isEmpty()) {
                DB::rollBack();

                return response()->json([
                    'mensaje'    => 'No existen postulantes pendientes de distribución áulica.',
                    'asignados'  => 0,
                ], 200);
            }

            // Asegurar que todas las aulas tengan capacidad de exactamente 60 alumnos homogénea
            DB::table('aulas')->update(['capacidad_fisica' => 60]);

            // Asegurar que todas las materias tengan su Grupo 1 (paralelo inicial) creado
            $materiasListBase = DB::table('materias')->orderBy('id')->get();
            $slotsBase = [
                ['08:00:00', '10:00:00'],
                ['10:00:00', '12:00:00'],
                ['12:00:00', '14:00:00'],
                ['14:00:00', '16:00:00'],
            ];

            $docentesList = DB::table('docentes')->orderBy('id')->pluck('id')->toArray();

            foreach ($materiasListBase as $key => $materia) {
                $abrev = 'COMP';
                if (str_contains(strtolower($materia->nombre), 'mat')) {
                    $abrev = 'MAT';
                } elseif (str_contains(strtolower($materia->nombre), 'fís') || str_contains(strtolower($materia->nombre), 'fis')) {
                    $abrev = 'FIS';
                } elseif (str_contains(strtolower($materia->nombre), 'ing')) {
                    $abrev = 'ING';
                }

                $letter = chr(65 + $key); // A, B, C, D
                $nombreParaleloBase = "Grupo {$letter}1 - {$abrev}";

                $grupoExisteBase = DB::table('grupos')
                    ->where('materia_id', $materia->id)
                    ->where('nombre_paralelo', $nombreParaleloBase)
                    ->exists();

                if (!$grupoExisteBase) {
                    $slot = $slotsBase[$key % 4];
                    $docenteId = $docentesList[$key] ?? ($docentesList[0] ?? 1);
                    DB::table('grupos')->insert([
                        'materia_id'      => $materia->id,
                        'docente_id'      => $docenteId,
                        'aula_id'         => 1, // Aula 236
                        'nombre_paralelo' => $nombreParaleloBase,
                        'cupo_inscritos'  => 0,
                        'dia_semana'      => 'Lunes',
                        'hora_inicio'     => $slot[0],
                        'hora_fin'        => $slot[1],
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ]);
                }
            }

            // Calcular la cantidad total de postulantes para la distribución áulica
            $totalInscritos = Postulante::count();
            $aforoMaximo = 60;

            // Si la cantidad supera los 60 alumnos, crear paralelos dinámicamente
            if ($totalInscritos > $aforoMaximo) {
                $gruposNecesarios = (int) ceil($totalInscritos / $aforoMaximo);
                $materiasList = DB::table('materias')->orderBy('id')->get();
                
                $slots = [
                    ['08:00:00', '10:00:00'],
                    ['10:00:00', '12:00:00'],
                    ['12:00:00', '14:00:00'],
                    ['14:00:00', '16:00:00'],
                ];

                for ($g = 2; $g <= $gruposNecesarios; $g++) {
                    foreach ($materiasList as $key => $materia) {
                        $abrev = 'COMP';
                        if (str_contains(strtolower($materia->nombre), 'mat')) {
                            $abrev = 'MAT';
                        } elseif (str_contains(strtolower($materia->nombre), 'fís') || str_contains(strtolower($materia->nombre), 'fis')) {
                            $abrev = 'FIS';
                        } elseif (str_contains(strtolower($materia->nombre), 'ing')) {
                            $abrev = 'ING';
                        }

                        $letter = chr(65 + $key);
                        $nombreParalelo = "Grupo {$letter}{$g} - {$abrev}";

                        $grupoExiste = DB::table('grupos')
                            ->where('materia_id', $materia->id)
                            ->where('nombre_paralelo', $nombreParalelo)
                            ->exists();

                        if (!$grupoExiste) {
                            $slot = $slots[$key % 4];

                            // Buscar el docente_id asignado al Grupo 1 (paralelo base) de esta materia
                            $nombreParaleloBase = "Grupo {$letter}1 - {$abrev}";
                            $docenteId = DB::table('grupos')
                                ->where('materia_id', $materia->id)
                                ->where('nombre_paralelo', $nombreParaleloBase)
                                ->value('docente_id');

                            if (!$docenteId) {
                                $docentesList = DB::table('docentes')->orderBy('id')->pluck('id')->toArray();
                                $docenteId = $docentesList[$key] ?? ($docentesList[0] ?? 1);
                            }

                            DB::table('grupos')->insert([
                                'materia_id'      => $materia->id,
                                'docente_id'      => $docenteId,
                                'aula_id'         => 1, // Aula 236
                                'nombre_paralelo' => $nombreParalelo,
                                'cupo_inscritos'  => 0,
                                'dia_semana'      => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][($g - 2) % 6],
                                'hora_inicio'     => $slot[0],
                                'hora_fin'        => $slot[1],
                                'created_at'      => now(),
                                'updated_at'      => now(),
                            ]);
                        }
                    }
                }
            }

            // Obtener todas las materias oficiales registradas (Computación, Matemáticas, Física, Inglés)
            $materias = DB::table('materias')->orderBy('id')->get();

            $totalAsignados = 0;

            foreach ($postulantes as $postulante) {
                foreach ($materias as $materia) {
                    // Invocar el procedimiento almacenado de PostgreSQL
                    DB::statement(
                        'CALL prc_asignar_postulante_grupo(?, ?)',
                        [$postulante->id, $materia->id]
                    );

                    // Obtener el ID de la inscripción recién creada para esta materia
                    $inscripcionId = DB::table('inscripciones')
                        ->join('grupos', 'inscripciones.grupo_id', '=', 'grupos.id')
                        ->where('inscripciones.postulante_id', $postulante->id)
                        ->where('grupos.materia_id', $materia->id)
                        ->value('inscripciones.id');

                    if ($inscripcionId) {
                        // Generar automáticamente su registro en la tabla calificaciones con notas iniciales en cero
                        DB::table('calificaciones')->insert([
                            'inscripcion_id'     => $inscripcionId,
                            'parcial_1'          => 0.00,
                            'parcial_2'          => 0.00,
                            'examen_final'       => 0.00,
                            'promedio_ponderado' => 0.00,
                            'estado_aprobacion'  => false,
                            'created_at'         => now(),
                            'updated_at'         => now(),
                        ]);
                    }
                }

                $totalAsignados++;
            }

            DB::commit();

            return response()->json([
                'mensaje'   => "Distribución áulica completada exitosamente. {$totalAsignados} postulante(s) asignado(s) a grupos.",
                'asignados' => $totalAsignados,
            ], 200);

        } catch (Throwable $e) {
            DB::rollBack();

            // Capturar el mensaje del trigger de capacidad máxima (60 alumnos)
            $mensajeError = $e->getMessage();

            // Detectar si el error proviene del trigger de capacidad física
            $esErrorCapacidad = str_contains($mensajeError, '60')
                || str_contains(strtolower($mensajeError), 'capacidad')
                || str_contains(strtolower($mensajeError), 'capacity')
                || str_contains(strtolower($mensajeError), 'grupo');

            if ($esErrorCapacidad) {
                return response()->json([
                    'error'   => 'Capacidad áulica excedida: ' . $mensajeError,
                    'detalle' => 'La capacidad física máxima de 60 alumnos por aula ha sido alcanzada. No se realizaron cambios en la base de datos.',
                ], 422);
            }

            return response()->json([
                'error'   => 'Error interno durante la distribución áulica.',
                'detalle' => $mensajeError,
            ], 500);
        }
    }

    /**
     * CU-14 — Algoritmo Core de Admisión.
     *
     * Invoca el procedimiento almacenado prc_ejecutar_core_admision(p_carrera_id)
     * que, dentro de una única transacción con bloqueo pesimista (FOR UPDATE):
     *   1. Marca como 'No Admitido' a los postulantes con promedio < 60.00.
     *   2. Asigna 'Admitido' a los mejores promedios hasta el cupo_limite.
     *   3. Asigna 'Pendiente Segunda Opción' a los excedentes.
     *   4. Actualiza total_admitidos en la tabla carreras.
     *
     * La transacción es completamente manejada por PostgreSQL dentro del SP;
     * Laravel solo propaga la excepción si el motor la lanza.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function procesarCorteAdmision(Request $request): JsonResponse
    {
        if ($request->user()->rol_id != 1) {
            return response()->json(["error" => "No autorizado"], 403);
        }

        $request->validate([
            'carrera_id' => ['nullable', 'integer', 'exists:carreras,id'],
        ], [
            'carrera_id.integer'  => 'El carrera_id debe ser un número entero.',
            'carrera_id.exists'   => 'La carrera indicada no existe en el sistema.',
        ]);

        $carreraId = $request->has('carrera_id') && !is_null($request->carrera_id) ? (int) $request->carrera_id : null;

        try {
            if ($carreraId) {
                // Ejecutar el procedimiento almacenado para una sola carrera
                DB::statement('CALL prc_ejecutar_core_admision(?)', [$carreraId]);

                // Recuperar el estado actualizado de la carrera para enriquecer la respuesta
                $carrera = Carrera::findOrFail($carreraId);

                // Contadores de resultados para la respuesta del cliente
                $admitidos           = Postulante::where('opcion1_carrera_id', $carreraId)
                    ->where('estado_final', 'Admitido')->count();
                $noAdmitidos         = Postulante::where('opcion1_carrera_id', $carreraId)
                    ->where('estado_final', 'No Admitido')->count();
                $pendientesSegunda   = Postulante::where('opcion1_carrera_id', $carreraId)
                    ->where('estado_final', 'Pendiente Segunda Opción')->count();

                return response()->json([
                    'mensaje'                => "Corte de admisión ejecutado exitosamente para la carrera '{$carrera->nombre_carrera}'.",
                    'carrera'               => $carrera->nombre_carrera,
                    'cupo_limite'           => $carrera->cupo_limite,
                    'total_admitidos'       => $carrera->total_admitidos,
                    'resumen' => [
                        'admitidos'              => $admitidos,
                        'no_admitidos'           => $noAdmitidos,
                        'pendiente_segunda'      => $pendientesSegunda,
                    ],
                ], 200);
            } else {
                // Ejecutar el corte para todas las carreras de forma global
                $carreras = Carrera::all();
                foreach ($carreras as $carrera) {
                    DB::statement('CALL prc_ejecutar_core_admision(?)', [$carrera->id]);
                }

                // Obtener el consolidado global de resultados
                $admitidos           = Postulante::where('estado_final', 'Admitido')->count();
                $noAdmitidos         = Postulante::where('estado_final', 'No Admitido')->count();
                $pendientesSegunda   = Postulante::where('estado_final', 'Pendiente Segunda Opción')->count();

                return response()->json([
                    'mensaje' => "Corte de admisión ejecutado exitosamente para todas las carreras.",
                    'resumen' => [
                        'admitidos'              => $admitidos,
                        'no_admitidos'           => $noAdmitidos,
                        'pendiente_segunda'      => $pendientesSegunda,
                    ],
                ], 200);
            }

        } catch (Throwable $e) {
            $mensajeError = $e->getMessage();

            // Distinguir error de negocio (carrera no encontrada en el SP) de error técnico
            $esErrorNegocio = str_contains(strtolower($mensajeError), 'no encontrada')
                || str_contains(strtolower($mensajeError), 'not found');

            if ($esErrorNegocio) {
                return response()->json([
                    'error'   => 'Error de negocio en el corte de admisión.',
                    'detalle' => $mensajeError,
                ], 422);
            }

            return response()->json([
                'error'   => 'Error interno durante el procesamiento del corte de admisión.',
                'detalle' => $mensajeError,
            ], 500);
        }
    }

    /**
     * CU-15 — Reasignación Segunda Opción.
     *
     * Invoca el procedimiento almacenado prc_ejecutar_segunda_opcion() que:
     *   1. Itera sobre los postulantes con estado 'Pendiente Segunda Opción' por mérito.
     *   2. Los ubica en su opcion2_carrera_id si hay cupo disponible.
     *   3. Si la segunda opción está llena, los reasigna a la carrera de
     *      contingencia (Redes y Telecomunicaciones, ID: 3).
     *   4. Si ningún cupo está disponible, los marca como 'No Admitido'.
     *   5. Aplica bloqueo pesimista (FOR UPDATE) en cada carrera afectada.
     *   6. Actualiza total_admitidos en todas las carreras involucradas.
     *
     * La transacción es completamente manejada por PostgreSQL dentro del SP.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function procesarSegundaOpcion(Request $request): JsonResponse
    {
        try {
            // Ejecutar el procedimiento almacenado CU-15.
            // No requiere parámetros: opera sobre todos los 'Pendiente Segunda Opción'.
            DB::statement('CALL prc_ejecutar_segunda_opcion()');

            // Contadores post-ejecución para enriquecer la respuesta
            $admitidos       = Postulante::where('estado_final', 'Admitido')->count();
            $noAdmitidos     = Postulante::where('estado_final', 'No Admitido')->count();
            $pendientes      = Postulante::where('estado_final', 'Pendiente Segunda Opción')->count();

            return response()->json([
                'mensaje'   => 'Reasignación de segunda opción completada exitosamente.',
                'resumen'   => [
                    'admitidos'              => $admitidos,
                    'no_admitidos'           => $noAdmitidos,
                    'pendiente_segunda'      => $pendientes,
                ],
            ], 200);

        } catch (Throwable $e) {
            return response()->json([
                'error'   => 'Error interno durante la reasignación de segunda opción.',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * CU-11 — Control de Choques de Horarios y Carga Docente.
     *
     * Asigna un docente a un paralelo (grupo), registrando el día y horario.
     * Si se viola la carga límite (máx 4 grupos) o hay choque de horarios,
     * el trigger trg_validar_carga_horaria_docente lanzará una excepción
     * que se captura aquí para retornar un error 422 estructurado.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function asignarDocenteGrupo(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'    => ['required', 'integer', 'exists:grupos,id'],
            'docente_id'  => ['required', 'integer', 'exists:docentes,id'],
            'dia_semana'  => ['required', 'string', 'max:20'],
            'hora_inicio' => ['required', 'string'],
            'hora_fin'    => ['required', 'string'],
        ], [
            'grupo_id.required'    => 'El grupo_id es requerido.',
            'grupo_id.exists'      => 'El grupo especificado no existe.',
            'docente_id.required'  => 'El docente_id es requerido.',
            'docente_id.exists'    => 'El docente especificado no existe.',
            'dia_semana.required'  => 'El día de la semana es requerido.',
            'hora_inicio.required' => 'La hora de inicio es requerida.',
            'hora_fin.required'    => 'La hora de fin es requerida.',
        ]);

        try {
            DB::table('grupos')
                ->where('id', $request->grupo_id)
                ->update([
                    'docente_id'  => $request->docente_id,
                    'dia_semana'  => $request->dia_semana,
                    'hora_inicio' => $request->hora_inicio,
                    'hora_fin'    => $request->hora_fin,
                    'updated_at'  => now(),
                ]);

            return response()->json([
                'mensaje' => 'Docente asignado al grupo con éxito.',
            ], 200);

        } catch (Throwable $e) {
            $mensajeError = $e->getMessage();

            // Detectar si el error es provocado por el trigger
            $esErrorTrigger = str_contains($mensajeError, 'carga')
                || str_contains(strtolower($mensajeError), 'limite')
                || str_contains(strtolower($mensajeError), 'límite')
                || str_contains(strtolower($mensajeError), 'choque')
                || str_contains(strtolower($mensajeError), 'horario')
                || str_contains(strtolower($mensajeError), 'overlap')
                || str_contains(strtolower($mensajeError), 'traslapa');

            if ($esErrorTrigger) {
                $detalle = $mensajeError;
                // Limpiar mensaje de error de Postgres para mostrar un mensaje limpio
                if (preg_match('/ERROR:\s*(.*?)(?:\n|CONTEXT:|$)/s', $mensajeError, $matches)) {
                    $detalle = trim($matches[1]);
                }
                return response()->json([
                    'error'   => 'Error de validación horaria / carga docente.',
                    'detalle' => $detalle,
                ], 422);
            }

            return response()->json([
                'error'   => 'Error interno durante la asignación del docente.',
                'detalle' => $mensajeError,
            ], 500);
        }
    }

    /**
     * Importar notas masivas desde un archivo CSV para un grupo específico.
     * Solo accesible por el Docente titular del grupo.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function importarNotasCSV(Request $request): JsonResponse
    {
        // 1. Validar que el usuario sea un Docente (rol_id = 2)
        if ($request->user()->rol_id != 2) {
            return response()->json(["error" => "No autorizado. Solo los docentes pueden realizar esta acción."], 403);
        }

        // Buscar el perfil de docente asociado
        $docente = DB::table('docentes')->where('user_id', $request->user()->id)->first();
        if (!$docente) {
            return response()->json(["error" => "No autorizado. Perfil docente no encontrado."], 403);
        }

        // 2. Validar grupo_id y archivo
        $request->validate([
            'grupo_id' => ['required', 'integer'],
            'archivo'  => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $grupoId = $request->input('grupo_id');
        $grupo = DB::table('grupos')->where('id', $grupoId)->first();

        if (!$grupo) {
            return response()->json(["error" => "Grupo no encontrado."], 404);
        }

        // Validar que el grupo pertenezca legítimamente a este docente
        if ($grupo->docente_id != $docente->id) {
            return response()->json(["error" => "No autorizado. Este grupo no le pertenece."], 403);
        }

        $archivo = $request->file('archivo');
        $handle  = fopen($archivo->getRealPath(), 'r');

        if (!$handle) {
            return response()->json(['error' => 'No se pudo abrir el archivo CSV.'], 422);
        }

        // Leer cabecera
        $cabecera = fgetcsv($handle, 0, ',');
        if (!$cabecera) {
            fclose($handle);
            return response()->json(['error' => 'El archivo CSV está vacío o tiene un formato incorrecto.'], 422);
        }

        // Normalizar columnas de la cabecera
        $cabecera = array_map(fn($col) => strtolower(trim($col, " \t\n\r\0\x0B\xEF\xBB\xBF")), $cabecera);

        $ciKey = array_search('ci', $cabecera);
        
        $p1Key = array_search('parcial1', $cabecera);
        if ($p1Key === false) $p1Key = array_search('parcial_1', $cabecera);
        
        $p2Key = array_search('parcial2', $cabecera);
        if ($p2Key === false) $p2Key = array_search('parcial_2', $cabecera);
        
        $efKey = array_search('examen_final', $cabecera);
        if ($efKey === false) $efKey = array_search('examenfinal', $cabecera);

        if ($ciKey === false) {
            fclose($handle);
            return response()->json(['error' => 'El archivo CSV debe contener la columna "ci".'], 422);
        }

        DB::beginTransaction();

        try {
            $updatedCount = 0;
            $errors = [];
            $fila = 1;

            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                $fila++;
                
                $ci = trim($row[$ciKey] ?? '');
                if (empty($ci)) {
                    continue;
                }

                $p1 = ($p1Key !== false && isset($row[$p1Key]) && $row[$p1Key] !== '') ? trim($row[$p1Key]) : null;
                $p2 = ($p2Key !== false && isset($row[$p2Key]) && $row[$p2Key] !== '') ? trim($row[$p2Key]) : null;
                $ef = ($efKey !== false && isset($row[$efKey]) && $row[$efKey] !== '') ? trim($row[$efKey]) : null;

                // Buscar el postulante por su CI
                $postulante = DB::table('postulantes')->where('ci', $ci)->first();
                if (!$postulante) {
                    $errors[] = "Fila {$fila}: Postulante con CI {$ci} no encontrado.";
                    continue;
                }

                // Buscar la inscripción en el grupo correspondiente
                $inscripcion = DB::table('inscripciones')
                    ->where('postulante_id', $postulante->id)
                    ->where('grupo_id', $grupoId)
                    ->first();

                if (!$inscripcion) {
                    $errors[] = "Fila {$fila}: El postulante con CI {$ci} no está inscrito en este grupo.";
                    continue;
                }

                // Obtener o crear registro en calificaciones usando Eloquent
                $calificacion = Calificacion::where('inscripcion_id', $inscripcion->id)->first();

                $dataToUpdate = [];
                if ($p1 !== null) $dataToUpdate['parcial_1'] = (float) $p1;
                if ($p2 !== null) $dataToUpdate['parcial_2'] = (float) $p2;
                if ($ef !== null) $dataToUpdate['examen_final'] = (float) $ef;

                if ($calificacion) {
                    $calificacion->update($dataToUpdate);
                } else {
                    $dataToUpdate['inscripcion_id'] = $inscripcion->id;
                    Calificacion::create($dataToUpdate);
                }

                $updatedCount++;
            }

            fclose($handle);

            if (count($errors) > 0 && $updatedCount == 0) {
                DB::rollBack();
                return response()->json([
                    'error' => 'No se pudo importar ninguna nota.',
                    'errores' => $errors,
                ], 422);
            }

            DB::commit();

            return response()->json([
                'mensaje' => "Importación completada. Se actualizaron {$updatedCount} calificaciones.",
                'actualizados' => $updatedCount,
                'errores' => $errors,
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'error' => 'Error al procesar el archivo CSV de calificaciones.',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }
}

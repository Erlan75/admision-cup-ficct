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
                    $calificacion->parcial_1 = $item['parcial_1'];
                }
                if (array_key_exists('parcial_2', $item)) {
                    $calificacion->parcial_2 = $item['parcial_2'];
                }
                if (array_key_exists('examen_final', $item)) {
                    $calificacion->examen_final = $item['examen_final'];
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
            'inscripciones.postulante',
            'inscripciones.calificacion',
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
        $totalInscritos = Inscripcion::distinct('postulante_id')->count('postulante_id');

        // 2. Total de aprobados (alumnos que aprobaron las 4 materias)
        $totalAprobados = DB::table('inscripciones')
            ->join('calificaciones', 'inscripciones.id', '=', 'calificaciones.inscripcion_id')
            ->where('calificaciones.estado_aprobacion', true)
            ->groupBy('inscripciones.postulante_id')
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
        $gruposNecesarios = ceil($totalInscritos / 60);

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
    public function distribuirPostulantesAulas(): JsonResponse
    {
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
        $request->validate([
            'carrera_id' => ['required', 'integer', 'exists:carreras,id'],
        ], [
            'carrera_id.required' => 'El campo carrera_id es obligatorio.',
            'carrera_id.integer'  => 'El carrera_id debe ser un número entero.',
            'carrera_id.exists'   => 'La carrera indicada no existe en el sistema.',
        ]);

        $carreraId = (int) $request->carrera_id;

        try {
            // Ejecutar el procedimiento almacenado CU-14.
            // El SP gestiona internamente la transacción con bloqueo pesimista.
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
}

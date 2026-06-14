<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Postulante;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Exception;

class PostulanteController extends Controller
{
    /**
     * Registrar un nuevo postulante en el sistema CUP.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function registrar(Request $request): JsonResponse
    {
        $request->validate([
            'ci' => ['required', 'string', 'max:20', 'unique:postulantes,ci'],
            'nombres' => ['required', 'string', 'max:100'],
            'apellidos' => ['required', 'string', 'max:100'],
            'fecha_nacimiento' => ['required', 'date'],
            'sexo' => ['required', 'string', 'size:1'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'opcion1_carrera_id' => ['required', 'integer', 'exists:carreras,id'],
            'opcion2_carrera_id' => ['required', 'integer', 'exists:carreras,id'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'colegio_procedencia' => ['nullable', 'string', 'max:150'],
            'ciudad' => ['nullable', 'string', 'max:50'],
        ], [
            'ci.unique' => 'La Cédula de Identidad ingresada ya se encuentra registrada.',
            'email.unique' => 'El correo electrónico ingresado ya se encuentra registrado.',
            'opcion1_carrera_id.exists' => 'La carrera seleccionada como primera opción no existe.',
            'opcion2_carrera_id.exists' => 'La carrera seleccionada como segunda opción no existe.',
        ]);

        DB::beginTransaction();

        try {
            // Obtener o crear el rol "Postulante" para asegurar su ID en la base de datos
            $rolPostulante = Role::firstOrCreate(
                ['nombre_rol' => 'Postulante'],
                ['descripcion' => 'Rol asignado para los postulantes del CUP']
            );

            // 1. Crear el usuario asociado en la tabla 'users'
            $usuario = User::create([
                'rol_id' => $rolPostulante->id,
                'email' => $request->email,
                'password_hash' => Hash::make($request->ci), // Contraseña temporal hash basada en el CI
                'full_name' => trim($request->nombres . ' ' . $request->apellidos),
                'is_active' => true,
            ]);

            // 2. Crear el registro en la tabla 'postulantes'
            $postulante = Postulante::create([
                'user_id' => $usuario->id,
                'ci' => $request->ci,
                'nombres' => $request->nombres,
                'apellidos' => $request->apellidos,
                'fecha_nacimiento' => $request->fecha_nacimiento,
                'sexo' => $request->sexo,
                'direccion' => $request->direccion,
                'telefono' => $request->telefono,
                'colegio_procedencia' => $request->colegio_procedencia,
                'ciudad' => $request->ciudad,
                'opcion1_carrera_id' => $request->opcion1_carrera_id,
                'opcion2_carrera_id' => $request->opcion2_carrera_id,
                'estado_final' => 'Pendiente',
            ]);

            DB::commit();

            return response()->json([
                'mensaje' => 'Postulante registrado con éxito en el sistema.',
                'postulante' => $postulante->load(['carreraOpcion1', 'carreraOpcion2', 'usuario']),
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            return response()->json([
                'error' => 'No se pudo completar el registro del postulante.',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Listar todos los postulantes registrados en el CUP.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listar(): JsonResponse
    {
        // Carga de relaciones (Eager Loading) para optimizar consultas en PostgreSQL
        $postulantes = Postulante::with(['carreraOpcion1', 'carreraOpcion2', 'usuario'])->get();

        return response()->json($postulantes);
    }

    /**
     * Buscar un postulante específico por su CI.
     *
     * @param  string  $ci
     * @return \Illuminate\Http\JsonResponse
     */
    public function buscar(string $ci): JsonResponse
    {
        $postulante = Postulante::with(['carreraOpcion1', 'carreraOpcion2', 'usuario'])
            ->where('ci', $ci)
            ->first();

        if (! $postulante) {
            return response()->json([
                'error' => 'Postulante no encontrado.',
                'mensaje' => "No se encontró ningún postulante registrado con la Cédula de Identidad: {$ci}",
            ], 404);
        }

        return response()->json($postulante);
    }

    /**
     * CU-03 — Carga Masiva de Postulantes (CSV / Excel).
     *
     * Recibe un archivo .csv con las columnas:
     * ci, nombres, apellidos, fecha_nacimiento, sexo, email,
     * opcion1_carrera_id, opcion2_carrera_id, direccion, telefono,
     * colegio_procedencia, ciudad
     *
     * Cada fila se procesa individualmente; las filas con CI o email
     * duplicados se registran como errores sin detener el lote.
     */
    public function importarLoteCSV(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:5120'],
        ], [
            'archivo.required' => 'Debe seleccionar un archivo CSV o Excel.',
            'archivo.mimes'    => 'El formato del archivo debe ser CSV (.csv) o Excel (.xlsx/.xls).',
            'archivo.max'      => 'El archivo no debe superar los 5 MB.',
        ]);

        $archivo = $request->file('archivo');
        $handle  = fopen($archivo->getRealPath(), 'r');

        if (! $handle) {
            return response()->json(['error' => 'No se pudo abrir el archivo.'], 422);
        }

        // Leer cabecera
        $cabecera = fgetcsv($handle, 0, ',');
        if (! $cabecera) {
            fclose($handle);
            return response()->json(['error' => 'El archivo está vacío o tiene un formato incorrecto.'], 422);
        }

        // Normalizar nombres de columna (trim + lowercase)
        $cabecera = array_map(fn($col) => strtolower(trim($col)), $cabecera);

        $rolPostulante = Role::firstOrCreate(
            ['nombre_rol' => 'Postulante'],
            ['descripcion' => 'Rol asignado para los postulantes del CUP']
        );

        $insertados = 0;
        $errores    = [];
        $fila       = 1;

        while (($row = fgetcsv($handle, 0, ',')) !== false) {
            $fila++;

            // Mapear columnas por índice
            $datos = array_combine($cabecera, array_pad($row, count($cabecera), null));

            // Validaciones mínimas por fila
            if (empty($datos['ci']) || empty($datos['nombres']) || empty($datos['apellidos']) || empty($datos['email'])) {
                $errores[] = "Fila {$fila}: campos obligatorios faltantes (ci, nombres, apellidos, email).";
                continue;
            }

            // [Validación de Campos Vacíos Obligatorios]
            $camposFaltantes = [];
            if (empty($datos['fecha_nacimiento'])) {
                $camposFaltantes[] = 'fecha_nacimiento';
            }
            if (empty($datos['sexo'])) {
                $camposFaltantes[] = 'sexo';
            }
            if (empty($datos['opcion1_carrera_id'])) {
                $camposFaltantes[] = 'opcion1_carrera_id';
            }
            if (empty($datos['opcion2_carrera_id'])) {
                $camposFaltantes[] = 'opcion2_carrera_id';
            }

            if (!empty($camposFaltantes)) {
                $errores[] = "Fila {$fila}: campos obligatorios faltantes (" . implode(', ', $camposFaltantes) . ").";
                continue;
            }

            // [Validación de Integridad de Carreras]
            $id1 = $datos['opcion1_carrera_id'];
            $id2 = $datos['opcion2_carrera_id'];
            $carrerasExistentesCount = \App\Models\Carrera::whereIn('id', [$id1, $id2])->count();
            $uniqueIdsCount = count(array_unique([$id1, $id2]));
            if ($carrerasExistentesCount < $uniqueIdsCount) {
                $errores[] = "Fila {$fila}: IDs de carrera inválidos o inexistentes.";
                continue;
            }

            // Verificar duplicados
            if (Postulante::where('ci', $datos['ci'])->exists()) {
                $errores[] = "Fila {$fila}: CI {$datos['ci']} ya está registrado.";
                continue;
            }
            if (User::where('email', $datos['email'])->exists()) {
                $errores[] = "Fila {$fila}: email {$datos['email']} ya está registrado.";
                continue;
            }

            DB::beginTransaction();
            try {
                $usuario = User::create([
                    'rol_id'        => $rolPostulante->id,
                    'email'         => $datos['email'],
                    'password_hash' => Hash::make($datos['ci']),
                    'full_name'     => trim($datos['nombres'] . ' ' . $datos['apellidos']),
                    'is_active'     => true,
                ]);

                Postulante::create([
                    'user_id'              => $usuario->id,
                    'ci'                   => $datos['ci'],
                    'nombres'              => $datos['nombres'],
                    'apellidos'            => $datos['apellidos'],
                    'fecha_nacimiento'     => $datos['fecha_nacimiento'],
                    'sexo'                 => $datos['sexo'],
                    'direccion'            => $datos['direccion'] ?? null,
                    'telefono'             => $datos['telefono'] ?? null,
                    'colegio_procedencia'  => $datos['colegio_procedencia'] ?? null,
                    'ciudad'               => $datos['ciudad'] ?? null,
                    'opcion1_carrera_id'   => $datos['opcion1_carrera_id'],
                    'opcion2_carrera_id'   => $datos['opcion2_carrera_id'],
                    'estado_final'         => 'Pendiente',
                ]);

                DB::commit();
                $insertados++;
            } catch (Exception $e) {
                DB::rollBack();
                $errores[] = "Fila {$fila}: {$e->getMessage()}";
            }
        }

        fclose($handle);

        return response()->json([
            'mensaje'    => "Carga masiva completada. {$insertados} postulante(s) registrado(s).",
            'insertados' => $insertados,
            'errores'    => $errores,
        ]);
    }

    /**
     * CU-07 — Simulación de Pasarela de Pagos QR (Webhook).
     *
     * Simula la confirmación asíncrona de pagos: marca todos los
     * postulantes con estado_pago = 'Pendiente' como 'Pagado',
     * simulando la respuesta de un proveedor externo de pagos QR.
     */
    public function simularPasarelaQR(): JsonResponse
    {
        try {
            $actualizados = Postulante::where('estado_pago', 'Pendiente')
                ->update([
                    'estado_pago'       => 'Pagado',
                    'pago_confirmado'   => true,
                    'fecha_pago'        => now(),
                ]);

            return response()->json([
                'mensaje'      => "Webhook de pagos QR procesado con éxito.",
                'confirmados'  => $actualizados,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'error'   => 'Error al procesar la simulación de pagos.',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }
}

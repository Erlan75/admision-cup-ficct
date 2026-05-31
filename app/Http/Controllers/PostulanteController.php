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
}

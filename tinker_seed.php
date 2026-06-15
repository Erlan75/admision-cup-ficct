<?php
// tinker_seed.php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Postulante;
use App\Models\Pago;
use Illuminate\Support\Facades\DB;

try {
    // 1. Clean existing test users if they exist
    User::whereIn('email', ['admin@ficct.uagrm.edu.bo', 'docente@ficct.uagrm.edu.bo'])->delete();

    // 2. Create official Admin User
    $admin = User::create([
        'rol_id'        => 1,
        'email'         => 'admin@ficct.uagrm.edu.bo',
        'password_hash' => bcrypt('password'),
        'full_name'     => 'Administrador Central CUP',
        'is_active'     => true,
    ]);
    echo "Admin user created successfully.\n";

    // 3. Create official Docente User
    $docenteUser = User::create([
        'rol_id'        => 2,
        'email'         => 'docente@ficct.uagrm.edu.bo',
        'password_hash' => bcrypt('password'),
        'full_name'     => 'Docente Fiscalizador FICCT',
        'is_active'     => true,
    ]);
    
    // Insert docente profile
    DB::table('docentes')->insert([
        'user_id'               => $docenteUser->id,
        'especialidad_maestria' => 'Ciencias de la Computación',
        'diplomado_superior'    => true,
        'created_at'            => now(),
        'updated_at'            => now(),
    ]);
    echo "Docente user and profile created successfully.\n";

    // 4. Create paid postulantes from Lote.csv
    $csvPath = __DIR__ . '/Lote.csv';
    if (!file_exists($csvPath)) {
        throw new \Exception("Lote.csv not found at project root.");
    }
    $handle = fopen($csvPath, 'r');
    if (!$handle) {
        throw new \Exception("Could not open Lote.csv.");
    }

    $header = fgetcsv($handle, 0, ',');
    $header = array_map(fn($col) => strtolower(trim($col)), $header);

    echo "Seeding paid postulantes from Lote.csv...\n";
    $counter = 0;

    while (($row = fgetcsv($handle, 0, ',')) !== false) {
        $data = array_combine($header, array_pad($row, count($header), null));

        // Skip empty or invalid rows
        if (empty($data['ci']) || empty($data['nombres']) || empty($data['apellidos']) || empty($data['email']) || empty($data['fecha_nacimiento']) || empty($data['sexo'])) {
            continue;
        }

        $op1 = (int) $data['opcion1_carrera_id'];
        $op2 = (int) $data['opcion2_carrera_id'];

        // Validate career IDs
        if ($op1 < 1 || $op1 > 4 || $op2 < 1 || $op2 > 4) {
            continue;
        }

        $counter++;

        $pUser = User::create([
            'rol_id'        => 3,
            'email'         => $data['email'],
            'password_hash' => bcrypt('password'),
            'full_name'     => trim($data['nombres'] . ' ' . $data['apellidos']),
            'is_active'     => true,
        ]);

        DB::table('postulantes')->insert([
            'id'                  => $counter,
            'user_id'             => $pUser->id,
            'ci'                  => $data['ci'],
            'nombres'             => $data['nombres'],
            'apellidos'           => $data['apellidos'],
            'fecha_nacimiento'    => $data['fecha_nacimiento'],
            'sexo'                => $data['sexo'],
            'direccion'           => $data['direccion'] ?? null,
            'telefono'            => $data['telefono'] ?? null,
            'colegio_procedencia' => $data['colegio_procedencia'] ?? null,
            'ciudad'              => $data['ciudad'] ?? null,
            'opcion1_carrera_id'  => $op1,
            'opcion2_carrera_id'  => $op2,
            'estado_final'        => 'Pendiente',
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        DB::table('pagos')->insert([
            'postulante_id'    => $counter,
            'transaccion_uuid' => 'PAY-QR-' . uniqid() . '-' . $counter,
            'monto'            => 700.00,
            'estado_pago'      => 'Pagado',
            'fecha_pago'       => now(),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }
    fclose($handle);
    
    // Reset sequence for auto-increment compatibility
    DB::statement("SELECT setval('postulantes_id_seq', (SELECT MAX(id) FROM postulantes))");
    echo "Successfully seeded 62 paid postulantes.\n";

    // Run classroom distribution programmatically
    $admin = User::where('rol_id', 1)->first();
    if ($admin) {
        \Illuminate\Support\Facades\Auth::login($admin);
        request()->setUserResolver(fn() => $admin);
        $controller = app(App\Http\Controllers\AcademicoController::class);
        $controller->distribuirPostulantesAulas(request());
        echo "Classroom distribution executed programmatically.\n";

        // Insert historical attempts for Erlan Gaston Garcia Mamani (postulante_id = 1) in '1-2026'
        $postulanteId = 1;
        $inscriptions1 = DB::table('inscripciones')->where('postulante_id', $postulanteId)->get();
        foreach ($inscriptions1 as $insc) {
            $newInscId = DB::table('inscripciones')->insertGetId([
                'postulante_id'     => $postulanteId,
                'grupo_id'          => $insc->grupo_id,
                'periodo_academico' => '1-2026',
                'fecha_inscripcion' => now()->subMonths(6),
            ]);
            
            DB::table('calificaciones')->insert([
                'inscripcion_id'     => $newInscId,
                'parcial_1'          => 40.00,
                'parcial_2'          => 50.00,
                'examen_final'       => 45.00,
                'promedio_ponderado' => 45.00,
                'estado_aprobacion'  => false,
                'created_at'         => now()->subMonths(6),
                'updated_at'         => now()->subMonths(6),
            ]);
        }
        
        // Pass the current '2-2026' attempt for Erlan
        foreach ($inscriptions1 as $insc) {
            DB::table('calificaciones')->where('inscripcion_id', $insc->id)->update([
                'parcial_1'          => 75.00,
                'parcial_2'          => 80.00,
                'examen_final'       => 85.00,
                'promedio_ponderado' => 80.50,
                'estado_aprobacion'  => true,
            ]);
        }
        echo "Seeded '1-2026' historical attempt (failed) and passed active '2-2026' attempt for postulante_id = 1.\n";
    }

} catch (\Exception $e) {
    echo "Seeding error: " . $e->getMessage() . "\n";
    exit(1);
}

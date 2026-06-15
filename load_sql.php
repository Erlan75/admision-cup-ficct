<?php
// load_sql.php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$files = [
    'database/sql_scripts/Script.sql',
    'database/sql_scripts/Poblacion.sql',
    'database/sql_scripts/Procedimientos.sql',
    'database/sql_scripts/Triggers.sql',
];

foreach ($files as $file) {
    $path = __DIR__ . '/' . $file;
    if (!file_exists($path)) {
        echo "Error: File not found: $path\n";
        exit(1);
    }
    echo "Loading SQL file: $file...\n";
    $sql = file_get_contents($path);
    try {
        DB::unprepared($sql);
        echo "Successfully loaded: $file\n";
    } catch (\Exception $e) {
        $msg = $e->getMessage();
        if (str_contains($msg, 'already exists') || str_contains($msg, 'ya existe')) {
            echo "Successfully loaded (with skipped duplicates): $file\n";
        } else {
            echo "Error loading $file: " . $msg . "\n";
            exit(1);
        }
    }
}
echo "All SQL files loaded successfully.\n";

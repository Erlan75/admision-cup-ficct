<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_aula', 50)->unique();
            $table->integer('capacidad_fisica');
            $table->timestamps();
        });

        // Aplicar restricción CHECK física en PostgreSQL para tope estricto de 60
        DB::statement('ALTER TABLE aulas ADD CONSTRAINT chk_capacidad_max CHECK (capacidad_fisica <= 60)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};

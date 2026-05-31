<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('calificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inscripcion_id')->unique()->constrained('inscripciones')->onDelete('cascade');
            $table->decimal('parcial_1', 5, 2)->default(0.00);
            $table->decimal('parcial_2', 5, 2)->default(0.00);
            $table->decimal('examen_final', 5, 2)->default(0.00);
            $table->decimal('promedio_ponderado', 5, 2)->default(0.00);
            $table->boolean('estado_aprobacion')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calificaciones');
    }
};

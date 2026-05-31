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
        Schema::create('bitacoras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('accion', 50);
            $table->string('tabla_afectada', 50);
            $table->text('ip_address'); // TEXT para payload largo de auditoría
            $table->jsonb('v_data_json')->nullable(); // JSONB nativo de PostgreSQL
            $table->timestamp('created_at')->useCurrent(); // Por defecto del servidor
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bitacoras');
    }
};

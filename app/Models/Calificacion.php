<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Calificacion extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'calificaciones';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'inscripcion_id',
        'parcial_1',
        'parcial_2',
        'examen_final',
        'promedio_ponderado',
        'estado_aprobacion',
    ];

    /**
     * Los atributos que deben ser casteados.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'parcial_1' => 'decimal:2',
        'parcial_2' => 'decimal:2',
        'examen_final' => 'decimal:2',
        'promedio_ponderado' => 'decimal:2',
        'estado_aprobacion' => 'boolean',
    ];

    /**
     * Obtener la inscripción asociada a esta calificación.
     *
     * @return BelongsTo<Inscripcion, Calificacion>
     */
    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class, 'inscripcion_id');
    }
}

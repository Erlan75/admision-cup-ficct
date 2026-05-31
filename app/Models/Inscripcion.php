<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Inscripcion extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'inscripciones';

    /**
     * Indica si el modelo debe tener timestamps.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'postulante_id',
        'grupo_id',
        'fecha_inscripcion',
    ];

    /**
     * Los atributos que deben ser casteados.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fecha_inscripcion' => 'datetime',
    ];

    /**
     * Obtener el postulante asociado a la inscripción.
     *
     * @return BelongsTo<Postulante, Inscripcion>
     */
    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }

    /**
     * Obtener el grupo asociado a la inscripción.
     *
     * @return BelongsTo<Grupo, Inscripcion>
     */
    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class, 'grupo_id');
    }

    /**
     * Obtener la calificación del postulante en esta inscripción.
     *
     * @return HasOne<Calificacion>
     */
    public function calificacion(): HasOne
    {
        return $this->hasOne(Calificacion::class, 'inscripcion_id');
    }
}

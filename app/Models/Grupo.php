<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grupo extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'grupos';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'materia_id',
        'docente_id',
        'aula_id',
        'nombre_paralelo',
        'cupo_inscritos',
    ];

    /**
     * Obtener la materia asociada a este grupo.
     *
     * @return BelongsTo<Materia, Grupo>
     */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    /**
     * Obtener el docente asignado a este grupo.
     *
     * @return BelongsTo<Docente, Grupo>
     */
    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }

    /**
     * Obtener el aula asignada a este grupo.
     *
     * @return BelongsTo<Aula, Grupo>
     */
    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    /**
     * Obtener las inscripciones en este grupo.
     *
     * @return HasMany<Inscripcion>
     */
    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class, 'grupo_id');
    }
}

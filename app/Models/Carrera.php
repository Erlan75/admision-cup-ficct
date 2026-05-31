<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Carrera extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'carreras';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nombre_carrera',
        'cupo_limite',
        'total_admitidos',
    ];

    /**
     * Obtener los postulantes que seleccionaron esta carrera como su primera opción.
     *
     * @return HasMany<Postulante>
     */
    public function postulantesOpcion1(): HasMany
    {
        return $this->hasMany(Postulante::class, 'opcion1_carrera_id');
    }

    /**
     * Obtener los postulantes que seleccionaron esta carrera como su segunda opción.
     *
     * @return HasMany<Postulante>
     */
    public function postulantesOpcion2(): HasMany
    {
        return $this->hasMany(Postulante::class, 'opcion2_carrera_id');
    }
}

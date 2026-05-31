<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Materia extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'materias';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sigla',
        'nombre',
    ];

    /**
     * Obtener los grupos asociados a esta materia.
     *
     * @return HasMany<Grupo>
     */
    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class, 'materia_id');
    }
}

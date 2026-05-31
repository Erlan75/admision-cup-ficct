<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aula extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'aulas';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'codigo_aula',
        'capacidad_fisica',
    ];

    /**
     * Obtener los grupos asociados a esta aula.
     *
     * @return HasMany<Grupo>
     */
    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class, 'aula_id');
    }
}

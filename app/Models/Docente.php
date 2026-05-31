<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Docente extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'docentes';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'especialidad_maestria',
        'diplomado_superior',
    ];

    /**
     * Los atributos que deben ser casteados.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'diplomado_superior' => 'boolean',
    ];

    /**
     * Obtener el usuario asociado al docente.
     *
     * @return BelongsTo<User, Docente>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Obtener los grupos que imparte el docente.
     *
     * @return HasMany<Grupo>
     */
    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class, 'docente_id');
    }
}

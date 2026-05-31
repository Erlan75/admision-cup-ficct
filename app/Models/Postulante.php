<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Postulante extends Model
{
    use HasFactory;

    /**
     * La tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'postulantes';

    /**
     * Los atributos que son asignables en masa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'ci',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'sexo',
        'direccion',
        'telefono',
        'colegio_procedencia',
        'ciudad',
        'opcion1_carrera_id',
        'opcion2_carrera_id',
        'estado_final',
    ];

    /**
     * Los atributos que deben ser casteados.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'fecha_nacimiento' => 'date',
    ];

    /**
     * Obtener el usuario asociado al postulante.
     *
     * @return BelongsTo<User, Postulante>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Obtener la carrera elegida como primera opción.
     *
     * @return BelongsTo<Carrera, Postulante>
     */
    public function carreraOpcion1(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'opcion1_carrera_id');
    }

    /**
     * Obtener la carrera elegida como segunda opción.
     *
     * @return BelongsTo<Carrera, Postulante>
     */
    public function carreraOpcion2(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'opcion2_carrera_id');
    }

    /**
     * Obtener los documentos presentados por el postulante.
     *
     * @return HasMany<Documento>
     */
    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'postulante_id');
    }

    /**
     * Obtener los pagos realizados por el postulante.
     *
     * @return HasMany<Pago>
     */
    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class, 'postulante_id');
    }

    /**
     * Obtener las inscripciones del postulante.
     *
     * @return HasMany<Inscripcion>
     */
    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class, 'postulante_id');
    }
}

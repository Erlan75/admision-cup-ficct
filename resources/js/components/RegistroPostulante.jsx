import React, { useState } from 'react';

const RegistroPostulante = () => {
    // Estado del formulario
    const [formData, setFormData] = useState({
        ci: '',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        sexo: '',
        email: '',
        direccion: '',
        telefono: '',
        colegio_procedencia: '',
        ciudad: '',
        opcion1_carrera_id: '',
        opcion2_carrera_id: ''
    });

    // Estados de control de la UI
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Mapeo estático de las carreras de la FICCT con sus IDs
    const carrerasFICCT = [
        { id: 1, nombre: 'Ingeniería Informática' },
        { id: 2, nombre: 'Ingeniería de Sistemas' },
        { id: 3, nombre: 'Ingeniería en Redes y Telecomunicaciones' },
        { id: 4, nombre: 'Ingeniería Robótica' }
    ];

    // Manejar cambios en los campos
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
        // Limpiar error específico de validación al escribir
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Enviar formulario al backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setValidationErrors({});

        // Validaciones previas básicas del frontend
        if (formData.opcion1_carrera_id === formData.opcion2_carrera_id) {
            setErrorMsg('La primera y segunda opción de carrera no pueden ser iguales.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/postulantes/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMsg('¡Inscripción completada con éxito! Se ha generado tu usuario con tu CI como contraseña temporal.');
                setFormData({
                    ci: '',
                    nombres: '',
                    apellidos: '',
                    fecha_nacimiento: '',
                    sexo: '',
                    email: '',
                    direccion: '',
                    telefono: '',
                    colegio_procedencia: '',
                    ciudad: '',
                    opcion1_carrera_id: '',
                    opcion2_carrera_id: ''
                });
            } else {
                if (response.status === 422 && data.errors) {
                    setValidationErrors(data.errors);
                    setErrorMsg('Por favor, corrige los errores de validación en el formulario.');
                } else {
                    setErrorMsg(data.error || data.message || 'Ocurrió un error inesperado al registrar el postulante.');
                }
            }
        } catch (error) {
            setErrorMsg('Error de red. No se pudo conectar con el servidor de admisión del CUP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full p-8 sm:p-10 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
                {/* Efecto de resplandor de fondo premium */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Cabecera del Módulo */}
                <div className="text-center mb-10 relative z-10">
                    <span className="px-3 py-1 text-xs font-semibold text-blue-400 bg-blue-900/30 rounded-full uppercase tracking-wider">
                        Admisión CUP 2026
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-3">
                        Formulario de Inscripción Oficial
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm sm:text-base">
                        Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones (FICCT)
                    </p>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto mt-4"></div>
                </div>

                {/* Mensajes de Alerta */}
                {successMsg && (
                    <div className="mb-8 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-medium relative z-10">
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-8 p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-medium relative z-10">
                        <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulario Principal */}
                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    
                    {/* SECCIÓN 1: DATOS PERSONALES */}
                    <div className="p-6 sm:p-8 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-inner">
                        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 mb-6 flex items-center gap-3">
                            <span className="w-7 h-7 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            Datos Personales y de Contacto
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CI */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Cédula de Identidad (CI) *</label>
                                <input 
                                    type="text"
                                    name="ci"
                                    value={formData.ci}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: 8394029"
                                    className={`px-4 py-3 rounded-xl border ${validationErrors.ci ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:ring-blue-500'} bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2`}
                                />
                                {validationErrors.ci && <span className="text-xs text-rose-400 mt-1">{validationErrors.ci[0]}</span>}
                            </div>

                            {/* Correo Electrónico */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Correo Electrónico *</label>
                                <input 
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="alumno@ficct.uagrm.edu.bo"
                                    className={`px-4 py-3 rounded-xl border ${validationErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:ring-blue-500'} bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2`}
                                />
                                {validationErrors.email && <span className="text-xs text-rose-400 mt-1">{validationErrors.email[0]}</span>}
                            </div>

                            {/* Nombres */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Nombres *</label>
                                <input 
                                    type="text"
                                    name="nombres"
                                    value={formData.nombres}
                                    onChange={handleChange}
                                    required
                                    placeholder="Nombres del postulante"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Apellidos */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Apellidos *</label>
                                <input 
                                    type="text"
                                    name="apellidos"
                                    value={formData.apellidos}
                                    onChange={handleChange}
                                    required
                                    placeholder="Apellidos del postulante"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Fecha de Nacimiento */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Fecha de Nacimiento *</label>
                                <input 
                                    type="date"
                                    name="fecha_nacimiento"
                                    value={formData.fecha_nacimiento}
                                    onChange={handleChange}
                                    required
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Sexo */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Sexo *</label>
                                <select 
                                    name="sexo"
                                    value={formData.sexo}
                                    onChange={handleChange}
                                    required
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white focus:outline-none focus:ring-2"
                                >
                                    <option value="">Seleccione sexo...</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>

                            {/* Dirección */}
                            <div className="flex flex-col col-span-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Dirección de Domicilio</label>
                                <input 
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    placeholder="Barrio, Calle y Número de casa"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Teléfono */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Teléfono / Celular</label>
                                <input 
                                    type="text"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="Ej: 78940321"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Colegio de Procedencia */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Colegio de Procedencia</label>
                                <input 
                                    type="text"
                                    name="colegio_procedencia"
                                    value={formData.colegio_procedencia}
                                    onChange={handleChange}
                                    placeholder="Nombre de la unidad educativa"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>

                            {/* Ciudad */}
                            <div className="flex flex-col col-span-1 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Ciudad de Residencia</label>
                                <input 
                                    type="text"
                                    name="ciudad"
                                    value={formData.ciudad}
                                    onChange={handleChange}
                                    placeholder="Ej: Santa Cruz de la Sierra"
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: PLANIFICACIÓN ACADÉMICA */}
                    <div className="p-6 sm:p-8 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-inner">
                        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 mb-6 flex items-center gap-3">
                            <span className="w-7 h-7 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            Planificación Académica (Opciones de Carrera)
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Primera Opción */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Primera Opción de Carrera *</label>
                                <select 
                                    name="opcion1_carrera_id"
                                    value={formData.opcion1_carrera_id}
                                    onChange={handleChange}
                                    required
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white focus:outline-none focus:ring-2"
                                >
                                    <option value="">Seleccione carrera de preferencia...</option>
                                    {carrerasFICCT.map((carrera) => (
                                        <option key={carrera.id} value={carrera.id}>
                                            {carrera.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Segunda Opción */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-400 mb-2">Segunda Opción de Carrera *</label>
                                <select 
                                    name="opcion2_carrera_id"
                                    value={formData.opcion2_carrera_id}
                                    onChange={handleChange}
                                    required
                                    className="px-4 py-3 rounded-xl border border-slate-800 focus:ring-blue-500 bg-slate-950 text-white focus:outline-none focus:ring-2"
                                >
                                    <option value="">Seleccione carrera alternativa...</option>
                                    {carrerasFICCT.map((carrera) => (
                                        <option key={carrera.id} value={carrera.id}>
                                            {carrera.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* BOTÓN DE INSCRIPCIÓN */}
                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full sm:w-auto px-10 py-4 rounded-xl text-white font-bold tracking-wide shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                                loading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/20 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-blue-500'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Procesando Inscripción...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Completar Inscripción Oficial
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistroPostulante;

import React, { useState } from 'react';

const RegistroNotas = (props) => {
    const [formData, setFormData] = useState({
        inscripcion_id: '',
        parcial_1: '',
        parcial_2: '',
        examen_final: ''
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [calificacionCalculada, setCalificacionCalculada] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Manejar cambios en las notas
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Registrar notas en la base de datos
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setCalificacionCalculada(null);
        setValidationErrors({});

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/academicos/notas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMsg('¡Calificaciones guardadas con éxito! El disparador (Trigger) de PostgreSQL ha calculado de manera instantánea el promedio ponderado y el estado de aprobación final.');
                setCalificacionCalculada(data.calificacion);
                setFormData({
                    inscripcion_id: '',
                    parcial_1: '',
                    parcial_2: '',
                    examen_final: ''
                });
            } else {
                if (response.status === 422 && data.errors) {
                    setValidationErrors(data.errors);
                    setErrorMsg('Corrige los errores de validación de calificaciones.');
                } else {
                    setErrorMsg(data.error || data.message || 'No se pudo registrar la nota.');
                }
            }
        } catch (error) {
            setErrorMsg('Error de red. Asegúrate de tener conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 flex flex-col items-center justify-center">
            
            {/* Botón Volver al Panel - Estilizado Premium */}
            {props.onNavigate && (
                <div className="mb-4 flex justify-start relative z-10 w-full max-w-xl">
                    <button 
                        onClick={() => props.onNavigate('dashboard')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition duration-200 flex items-center gap-2 border border-slate-700/80 shadow-md cursor-pointer select-none"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Panel
                    </button>
                </div>
            )}

            <div className="max-w-xl w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
                {/* Glow de fondo */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="text-center mb-8 relative z-10">
                    <span className="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-900/30 rounded-full uppercase tracking-wider">
                        Módulo Académico
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight mt-3">Registro de Notas</h2>
                    <p className="text-slate-400 mt-2 text-sm">Carga de calificaciones oficiales de exámenes del CUP</p>
                    <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto mt-4"></div>
                </div>

                {/* Mensajes de Alerta */}
                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-2xl flex items-center gap-3 text-sm font-medium relative z-10 animate-fade-in">
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 text-sm font-medium relative z-10 animate-fade-in">
                        <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    {/* Inscripción ID */}
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-400 mb-2">ID de Inscripción Escolar *</label>
                        <input
                            type="number"
                            name="inscripcion_id"
                            value={formData.inscripcion_id}
                            onChange={handleChange}
                            required
                            placeholder="Ej: 1"
                            className={`px-4 py-3 rounded-xl border ${validationErrors.inscripcion_id ? 'border-rose-500' : 'border-slate-800'} bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm`}
                        />
                        {validationErrors.inscripcion_id && <span className="text-xs text-rose-400 mt-1">{validationErrors.inscripcion_id[0]}</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Parcial 1 */}
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-2">Parcial 1 (25%) *</label>
                            <input
                                type="number"
                                step="0.01"
                                name="parcial_1"
                                value={formData.parcial_1}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                                className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>

                        {/* Parcial 2 */}
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-2">Parcial 2 (25%) *</label>
                            <input
                                type="number"
                                step="0.01"
                                name="parcial_2"
                                value={formData.parcial_2}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                                className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>

                        {/* Examen Final */}
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-2">Final (50%) *</label>
                            <input
                                type="number"
                                step="0.01"
                                name="examen_final"
                                value={formData.examen_final}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                                className="px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-4 ${
                            loading
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/20 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500'
                        }`}
                    >
                        {loading ? 'Guardando Calificaciones...' : 'Guardar Calificaciones Oficiales'}
                    </button>
                </form>

                {/* Resultados de la Auditoría Recíproca */}
                {calificacionCalculada && (
                    <div className="mt-8 pt-6 border-t border-slate-800 text-left relative z-10 animate-fade-in">
                        <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest mb-3">Auditoría en Calificaciones</h4>
                        <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-bold">Promedio Ponderado</span>
                                <span className="text-lg font-black text-white">{calificacionCalculada.promedio_ponderado} / 100.00</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-bold">Estado de Aprobación</span>
                                <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-extrabold uppercase ${
                                    calificacionCalculada.estado_aprobacion
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                                }`}>
                                    {calificacionCalculada.estado_aprobacion ? 'Aprobado' : 'Reprobado'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistroNotas;

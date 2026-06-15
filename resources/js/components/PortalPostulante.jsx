import React, { useState, useEffect } from 'react';

const PortalPostulante = (props) => {
    const [periodos, setPeriodos] = useState([]);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
    const [notas, setNotas] = useState([]);
    const [postulanteInfo, setPostulanteInfo] = useState(null);
    const [loadingPeriodos, setLoadingPeriodos] = useState(true);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('auth_token');
        return {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // Cargar períodos históricos al montar
    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const res = await fetch('/api/estudiante/periodos', {
                    method: 'GET',
                    headers: getHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setPeriodos(data.periodos ?? []);
                    if (data.periodos && data.periodos.length > 0) {
                        // Seleccionar por defecto el período más reciente
                        setPeriodoSeleccionado(data.periodos[data.periodos.length - 1]);
                    }
                } else {
                    setErrorMsg('Error al recuperar tus períodos académicos.');
                }
            } catch (err) {
                setErrorMsg('Error de red al conectar con el servidor.');
            } finally {
                setLoadingPeriodos(false);
            }
        };

        fetchPeriodos();
    }, []);

    // Cargar notas al cambiar el período seleccionado
    useEffect(() => {
        if (!periodoSeleccionado) return;

        const fetchNotas = async () => {
            setLoadingNotas(true);
            setErrorMsg(null);
            try {
                const res = await fetch(`/api/estudiante/notas/${periodoSeleccionado}`, {
                    method: 'GET',
                    headers: getHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotas(data.notas ?? []);
                    setPostulanteInfo(data.postulante ?? null);
                } else {
                    setErrorMsg('No se pudieron recuperar las notas para el período seleccionado.');
                }
            } catch (err) {
                setErrorMsg('Error de conexión al cargar las calificaciones.');
            } finally {
                setLoadingNotas(false);
            }
        };

        fetchNotas();
    }, [periodoSeleccionado]);

    const handleLogout = () => {
        localStorage.clear();
        if (props.onNavigate) {
            props.onNavigate('login');
        } else {
            window.location.href = '/login';
        }
    };

    // Calcular estadísticas globales
    const totalMaterias = notas.length;
    const promedioGlobal = totalMaterias > 0
        ? (notas.reduce((acc, n) => acc + parseFloat(n.promedio_ponderado || 0), 0) / totalMaterias).toFixed(2)
        : '0.00';

    const materiasAprobadas = notas.filter(n => n.estado_aprobacion === true || n.estado_aprobacion === 1 || parseFloat(n.promedio_ponderado) >= 60).length;
    
    // Regla institucional: el estudiante es Admitido si aprueba las 4 materias básicas y su promedio >= 60
    const esAdmitido = totalMaterias === 4 && materiasAprobadas === 4 && parseFloat(promedioGlobal) >= 60;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 relative overflow-hidden">
            {/* Fondo decorativo de luces premium */}
            <div className="absolute top-0 right-0 -mt-24 -mr-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
                {/* Cabecera */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 gap-4">
                    <div>
                        <span className="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-800/60 rounded-full uppercase tracking-wider">
                            Portal del Postulante
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                            Historial Académico del CUP
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Consulta tus notas finales, promedios ponderados y estados de admisión por gestión académica.
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition duration-200"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                {/* Mensaje de Error */}
                {errorMsg && (
                    <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 text-sm font-medium">
                        <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Perfil del Alumno e Historial Selector */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Información del Postulante */}
                    <div className="md:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Información Personal</h3>
                            {postulanteInfo ? (
                                <div className="space-y-3">
                                    <div className="text-2xl font-black text-white">
                                        {postulanteInfo.nombres} {postulanteInfo.apellidos}
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                                        <div>
                                            <span className="text-slate-500">C.I.:</span> <span className="font-mono">{postulanteInfo.ci}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Tipo de Acceso:</span> <span className="text-blue-400 font-semibold">Examen CUP</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-6 w-48 bg-slate-800 rounded"></div>
                                    <div className="h-4 w-32 bg-slate-800 rounded"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selector de Período Académico */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Seleccionar Período Académico
                        </label>
                        {loadingPeriodos ? (
                            <div className="h-10 w-full bg-slate-800 rounded animate-pulse"></div>
                        ) : periodos.length === 0 ? (
                            <div className="text-amber-400 text-sm py-2">
                                No se encontraron registros de períodos académicos.
                            </div>
                        ) : (
                            <select
                                value={periodoSeleccionado}
                                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
                            >
                                {periodos.map(p => (
                                    <option key={p} value={p}>
                                        Intento / Gestión {p}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Calificaciones */}
                {periodoSeleccionado && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
                            <h3 className="font-bold text-white text-base">
                                Calificaciones Registradas — Período {periodoSeleccionado}
                            </h3>
                        </div>

                        {loadingNotas ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                                <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Cargando planilla de calificaciones...</span>
                            </div>
                        ) : notas.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-sm">
                                Aún no posees inscripciones ni actas de calificaciones en este período.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4">Sigla</th>
                                            <th className="px-6 py-4">Materia</th>
                                            <th className="px-6 py-4">Grupo / Paralelo</th>
                                            <th className="px-6 py-4 text-center">Parcial 1 (30%)</th>
                                            <th className="px-6 py-4 text-center">Parcial 2 (30%)</th>
                                            <th className="px-6 py-4 text-center">Ex. Final (40%)</th>
                                            <th className="px-6 py-4 text-center text-indigo-400">Nota Final</th>
                                            <th className="px-6 py-4 text-center">Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {notas.map((row) => {
                                            const finalNote = parseFloat(row.promedio_ponderado || 0);
                                            const aprobado = row.estado_aprobacion === true || row.estado_aprobacion === 1 || finalNote >= 60;

                                            return (
                                                <tr key={row.sigla} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">{row.sigla}</td>
                                                    <td className="px-6 py-4 font-semibold text-white">{row.materia}</td>
                                                    <td className="px-6 py-4 text-slate-400">{row.nombre_paralelo}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.parcial_1 ?? '—'}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.parcial_2 ?? '—'}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-slate-300">{row.examen_final ?? '—'}</td>
                                                    <td className="px-6 py-4 text-center font-mono font-black text-indigo-400 text-base">{row.promedio_ponderado ?? '0.00'}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {aprobado ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                                                                ✓ Aprobada
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-950/60 text-rose-400 border border-rose-800/60">
                                                                ✗ Reprobada
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tarjetas KPI de Resumen y Estado de Admisión */}
                {notas.length > 0 && !loadingNotas && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Promedio Ponderado Global */}
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-between group hover:border-indigo-500/50 transition-all duration-300">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Promedio Ponderado Global</span>
                                <h3 className="text-4xl font-black mt-2 text-white">{promedioGlobal}</h3>
                                <p className="text-slate-500 text-xs mt-1">Materias aprobadas: {materiasAprobadas} de {totalMaterias}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>

                        {/* Estado de Admisión */}
                        <div className={`p-6 border rounded-3xl flex items-center justify-between transition-all duration-300 ${
                            esAdmitido
                                ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300 hover:border-emerald-500/50'
                                : 'bg-rose-950/20 border-rose-800 text-rose-300 hover:border-rose-500/50'
                        }`}>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-85">Estado de Admisión Oficial</span>
                                <h3 className="text-4xl font-black mt-2">
                                    {esAdmitido ? 'ADMITIDO' : 'NO ADMITIDO'}
                                </h3>
                                <p className="text-xs mt-1 opacity-75">
                                    {esAdmitido
                                        ? '¡Felicidades! Cumples con la aprobación completa para ingresar a la FICCT.'
                                        : 'Deberás regularizar tu situación académica o postularte en una segunda opción.'}
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl border ${
                                esAdmitido
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                                {esAdmitido ? (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalPostulante;

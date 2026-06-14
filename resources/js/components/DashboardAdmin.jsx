import React, { useState, useEffect } from 'react';

const DashboardAdmin = (props) => {
    const [stats, setStats] = useState({
        total_inscritos: 0,
        total_aprobados: 0,
        total_reprobados: 0,
        grupos_necesarios_calculados: 0
    });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // --- CU-10: Estado de la distribución áulica ---
    const [distribucionLoading, setDistribucionLoading] = useState(false);
    const [distribucionAlert, setDistribucionAlert] = useState(null); // { type: 'success'|'error', mensaje, detalle? }

    // --- CU-14: Estado del Corte de Admisión ---
    const [admisionLoading, setAdmisionLoading] = useState(false);
    const [admisionAlert, setAdmisionAlert] = useState(null);

    // --- CU-15: Estado de la Segunda Opción ---
    const [segundaOpcionLoading, setSegundaOpcionLoading] = useState(false);
    const [segundaOpcionAlert, setSegundaOpcionAlert] = useState(null);

    // Cargar estadísticas académicas desde el backend
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/academicos/dashboard', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                } else {
                    setErrorMsg('No se pudieron recuperar las estadísticas administrativas.');
                }
            } catch (error) {
                setErrorMsg('Error de red al conectar con el servidor.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        if (props.onNavigate) {
            props.onNavigate('login');
        } else {
            window.location.href = '/login';
        }
    };

    /**
     * CU-10 — Algoritmo de Distribución Áulica
     * Consume el endpoint POST /api/academicos/distribuir-aulas
     * con el token de Sanctum almacenado en localStorage.
     */
    const handleEjecutarDistribucion = async () => {
        setDistribucionLoading(true);
        setDistribucionAlert(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/academicos/distribuir-aulas', {
                method: 'POST',
                headers: {
                    'Accept':        'application/json',
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setDistribucionAlert({
                    type:    'success',
                    mensaje: data.mensaje || 'Distribución áulica completada.',
                    detalle: `${data.asignados ?? 0} postulante(s) asignado(s) a grupos.`,
                });

                // Refrescar métricas del dashboard para reflejar los nuevos inscritos
                const dashRes = await fetch('/api/academicos/dashboard', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                });
                if (dashRes.ok) {
                    const dashData = await dashRes.json();
                    setStats(dashData);
                }
            } else {
                setDistribucionAlert({
                    type:    'error',
                    mensaje: data.error   || 'Error al ejecutar la distribución áulica.',
                    detalle: data.detalle || null,
                });
            }
        } catch (err) {
            setDistribucionAlert({
                type:    'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message || null,
            });
        } finally {
            setDistribucionLoading(false);
        }
    };

    /**
     * CU-14 — Algoritmo Core de Admisión por Mérito
     * Consume el endpoint POST /api/academicos/corte-admision
     */
    const handleEjecutarAdmision = async () => {
        if (!window.confirm('¿Estás seguro de ejecutar el Algoritmo de Admisión por Mérito (CU-14)? Esta acción calculará los cortes de admisión y asignará estados definitivos a los postulantes.')) {
            return;
        }

        setAdmisionLoading(true);
        setAdmisionAlert(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/academicos/corte-admision', {
                method: 'POST',
                headers: {
                    'Accept':        'application/json',
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setAdmisionAlert({
                    type:    'success',
                    mensaje: data.mensaje || 'Corte de admisión ejecutado correctamente.',
                    detalle: data.resumen
                        ? `Admitidos: ${data.resumen.admitidos ?? 0} | No Admitidos: ${data.resumen.no_admitidos ?? 0} | Pendientes 2da Opción: ${data.resumen.pendiente_segunda ?? 0}`
                        : null,
                });

                // Refrescar métricas del dashboard
                const dashRes = await fetch('/api/academicos/dashboard', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                });
                if (dashRes.ok) {
                    const dashData = await dashRes.json();
                    setStats(dashData);
                }
            } else {
                setAdmisionAlert({
                    type:    'error',
                    mensaje: data.error   || 'Error al ejecutar el corte de admisión.',
                    detalle: data.detalle || null,
                });
            }
        } catch (err) {
            setAdmisionAlert({
                type:    'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message || null,
            });
        } finally {
            setAdmisionLoading(false);
        }
    };

    /**
     * CU-15 — Reasignación Segunda Opción
     * Consume el endpoint POST /api/academicos/segunda-opcion
     */
    const handleEjecutarSegundaOpcion = async () => {
        if (!window.confirm('¿Estás seguro de ejecutar el procesamiento de Segunda Opción? Esta acción modificará los estados de los postulantes de forma definitiva y los reasignará según su segunda opción o contingencia.')) {
            return;
        }

        setSegundaOpcionLoading(true);
        setSegundaOpcionAlert(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/academicos/segunda-opcion', {
                method: 'POST',
                headers: {
                    'Accept':        'application/json',
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setSegundaOpcionAlert({
                    type:    'success',
                    mensaje: data.mensaje || 'Reasignación completada.',
                    detalle: `Admitidos totales: ${data.resumen?.admitidos || 0} | No Admitidos totales: ${data.resumen?.no_admitidos || 0} | Aún Pendientes: ${data.resumen?.pendiente_segunda || 0}`,
                });

                // Refrescar métricas del dashboard para reflejar los nuevos cambios
                const dashRes = await fetch('/api/academicos/dashboard', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                });
                if (dashRes.ok) {
                    const dashData = await dashRes.json();
                    setStats(dashData);
                }
            } else {
                setSegundaOpcionAlert({
                    type:    'error',
                    mensaje: data.error   || 'Error al ejecutar Segunda Opción.',
                    detalle: data.detalle || null,
                });
            }
        } catch (err) {
            setSegundaOpcionAlert({
                type:    'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message || null,
            });
        } finally {
            setSegundaOpcionLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
                <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-slate-400 mt-4 text-sm font-medium">Cargando métricas de planificación...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">
            {/* ── Header del Dashboard ── */}
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-6 mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Panel Administrativo del CUP</h1>
                    <p className="text-slate-400 text-sm mt-1">Admisiones FICCT — Gestión e Indicadores en tiempo real</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* ── Botón CU-10: Distribución Áulica ── */}
                    <button
                        id="btn-distribuir-aulas"
                        onClick={handleEjecutarDistribucion}
                        disabled={distribucionLoading}
                        className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                                   bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600
                                   hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500
                                   shadow-lg shadow-indigo-900/50 hover:shadow-indigo-700/60
                                   disabled:opacity-60 disabled:cursor-not-allowed
                                   transition-all duration-200 active:scale-95"
                    >
                        {distribucionLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Distribuyendo...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>Ejecutar Distribución Áulica (CU-10)</span>
                            </>
                        )}
                    </button>

                    {/* ── Botón CU-14: Admisión por Mérito ── */}
                    <button
                        id="btn-corte-admision"
                        onClick={handleEjecutarAdmision}
                        disabled={admisionLoading}
                        className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                                   bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600
                                   hover:from-emerald-500 hover:via-green-500 hover:to-teal-500
                                   shadow-lg shadow-emerald-900/50 hover:shadow-emerald-700/60
                                   disabled:opacity-60 disabled:cursor-not-allowed
                                   transition-all duration-200 active:scale-95"
                    >
                        {admisionLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Procesando Admisión...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Ejecutar Admisión por Mérito (CU-14)</span>
                            </>
                        )}
                    </button>

                    {/* ── Botón CU-15: Segunda Opción ── */}
                    <button
                        id="btn-segunda-opcion"
                        onClick={handleEjecutarSegundaOpcion}
                        disabled={segundaOpcionLoading}
                        className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                                   bg-gradient-to-r from-amber-500 to-orange-600
                                   hover:from-amber-400 hover:to-orange-500
                                   shadow-lg shadow-orange-900/50 hover:shadow-orange-700/60
                                   disabled:opacity-60 disabled:cursor-not-allowed
                                   transition-all duration-200 active:scale-95"
                    >
                        {segundaOpcionLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Ejecutar Segunda Opción (CU-15)</span>
                            </>
                        )}
                    </button>

                    <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 font-medium">
                        Auditoría: Activa
                    </span>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition duration-200"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-10">
                {/* ── Alerta CU-10: Resultado de la Distribución Áulica ── */}
                {distribucionAlert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border transition-all duration-300 ${
                            distribucionAlert.type === 'success'
                                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {distribucionAlert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p>{distribucionAlert.mensaje}</p>
                            {distribucionAlert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{distribucionAlert.detalle}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setDistribucionAlert(null)}
                            className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
                            aria-label="Cerrar alerta"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Alerta CU-14: Resultado de Admisión por Mérito ── */}
                {admisionAlert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border transition-all duration-300 ${
                            admisionAlert.type === 'success'
                                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {admisionAlert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p>{admisionAlert.mensaje}</p>
                            {admisionAlert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{admisionAlert.detalle}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setAdmisionAlert(null)}
                            className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
                            aria-label="Cerrar alerta"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Alerta CU-15: Resultado de Segunda Opción ── */}
                {segundaOpcionAlert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border transition-all duration-300 ${
                            segundaOpcionAlert.type === 'success'
                                ? 'bg-amber-950/40 border-amber-700 text-amber-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {segundaOpcionAlert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p>{segundaOpcionAlert.mensaje}</p>
                            {segundaOpcionAlert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{segundaOpcionAlert.detalle}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSegundaOpcionAlert(null)}
                            className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
                            aria-label="Cerrar alerta"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Alerta de Error de carga del Dashboard ── */}
                {errorMsg && (

                    <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 text-sm font-medium">
                        <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Grid de Tarjetas KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Inscritos */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inscritos</span>
                            <h3 className="text-3xl font-black mt-1 text-white">{stats.total_inscritos}</h3>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 pointer-events-none"></div>
                    </div>

                    {/* Total Aprobados */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aprobados / Admitidos</span>
                            <h3 className="text-3xl font-black mt-1 text-emerald-400">{stats.total_aprobados}</h3>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 pointer-events-none"></div>
                    </div>

                    {/* Total Reprobados */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-rose-500/50 transition-all duration-300">
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-2-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No Admitidos / Reprobados</span>
                            <h3 className="text-3xl font-black mt-1 text-rose-400">{stats.total_reprobados}</h3>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 pointer-events-none"></div>
                    </div>

                    {/* Grupos Dinámicos */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grupos Necesarios (Examen)</span>
                            <h3 className="text-3xl font-black mt-1 text-indigo-400">{stats.grupos_necesarios_calculados}</h3>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 pointer-events-none"></div>
                    </div>
                </div>

                {/* Accesos Directos de Navegación */}
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden">
                    <h3 className="text-xl font-bold mb-6">Módulos Administrativos y de Reporte</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button 
                            onClick={() => props.onNavigate && props.onNavigate('reportes')} 
                            className="p-6 rounded-2xl border border-slate-800 hover:border-blue-500 bg-slate-950 flex flex-col justify-between h-40 transition-all duration-200 hover:-translate-y-1 w-full text-left"
                        >
                            <div>
                                <h4 className="font-bold text-white text-base">Fiscalización de Reportes</h4>
                                <p className="text-xs text-slate-400 mt-2">Acceso a la central de fiscalización académica con filtrado en tiempo real.</p>
                            </div>
                            <span className="text-xs text-blue-400 font-semibold flex items-center gap-1">
                                Ir al módulo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                            </span>
                        </button>
 
                        <button 
                            onClick={() => props.onNavigate && props.onNavigate('notas')} 
                            className="p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 bg-slate-950 flex flex-col justify-between h-40 transition-all duration-200 hover:-translate-y-1 w-full text-left"
                        >
                            <div>
                                <h4 className="font-bold text-white text-base">Registro de Calificaciones</h4>
                                <p className="text-xs text-slate-400 mt-2">Módulo docente para registrar notas de exámenes parciales y finales.</p>
                            </div>
                            <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                                Ir al módulo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                            </span>
                        </button>
 
                        <button 
                            onClick={() => props.onNavigate && props.onNavigate('inscripcion')} 
                            className="p-6 rounded-2xl border border-slate-800 hover:border-purple-500 bg-slate-950 flex flex-col justify-between h-40 transition-all duration-200 hover:-translate-y-1 w-full text-left"
                        >
                            <div>
                                <h4 className="font-bold text-white text-base">Registro de Postulantes</h4>
                                <p className="text-xs text-slate-400 mt-2">Formulario de autoinscripción externa para los nuevos alumnos del CUP.</p>
                            </div>
                            <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                                Ir al módulo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAdmin;

import React, { useState, useEffect } from 'react';

const PanelReportes = (props) => {
    const [mainTab, setMainTab] = useState('listados'); // 'listados' | 'metricas' | 'bitacora'
    const [subTabListados, setSubTabListados] = useState('general'); // 'general' | 'aprobados' | 'reprobados'
    
    const [postulantes, setPostulantes] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [rendimiento, setRendimiento] = useState([]);
    const [logsBitacora, setLogsBitacora] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);

    // --- CU-03: Carga Masiva CSV ---
    const [archivoCSV, setArchivoCSV] = useState(null);
    const [cargaMasivaLoading, setCargaMasivaLoading] = useState(false);
    const [cargaMasivaAlert, setCargaMasivaAlert] = useState(null);

    // --- CU-07: Pasarela de Pagos QR ---
    const [pasarelaLoading, setPasarelaLoading] = useState(false);
    const [pasarelaAlert, setPasarelaAlert] = useState(null);

    // Paginación local para listados
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    /**
     * CU-03 — Procesar archivo CSV de carga masiva
     */
    const handleCargaMasiva = async () => {
        if (!archivoCSV) {
            setCargaMasivaAlert({ type: 'error', mensaje: 'Seleccione un archivo CSV o Excel antes de procesar.' });
            return;
        }

        setCargaMasivaLoading(true);
        setCargaMasivaAlert(null);

        try {
            const token = localStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('archivo', archivoCSV);

            const response = await fetch('/api/postulantes/importar-lote', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setCargaMasivaAlert({
                    type: 'success',
                    mensaje: data.mensaje || 'Carga masiva completada.',
                    detalle: data.errores && data.errores.length > 0
                        ? `${data.insertados} insertados. ${data.errores.length} fila(s) con errores.`
                        : `${data.insertados} postulante(s) insertados sin errores.`,
                });
                setArchivoCSV(null);
                // Reset file input
                const fileInput = document.getElementById('input-csv-lote');
                if (fileInput) fileInput.value = '';
            } else {
                setCargaMasivaAlert({
                    type: 'error',
                    mensaje: data.error || data.message || 'Error al procesar el archivo.',
                    detalle: data.detalle || null,
                });
            }
        } catch (err) {
            setCargaMasivaAlert({
                type: 'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message || null,
            });
        } finally {
            setCargaMasivaLoading(false);
        }
    };

    /**
     * CU-07 — Simulación de Pasarela de Pagos QR
     */
    const handlePasarelaQR = async () => {
        if (!window.confirm('¿Confirmar la ejecución del webhook de simulación de pagos QR? Todos los postulantes con pago pendiente serán marcados como "Pagado".')) {
            return;
        }

        setPasarelaLoading(true);
        setPasarelaAlert(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/postulantes/webhook-pago-qr', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setPasarelaAlert({
                    type: 'success',
                    mensaje: data.mensaje || 'Webhook de pagos procesado.',
                    detalle: `${data.confirmados ?? 0} pago(s) confirmado(s).`,
                });
            } else {
                setPasarelaAlert({
                    type: 'error',
                    mensaje: data.error || 'Error al ejecutar la simulación de pagos.',
                    detalle: data.detalle || null,
                });
            }
        } catch (err) {
            setPasarelaAlert({
                type: 'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message || null,
            });
        } finally {
            setPasarelaLoading(false);
        }
    };

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            setErrorMsg(null);
            try {
                const token = localStorage.getItem('auth_token');
                const headers = {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                if (mainTab === 'listados') {
                    let endpoint = '/api/reportes/general';
                    if (subTabListados === 'aprobados') endpoint = '/api/reportes/aprobados';
                    if (subTabListados === 'reprobados') endpoint = '/api/reportes/reprobados';

                    const response = await fetch(endpoint, { method: 'GET', headers });
                    if (response.ok) {
                        const data = await response.json();
                        setPostulantes(data);
                    } else {
                        setErrorMsg('Error al recuperar los listados de postulantes.');
                    }
                } else if (mainTab === 'metricas') {
                    // Cargar ambas APIs en paralelo
                    const [resEstadisticas, resRendimiento] = await Promise.all([
                        fetch('/api/reportes/estadisticas', { method: 'GET', headers }),
                        fetch('/api/reportes/rendimiento-grupos', { method: 'GET', headers })
                    ]);

                    if (resEstadisticas.ok && resRendimiento.ok) {
                        const dataEstadisticas = await resEstadisticas.json();
                        const dataRendimiento = await resRendimiento.json();
                        setEstadisticas(dataEstadisticas);
                        setRendimiento(dataRendimiento);
                    } else {
                        setErrorMsg('Error al recuperar las métricas y estadísticas.');
                    }
                } else if (mainTab === 'bitacora') {
                    const response = await fetch('/api/reportes/bitacora', { method: 'GET', headers });
                    if (response.ok) {
                        const data = await response.json();
                        setLogsBitacora(data);
                    } else {
                        setErrorMsg('Error al recuperar los logs de auditoría.');
                    }
                }
            } catch (error) {
                setErrorMsg('Error de red al conectar con el servidor.');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
        setCurrentPage(1); // Reset page on tab change
    }, [mainTab, subTabListados]);

    const filteredPostulantes = postulantes.filter((p) =>
        p.ci.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredPostulantes.length / itemsPerPage);
    const currentPostulantes = filteredPostulantes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 print:bg-white print:text-black print:p-0">
            <style>{`
                @media print {
                    /* Forzar a que el contenedor principal de la tabla y sus filas tengan height: auto y overflow: visible */
                    body, html, #root, .min-h-screen, .max-w-7xl, table, tbody, tr, td, th, div {
                        height: auto !important;
                        overflow: visible !important;
                    }
                    /* Evitar saltos de página dentro de las filas de la tabla */
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* ── Botón Volver ── */}
                {props.onNavigate && (
                    <div className="print:hidden">
                        <button
                            onClick={() => props.onNavigate('dashboard')}
                            className="inline-flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700
                                       text-slate-300 rounded-full border border-slate-700
                                       transition duration-200 shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    </div>
                )}
                
                {/* Cabecera (Oculta en impresión excepto título) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 print:border-black pb-6 gap-4">
                    <div className="flex flex-col gap-2">

                        <h1 className="text-3xl font-extrabold tracking-tight mt-1 print:text-black">Panel Ejecutivo de Reportes</h1>
                        <p className="text-slate-400 text-sm print:text-slate-700">Sistema de Admisión CUP - FICCT (UAGRM)</p>
                    </div>
                    
                    <div className="flex items-center gap-4 print:hidden">
                        <button 
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition duration-200 border border-slate-700 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            Exportar Acta / Imprimir
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* TARJETAS DE ADMINISTRACIÓN — Ciclo 1 (CU-03 / CU-07)    */}
                {/* ══════════════════════════════════════════════════════════ */}
                {(localStorage.getItem('user_rol') === '1' || localStorage.getItem('user_rol') === 'Administrador') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">

                        {/* ── Tarjeta CU-03: Carga Masiva de Postulantes ── */}
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 pointer-events-none"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Carga Masiva de Postulantes</h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-4">Suba un archivo <strong className="text-slate-300">.csv</strong> o <strong className="text-slate-300">.xlsx</strong> con los datos del lote de postulantes para registro masivo automatizado.</p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <input
                                    id="input-csv-lote"
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    onChange={(e) => setArchivoCSV(e.target.files[0] || null)}
                                    className="flex-1 text-xs text-slate-300 file:mr-3 file:py-2 file:px-4
                                               file:rounded-lg file:border-0 file:text-xs file:font-bold
                                               file:bg-slate-800 file:text-blue-400 file:cursor-pointer
                                               hover:file:bg-slate-700 transition-all
                                               bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
                                />
                                <button
                                    id="btn-cargar-lote-csv"
                                    onClick={handleCargaMasiva}
                                    disabled={cargaMasivaLoading}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold
                                               bg-gradient-to-r from-blue-600 to-cyan-600
                                               hover:from-blue-500 hover:to-cyan-500
                                               shadow-lg shadow-blue-900/40 hover:shadow-blue-700/50
                                               disabled:opacity-60 disabled:cursor-not-allowed
                                               transition-all duration-200 active:scale-95 whitespace-nowrap"
                                >
                                    {cargaMasivaLoading ? (
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <span>Procesar Archivo de Lotes (CSV/Excel)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ── Tarjeta CU-07: Simulación de Pasarela de Pagos QR ── */}
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 pointer-events-none"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Pasarela de Pagos QR</h3>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-4">Simula la verificación asíncrona de pagos del proveedor QR externo. Confirma automáticamente todos los postulantes con pago <strong className="text-slate-300">pendiente</strong>.</p>
                            <button
                                id="btn-pasarela-qr"
                                onClick={handlePasarelaQR}
                                disabled={pasarelaLoading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold
                                           bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600
                                           hover:from-purple-500 hover:via-violet-500 hover:to-fuchsia-500
                                           shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50
                                           disabled:opacity-60 disabled:cursor-not-allowed
                                           transition-all duration-200 active:scale-95"
                            >
                                {pasarelaLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Verificando...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span>Verificar Pasarela de Pagos QR</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Alertas CU-03 / CU-07 ── */}
                {cargaMasivaAlert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border transition-all duration-300 print:hidden ${
                            cargaMasivaAlert.type === 'success'
                                ? 'bg-blue-950/40 border-blue-700 text-blue-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {cargaMasivaAlert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p>{cargaMasivaAlert.mensaje}</p>
                            {cargaMasivaAlert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{cargaMasivaAlert.detalle}</p>
                            )}
                        </div>
                        <button onClick={() => setCargaMasivaAlert(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-lg leading-none" aria-label="Cerrar alerta">✕</button>
                    </div>
                )}

                {pasarelaAlert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border transition-all duration-300 print:hidden ${
                            pasarelaAlert.type === 'success'
                                ? 'bg-purple-950/40 border-purple-700 text-purple-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {pasarelaAlert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p>{pasarelaAlert.mensaje}</p>
                            {pasarelaAlert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{pasarelaAlert.detalle}</p>
                            )}
                        </div>
                        <button onClick={() => setPasarelaAlert(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity text-lg leading-none" aria-label="Cerrar alerta">✕</button>
                    </div>
                )}

                {/* Main Tabs (Ocultos en impresión) */}
                <div className="flex border-b border-slate-800 gap-4 print:hidden">
                    <button
                        onClick={() => setMainTab('listados')}
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                            mainTab === 'listados' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Listados Oficiales
                    </button>
                    <button
                        onClick={() => setMainTab('metricas')}
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                            mainTab === 'metricas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Métricas & Estadísticas CUP
                    </button>
                    <button
                        onClick={() => setMainTab('bitacora')}
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                            mainTab === 'bitacora' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Bitácora de Auditoría del Sistema
                    </button>
                </div>

                {/* Error Alert */}
                {errorMsg && (
                    <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 text-sm font-medium print:hidden">
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="py-20 flex flex-col justify-center items-center print:hidden">
                        <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-slate-500 text-xs mt-3">Generando reporte...</span>
                    </div>
                )}

                {/* TAB 1: LISTADOS OFICIALES */}
                {!loading && mainTab === 'listados' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                            {/* Sub Tabs Selector */}
                            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                                <button
                                    onClick={() => setSubTabListados('general')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTabListados === 'general' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setSubTabListados('aprobados')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTabListados === 'aprobados' ? 'bg-emerald-900/50 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Aprobados (≥60)
                                </button>
                                <button
                                    onClick={() => setSubTabListados('reprobados')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTabListados === 'reprobados' ? 'bg-rose-900/50 text-rose-400' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Reprobados (&lt;60)
                                </button>
                            </div>
                            
                            {/* Buscador */}
                            <div className="w-full sm:w-64 relative">
                                <input
                                    type="text"
                                    placeholder="Buscar postulante..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2 pl-9 rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>

                        {/* Title for Print */}
                        <div className="hidden print:block text-xl font-bold border-b border-black pb-2 mb-4">
                            Acta Oficial de {subTabListados === 'general' ? 'Todos los Postulantes' : subTabListados === 'aprobados' ? 'Postulantes Aprobados' : 'Postulantes Reprobados'}
                        </div>

                        {/* Tabla de Listados (Pantalla: Paginada) */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-4">CI</th>
                                            <th className="px-6 py-4">Nombre Completo</th>
                                            <th className="px-6 py-4">Carrera Asignada (Estado)</th>
                                            <th className="px-6 py-4 text-center">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-sm">
                                        {currentPostulantes.map((p) => {
                                            const inscripcion = p.inscripciones?.[0];
                                            const calificacion = inscripcion?.calificacion;
                                            const promedio = p.promedio_calculado !== undefined && p.promedio_calculado !== null
                                                ? parseFloat(p.promedio_calculado).toFixed(2)
                                                : (calificacion ? parseFloat(calificacion.promedio_ponderado).toFixed(2) : 'S/N');
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-800/30 transition duration-150">
                                                    <td className="px-6 py-3 font-semibold">{p.ci}</td>
                                                    <td className="px-6 py-3 font-bold">{p.nombres} {p.apellidos}</td>
                                                    <td className="px-6 py-3">
                                                        {p.estado_final === 'Admitido' 
                                                            ? `Admitido - ${(p.carrera_opcion1?.nombre_carrera || '').toUpperCase()}` 
                                                            : p.estado_final}
                                                    </td>
                                                    <td className="px-6 py-3 text-center font-bold">
                                                        {promedio}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {currentPostulantes.length === 0 && (
                                            <tr><td colSpan="4" className="text-center py-10 text-slate-500">No hay registros para mostrar.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tabla de Listados (Impresión: Todos los registros) */}
                        <div className="hidden print:block bg-white border border-black rounded-none shadow-none text-black">
                            <div className="overflow-visible">
                                <table className="w-full text-left border-collapse text-black">
                                    <thead>
                                        <tr className="border-b border-black bg-gray-100 text-black text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-4">CI</th>
                                            <th className="px-6 py-4">Nombre Completo</th>
                                            <th className="px-6 py-4">Carrera Asignada (Estado)</th>
                                            <th className="px-6 py-4 text-center">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black text-sm text-black">
                                        {filteredPostulantes.map((p) => {
                                            const inscripcion = p.inscripciones?.[0];
                                            const calificacion = inscripcion?.calificacion;
                                            const promedio = p.promedio_calculado !== undefined && p.promedio_calculado !== null
                                                ? parseFloat(p.promedio_calculado).toFixed(2)
                                                : (calificacion ? parseFloat(calificacion.promedio_ponderado).toFixed(2) : 'S/N');
                                            return (
                                                <tr key={p.id} className="border-b border-black">
                                                    <td className="px-6 py-3 font-semibold">{p.ci}</td>
                                                    <td className="px-6 py-3 font-bold">{p.nombres} {p.apellidos}</td>
                                                    <td className="px-6 py-3">
                                                        {p.estado_final === 'Admitido' 
                                                            ? `Admitido - ${(p.carrera_opcion1?.nombre_carrera || '').toUpperCase()}` 
                                                            : p.estado_final}
                                                    </td>
                                                    <td className="px-6 py-3 text-center font-bold">
                                                        {promedio}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredPostulantes.length === 0 && (
                                            <tr><td colSpan="4" className="text-center py-10 text-black">No hay registros para mostrar.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center print:hidden text-sm">
                                <span className="text-slate-400">Página {currentPage} de {totalPages}</span>
                                <div className="flex gap-2">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded"
                                    >Anterior</button>
                                    <button 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded"
                                    >Siguiente</button>
                                </div>
                            </div>
                        )}
                        
                        <div className="hidden print:block mt-20 text-center">
                            <div className="inline-block border-t border-black w-64 pt-2">
                                Firma Autorizada - Administración FICCT
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: MÉTRICAS & ESTADÍSTICAS */}
                {!loading && mainTab === 'metricas' && estadisticas && (
                    <div className="space-y-8">
                        <div className="hidden print:block text-xl font-bold border-b border-black pb-2 mb-4">
                            Reporte Estadístico Global
                        </div>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-900 border border-slate-800 print:border-black rounded-2xl flex items-center gap-5">
                                <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 print:hidden">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-black">Total Inscritos Evaludos</span>
                                    <h3 className="text-3xl font-black mt-1 text-white print:text-black">{estadisticas.total_inscritos}</h3>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-900 border border-slate-800 print:border-black rounded-2xl flex items-center gap-5">
                                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 print:hidden">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-black">Promedio Ponderado General</span>
                                    <h3 className="text-3xl font-black mt-1 text-emerald-400 print:text-black">{estadisticas.promedio_general}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Desglose por Materia */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 print:text-black">Desglose por Materia</h3>
                            <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-black rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse print:text-black">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-3">Materia</th>
                                            <th className="px-6 py-3 text-center">Inscritos</th>
                                            <th className="px-6 py-3 text-center">Promedio</th>
                                            <th className="px-6 py-3 text-center">Aulas Proyectadas (Cap. 60)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-black text-sm">
                                        {estadisticas.desglose_materias.map((mat, idx) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-3 font-semibold">{mat.materia}</td>
                                                <td className="px-6 py-3 text-center">{mat.inscritos}</td>
                                                <td className="px-6 py-3 text-center font-bold">{mat.promedio}</td>
                                                <td className="px-6 py-3 text-center text-blue-400 print:text-black font-bold">{mat.aulas_proyectadas}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Ranking Grupos */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 print:text-black">Ranking: Grupos con mayor aprobación (≥60)</h3>
                            <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-black rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse print:text-black">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-3">Grupo</th>
                                            <th className="px-6 py-3">Materia</th>
                                            <th className="px-6 py-3">Docente</th>
                                            <th className="px-6 py-3 text-center">Aprobados / Inscritos</th>
                                            <th className="px-6 py-3 text-center">% Aprobación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-black text-sm">
                                        {rendimiento.map((grp, idx) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-3 font-bold text-indigo-400 print:text-black">{grp.grupo} (Aula {grp.aula})</td>
                                                <td className="px-6 py-3">{grp.materia}</td>
                                                <td className="px-6 py-3 text-slate-300 print:text-black">{grp.docente}</td>
                                                <td className="px-6 py-3 text-center font-semibold">{grp.total_aprobados} / {grp.total_inscritos}</td>
                                                <td className="px-6 py-3 text-center font-bold text-emerald-400 print:text-black">
                                                    {grp.porcentaje_aprobacion}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="hidden print:block mt-20 text-center">
                            <div className="inline-block border-t border-black w-64 pt-2">
                                Firma Autorizada - Administración FICCT
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: BITÁCORA DE AUDITORÍA */}
                {!loading && mainTab === 'bitacora' && (
                    <div className="space-y-6">
                        <div className="hidden print:block text-xl font-bold border-b border-black pb-2 mb-4">
                            Bitácora de Auditoría del Sistema
                        </div>
                        <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-black rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse print:text-black">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-4 w-16">ID</th>
                                            <th className="px-6 py-4">Usuario / Ejecutor</th>
                                            <th className="px-6 py-4">Acción</th>
                                            <th className="px-6 py-4">Tabla</th>
                                            <th className="px-6 py-4">Dirección IP</th>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Datos Modificados (JSON)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-black text-sm">
                                        {logsBitacora.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-800/20 transition duration-150">
                                                <td className="px-6 py-4 font-mono text-slate-500">{log.id}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-white print:text-black">
                                                        {log.usuario ?? 'Sistema (Trigger)'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase ${
                                                        log.accion === 'INSERT' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' :
                                                        log.accion === 'UPDATE' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60' :
                                                        'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                                                    }`}>
                                                        {log.accion}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-slate-300 print:text-black">{log.tabla_afectada}</td>
                                                <td className="px-6 py-4 font-mono text-slate-400 print:text-black">{log.ip_address}</td>
                                                <td className="px-6 py-4 text-xs text-slate-400 print:text-black">
                                                    {new Date(log.created_at).toLocaleString('es-ES', { timeZone: 'UTC' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <pre className="text-[10px] bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-indigo-300 overflow-x-auto max-w-xs max-h-24 overflow-y-auto font-mono">
                                                        {JSON.stringify(typeof log.v_data_json === 'string' ? JSON.parse(log.v_data_json) : log.v_data_json, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))}
                                        {logsBitacora.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="text-center py-12 text-slate-500">
                                                    No se han registrado eventos de auditoría en la bitácora todavía.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PanelReportes;

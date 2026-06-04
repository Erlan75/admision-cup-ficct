import React, { useState, useEffect } from 'react';

const PanelReportes = (props) => {
    const [mainTab, setMainTab] = useState('listados'); // 'listados' | 'metricas'
    const [subTabListados, setSubTabListados] = useState('general'); // 'general' | 'aprobados' | 'reprobados'
    
    const [postulantes, setPostulantes] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [rendimiento, setRendimiento] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);

    // Paginación local para listados
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

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
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Cabecera (Oculta en impresión excepto título) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 print:border-black pb-6 gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="print:hidden">
                            <span className="px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-900/30 rounded-full uppercase tracking-wider">
                                CU-16: Módulo de Reportes
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-1 print:text-black">Panel Ejecutivo de Reportes</h1>
                        <p className="text-slate-400 text-sm print:text-slate-700">Sistema de Admisión CUP - FICCT (UAGRM)</p>
                    </div>
                    
                    <div className="flex items-center gap-4 print:hidden">
                        <button 
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition duration-200 border border-slate-700 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            Exportar Acta / Imprimir
                        </button>

                        {props.onNavigate && (
                            <button 
                                onClick={() => props.onNavigate('dashboard')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition duration-200"
                            >
                                Volver al Dashboard
                            </button>
                        )}
                    </div>
                </div>

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

                        {/* Tabla de Listados */}
                        <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-black rounded-2xl overflow-hidden shadow-xl print:shadow-none">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse print:text-black">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black text-xs font-bold uppercase tracking-wider">
                                            <th className="px-6 py-4">CI</th>
                                            <th className="px-6 py-4">Nombre Completo</th>
                                            <th className="px-6 py-4">Carrera Asignada (Estado)</th>
                                            <th className="px-6 py-4 text-center">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 print:divide-black text-sm">
                                        {currentPostulantes.map((p) => {
                                            const inscripcion = p.inscripciones?.[0];
                                            const calificacion = inscripcion?.calificacion;
                                            const promedio = calificacion ? parseFloat(calificacion.promedio_ponderado).toFixed(2) : 'S/N';
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-800/30 transition duration-150">
                                                    <td className="px-6 py-3 font-semibold">{p.ci}</td>
                                                    <td className="px-6 py-3 font-bold">{p.nombres} {p.apellidos}</td>
                                                    <td className="px-6 py-3">
                                                        {p.estado_final === 'Admitido' ? p.carrera_opcion1?.nombre_carrera : p.estado_final}
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

            </div>
        </div>
    );
};

export default PanelReportes;

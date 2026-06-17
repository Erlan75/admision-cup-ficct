import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ── Helpers ────────────────────────────────────────────────────────────────────

const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

/**
 * CU-13 — Preview local del promedio ponderado.
 * Regla institucional FICCT/CUP: P1 (30%) + P2 (30%) + EF (40%).
 * Aprobación: promedio >= 60.00 puntos.
 * Debe coincidir exactamente con la fórmula del trigger trg_01_calcular_nota.
 */
const calcularPreview = (p1, p2, ef) => {
    const n1 = parseFloat(p1);
    const n2 = parseFloat(p2);
    const n3 = parseFloat(ef);
    if (isNaN(n1) || isNaN(n2) || isNaN(n3)) return null;
    return ((n1 * 0.30) + (n2 * 0.30) + (n3 * 0.40)).toFixed(2);
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

const SpinnerIcon = ({ className = 'h-4 w-4' }) => (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

const BadgeEstado = ({ aprobado }) =>
    aprobado === null || aprobado === undefined ? (
        <span className="text-slate-600 text-xs">—</span>
    ) : aprobado ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            ✓ Aprobado
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-950/60 text-rose-400 border border-rose-800/60">
            ✗ Reprobado
        </span>
    );

const NoteInput = ({ value, onChange, disabled }) => (
    <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={onChange}
        disabled={disabled || localStorage.getItem('user_rol') === '4' || localStorage.getItem('user_rol') === 'Autoridad' || localStorage.getItem('user_rol') === '1' || localStorage.getItem('user_rol') === 'Administrador'}
        placeholder="—"
        className="w-20 px-2 py-1.5 text-center text-sm rounded-lg border border-slate-700
                   bg-slate-950 text-white placeholder-slate-600
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
    />
);

// ── Componente principal ───────────────────────────────────────────────────────

const RegistroNotas = (props) => {

    // ── Estado: Grupos y selección ─────────────────────────────────────────────
    const [grupos,          setGrupos]          = useState([]);
    const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
    const [loadingGrupos,   setLoadingGrupos]   = useState(true);

    // ── Estado: Planilla (notas editables keyed por inscripcion_id) ────────────
    const [planilla,        setPlanilla]        = useState({});   // { [inscripcion_id]: { p1, p2, ef, calificacion } }

    // ── Estado: Guardado ───────────────────────────────────────────────────────
    const [saving,          setSaving]          = useState(false);
    const [alert,           setAlert]           = useState(null); // { type, mensaje, detalle? }

    // ── Estado: Importación CSV ────────────────────────────────────────────────
    const [importing, setImporting] = useState(false);

    // ── Cargar grupos (reutilizable) ───────────────────────────────────────────
    const cargarGrupos = useCallback(async () => {
        setLoadingGrupos(true);
        try {
            const res = await fetch('/api/academicos/grupos', {
                method:  'GET',
                headers: authHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                let list = data.grupos ?? [];
                const userRol = localStorage.getItem('user_rol');
                const userName = localStorage.getItem('user_name');
                if (userRol === '2' || userRol === 'Docente') {
                    list = list.filter(g => 
                        g.docente && g.docente.usuario && g.docente.usuario.full_name === userName
                    );
                }
                setGrupos(list);
            }
        } catch {
            // Si falla, la planilla simplemente queda vacía
        } finally {
            setLoadingGrupos(false);
        }
    }, []);

    // ── Cargar grupos al montar ────────────────────────────────────────────────
    useEffect(() => {
        cargarGrupos();
    }, [cargarGrupos]);

    // ── Manejador de importación de notas vía CSV ─────────────────────────────
    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setAlert(null);

        const formData = new FormData();
        formData.append('grupo_id', grupoSeleccionado);
        formData.append('archivo', file);

        const token = localStorage.getItem('auth_token');

        try {
            const response = await axios.post('/api/docente/importar-notas-csv', formData, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = response.data;

            setAlert({
                type: 'success',
                mensaje: data.mensaje ?? 'Notas importadas con éxito desde CSV.',
                detalle: data.errores && data.errores.length > 0 
                    ? `Advertencias:\n${data.errores.join('\n')}`
                    : 'Las calificaciones han sido actualizadas y recalculadas por el sistema.'
            });

            // Recargar planilla
            await cargarGrupos();

        } catch (err) {
            const data = err.response?.data;
            setAlert({
                type: 'error',
                mensaje: data?.error ?? 'Error al importar calificaciones.',
                detalle: data?.errores ? data.errores.join('\n') : (data?.detalle ?? err.message)
            });
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset input element
        }
    };

    // ── Cuando cambia el grupo seleccionado: poblar planilla ──────────────────
    useEffect(() => {
        if (!grupoSeleccionado) {
            setPlanilla({});
            return;
        }

        const grupo = grupos.find(g => String(g.id) === String(grupoSeleccionado));
        if (!grupo) return;

        const nuevaPlanilla = {};
        (grupo.inscripciones ?? []).forEach(insc => {
            const cal = insc.calificacion;
            nuevaPlanilla[insc.id] = {
                inscripcion_id: insc.id,
                postulante:     insc.postulante,
                // Notas editables (pre-cargadas si existen en la BD)
                p1: cal?.parcial_1   ?? '',
                p2: cal?.parcial_2   ?? '',
                ef: cal?.examen_final ?? '',
                // Datos calculados por el trigger (solo se muestran tras guardar)
                promedio:   cal?.promedio_ponderado  ?? null,
                aprobado:   cal?.estado_aprobacion   ?? null,
            };
        });
        setPlanilla(nuevaPlanilla);
        setAlert(null);
    }, [grupoSeleccionado, grupos]);

    // ── Manejador de cambio de nota en la planilla ────────────────────────────
    const handleNota = useCallback((inscripcionId, campo, valor) => {
        setPlanilla(prev => ({
            ...prev,
            [inscripcionId]: {
                ...prev[inscripcionId],
                [campo]: valor,
                // Al editar manualmente, resetear el resultado del trigger
                promedio: null,
                aprobado: null,
            },
        }));
    }, []);

    // ── Guardar acta completa ─────────────────────────────────────────────────
    const handleGuardarActa = async () => {
        setSaving(true);
        setAlert(null);

        // Construir el payload de lote
        const calificaciones = Object.values(planilla).map(row => ({
            inscripcion_id: row.inscripcion_id,
            ...(row.p1 !== '' && { parcial_1:    parseFloat(row.p1) }),
            ...(row.p2 !== '' && { parcial_2:    parseFloat(row.p2) }),
            ...(row.ef !== '' && { examen_final: parseFloat(row.ef) }),
        }));

        try {
            const res = await fetch('/api/academicos/notas', {
                method:  'POST',
                headers: authHeaders(),
                body:    JSON.stringify({ calificaciones }),
            });

            const data = await res.json();

            if (res.ok) {
                // Actualizar la planilla con los resultados calculados por el trigger
                setPlanilla(prev => {
                    const updated = { ...prev };
                    (data.calificaciones ?? []).forEach(cal => {
                        const inscId = cal.inscripcion_id;
                        if (updated[inscId]) {
                            updated[inscId] = {
                                ...updated[inscId],
                                p1:       String(cal.parcial_1    ?? updated[inscId].p1),
                                p2:       String(cal.parcial_2    ?? updated[inscId].p2),
                                ef:       String(cal.examen_final ?? updated[inscId].ef),
                                promedio: cal.promedio_ponderado,
                                aprobado: cal.estado_aprobacion,
                            };
                        }
                    });
                    return updated;
                });

                setAlert({
                    type:    'success',
                    mensaje: data.mensaje ?? 'Acta guardada correctamente.',
                    detalle: 'Los promedios ponderados y estados de aprobación fueron consolidados con éxito por el sistema.',
                });
            } else {
                setAlert({
                    type:    'error',
                    mensaje: data.error   ?? 'Error al guardar el acta.',
                    detalle: data.detalle ?? null,
                });
            }
        } catch (err) {
            setAlert({
                type:    'error',
                mensaje: 'Error de red al conectar con el servidor.',
                detalle: err.message,
            });
        } finally {
            setSaving(false);
        }
    };

    // ── Grupo activo ──────────────────────────────────────────────────────────
    const grupoActivo = grupos.find(g => String(g.id) === String(grupoSeleccionado));
    const filasOrdenadas = Object.values(planilla).sort((a, b) => {
        const na = `${a.postulante?.apellidos} ${a.postulante?.nombres}`;
        const nb = `${b.postulante?.apellidos} ${b.postulante?.nombres}`;
        return na.localeCompare(nb);
    });
    const totalAlumnos  = filasOrdenadas.length;
    const conNotas      = filasOrdenadas.filter(r => r.promedio !== null).length;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">

            {/* ── Botón Volver ── */}
            {props.onNavigate && (
                <div className="max-w-screen-xl mx-auto mb-6">
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

            <div className="max-w-screen-xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
                                border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                            Planilla de Actas de Calificaciones
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Registro masivo de calificaciones por grupo y aula. Los promedios ponderados son consolidados de forma automatizada por el sistema.
                        </p>
                    </div>

                    {/* KPI mini-stats del grupo */}
                    {grupoActivo && (
                        <div className="flex gap-3 flex-wrap">
                            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Alumnos</p>
                                <p className="text-2xl font-black text-white">{totalAlumnos}</p>
                            </div>
                            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Con Notas</p>
                                <p className="text-2xl font-black text-indigo-400">{conNotas}</p>
                            </div>
                            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Paralelo</p>
                                <p className="text-xl font-black text-violet-400">{grupoActivo.nombre_paralelo}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Alerta contextual ── */}
                {alert && (
                    <div
                        role="alert"
                        className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-medium border ${
                            alert.type === 'success'
                                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-800 text-rose-300'
                        }`}
                    >
                        {alert.type === 'success' ? (
                            <svg className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div className="flex-1">
                            <p>{alert.mensaje}</p>
                            {alert.detalle && (
                                <p className="mt-1 opacity-75 text-xs">{alert.detalle}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setAlert(null)}
                            className="opacity-50 hover:opacity-100 transition-opacity text-lg leading-none shrink-0"
                            aria-label="Cerrar alerta"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── Selector de Grupo/Aula ── */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Seleccionar Grupo / Aula
                    </label>

                    {loadingGrupos ? (
                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                            <SpinnerIcon className="h-4 w-4" />
                            Cargando grupos disponibles...
                        </div>
                    ) : grupos.length === 0 ? (
                        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-950/30
                                        border border-amber-800/50 rounded-xl px-4 py-3">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            No hay grupos con inscritos. Ejecuta primero la Distribución Áulica.
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <select
                                id="select-grupo"
                                value={grupoSeleccionado}
                                onChange={e => setGrupoSeleccionado(e.target.value)}
                                className="w-full sm:w-96 px-4 py-3 rounded-xl border border-slate-700
                                           bg-slate-950 text-white focus:outline-none focus:ring-2
                                           focus:ring-indigo-500 text-sm appearance-none cursor-pointer"
                            >
                                <option value="">— Selecciona un grupo para cargar la planilla —</option>
                                {grupos.map(g => (
                                    <option key={g.id} value={g.id}>
                                        Paralelo {g.nombre_paralelo} &nbsp;·&nbsp; {g.inscripciones?.length ?? 0} inscritos
                                    </option>
                                ))}
                            </select>

                            {(localStorage.getItem('user_rol') === '2' || localStorage.getItem('user_rol') === 'Docente') && grupoSeleccionado && (
                                <div className="flex items-center gap-3">
                                    <label className="relative cursor-pointer px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500 rounded-xl text-sm font-bold transition duration-200 shadow-md flex items-center gap-2 whitespace-nowrap">
                                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Importar Acta CSV
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleCSVUpload}
                                            disabled={importing}
                                            className="hidden"
                                        />
                                    </label>
                                    {importing && (
                                        <span className="flex items-center gap-2 text-slate-400 text-xs">
                                            <SpinnerIcon className="h-4 w-4" />
                                            Importando...
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Planilla / Tabla de actas ── */}
                {grupoSeleccionado && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

                        {/* Cabecera de la planilla */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center
                                        px-6 py-4 border-b border-slate-800 gap-3">
                            <div>
                                <h3 className="font-bold text-white text-base">
                                    Acta de Calificaciones — Grupo {grupoActivo?.nombre_paralelo}
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Edita las notas en la tabla y presiona "Guardar Acta" para confirmar en la base de datos.
                                </p>
                            </div>

                            {/* Botón principal Guardar Acta */}
                            <button
                                id="btn-guardar-acta"
                                onClick={handleGuardarActa}
                                disabled={saving || filasOrdenadas.length === 0 || localStorage.getItem('user_rol') === '4' || localStorage.getItem('user_rol') === 'Autoridad' || localStorage.getItem('user_rol') === '1' || localStorage.getItem('user_rol') === 'Administrador'}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
                                           bg-gradient-to-r from-indigo-600 to-violet-600
                                           hover:from-indigo-500 hover:to-violet-500
                                           shadow-lg shadow-indigo-900/50 hover:shadow-indigo-700/60
                                           disabled:opacity-50 disabled:cursor-not-allowed
                                           transition-all duration-200 active:scale-95 whitespace-nowrap"
                            >
                                {saving ? (
                                    <>
                                        <SpinnerIcon className="h-4 w-4" />
                                        Guardando acta...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Guardar Acta de Calificaciones
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Tabla de alumnos */}
                        {filasOrdenadas.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-500 text-sm">
                                Este grupo no tiene alumnos inscritos.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950/50">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10">
                                                #
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                C.I.
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-40">
                                                Postulante
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                                Parcial 1<br /><span className="text-slate-600 normal-case font-normal">(30%)</span>
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                                Parcial 2<br /><span className="text-slate-600 normal-case font-normal">(30%)</span>
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                                                Ex. Final<br /><span className="text-slate-600 normal-case font-normal">(40%)</span>
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                                Nota Final<br /><span className="text-slate-600 normal-case font-normal">(Trigger)</span>
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filasOrdenadas.map((row, idx) => {
                                            const previewPromedio = calcularPreview(row.p1, row.p2, row.ef);
                                            const mostrarTrigger  = row.promedio !== null;

                                            return (
                                                <tr
                                                    key={row.inscripcion_id}
                                                    className="hover:bg-slate-800/30 transition-colors group"
                                                >
                                                    {/* # */}
                                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </td>

                                                    {/* C.I. */}
                                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                                        {row.postulante?.ci ?? '—'}
                                                    </td>

                                                    {/* Nombre completo */}
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-white text-xs leading-tight">
                                                            {row.postulante?.apellidos} {row.postulante?.nombres}
                                                        </p>
                                                    </td>

                                                    {/* Parcial 1 */}
                                                    <td className="px-4 py-3 text-center">
                                                        <NoteInput
                                                            value={row.p1}
                                                            onChange={e => handleNota(row.inscripcion_id, 'p1', e.target.value)}
                                                            disabled={saving}
                                                        />
                                                    </td>

                                                    {/* Parcial 2 */}
                                                    <td className="px-4 py-3 text-center">
                                                        <NoteInput
                                                            value={row.p2}
                                                            onChange={e => handleNota(row.inscripcion_id, 'p2', e.target.value)}
                                                            disabled={saving}
                                                        />
                                                    </td>

                                                    {/* Examen Final */}
                                                    <td className="px-4 py-3 text-center">
                                                        <NoteInput
                                                            value={row.ef}
                                                            onChange={e => handleNota(row.inscripcion_id, 'ef', e.target.value)}
                                                            disabled={saving}
                                                        />
                                                    </td>

                                                    {/* Nota Final: trigger (oficial) vs preview local */}
                                                    <td className="px-4 py-3 text-center">
                                                        {mostrarTrigger ? (
                                                            <span className="font-black text-indigo-400 text-sm">
                                                                {row.promedio}
                                                            </span>
                                                        ) : previewPromedio !== null ? (
                                                            <span className="font-semibold text-slate-500 text-xs"
                                                                  title="Preview local (no confirmado)">
                                                                ~{previewPromedio}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-700 text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Estado: oficial del trigger o estimado por preview >= 60 */}
                                                     <td className="px-4 py-3 text-center">
                                                         {row.aprobado !== null && row.aprobado !== undefined ? (
                                                             // Estado oficial calculado por el trigger de PostgreSQL
                                                             <BadgeEstado aprobado={row.aprobado} />
                                                         ) : previewPromedio !== null ? (
                                                             // Estado estimado localmente: umbral institucional >= 60.00
                                                             <BadgeEstado aprobado={parseFloat(previewPromedio) >= 60} />
                                                         ) : (
                                                             <span className="text-slate-600 text-xs">—</span>
                                                         )}
                                                     </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer con leyenda */}
                        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/30
                                        flex flex-wrap items-center gap-4 text-[10px] text-slate-600">
                            <span>
                                <span className="text-indigo-400 font-bold">Nota Final (oficial)</span> — consolidada
                                por el sistema tras guardar.
                            </span>
                            <span>
                                <span className="text-slate-500 font-bold">~Preview</span> — estimación local
                                antes de confirmar.
                            </span>
                            <span className="ml-auto">
                                Fórmula: <code className="text-slate-400">P1×0.30 + P2×0.30 + EF×0.40</code>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistroNotas;

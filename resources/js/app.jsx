import './bootstrap';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import RegistroPostulante from './components/RegistroPostulante';
import Login from './components/Login';
import DashboardAdmin from './components/DashboardAdmin';
import PanelReportes from './components/PanelReportes';
import RegistroNotas from './components/RegistroNotas';
import PortalPostulante from './components/PortalPostulante';

function App() {
    const [vistaActual, setVistaActual] = useState('inscripcion');

    // Mapeo bidireccional entre la vista virtual de React y la URL física del navegador
    const getVistaDesdeRuta = (path) => {
        if (path === '/login') return 'login';
        if (path === '/dashboard') return 'dashboard';
        if (path === '/admin/reportes') return 'reportes';
        if (path === '/docente/notas') return 'notas';
        if (path === '/estudiante/portal') return 'portal_estudiante';
        return 'inscripcion';
    };

    const getRutaDesdeVista = (vista) => {
        if (vista === 'login') return '/login';
        if (vista === 'dashboard') return '/dashboard';
        if (vista === 'reportes') return '/admin/reportes';
        if (vista === 'notas') return '/docente/notas';
        if (vista === 'portal_estudiante') return '/estudiante/portal';
        return '/';
    };

    // Función de navegación unificada que sincroniza el estado y el historial del navegador
    const navegarA = (nuevaVista) => {
        setVistaActual(nuevaVista);
        const nuevaRuta = getRutaDesdeVista(nuevaVista);
        if (window.location.pathname !== nuevaRuta) {
            window.history.pushState({ vista: nuevaVista }, '', nuevaRuta);
        }
    };

    // Escuchar cambios de historial (flechas Atrás/Adelante) y establecer la ruta inicial
    useEffect(() => {
        const rutaActual = window.location.pathname;
        const vistaInicial = getVistaDesdeRuta(rutaActual);
        setVistaActual(vistaInicial);
        
        // Registrar el estado inicial de la historia virtual
        window.history.replaceState({ vista: vistaInicial }, '', rutaActual);

        const handlePopState = (event) => {
            if (event.state && event.state.vista) {
                setVistaActual(event.state.vista);
            } else {
                setVistaActual(getVistaDesdeRuta(window.location.pathname));
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleLoginSuccess = () => {
        const rol = localStorage.getItem('user_rol');
        if (rol === 'Postulante' || rol === '3') {
            navegarA('portal_estudiante');
        } else {
            navegarA('dashboard');
        }
    };

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen">
            {/* Navbar superior */}
            {!(vistaActual === 'dashboard' || vistaActual === 'reportes' || vistaActual === 'notas' || vistaActual === 'portal_estudiante') && (
                <nav className="bg-slate-900 border-b border-slate-800 p-4 flex gap-4 items-center">
                    <button 
                        onClick={() => navegarA('inscripcion')} 
                        className={`px-4 py-2 rounded transition-colors ${vistaActual === 'inscripcion' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Inscripción CUP 2026
                    </button>
                    <button 
                        onClick={() => navegarA('login')} 
                        className={`px-4 py-2 rounded transition-colors ${vistaActual === 'login' || vistaActual === 'dashboard' || vistaActual === 'reportes' || vistaActual === 'notas' || vistaActual === 'portal_estudiante' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Portal Docente / Administrativo
                    </button>
                </nav>
            )}

            {/* Renderizado Condicional */}
            <div className="p-6">
                {vistaActual === 'inscripcion' && <RegistroPostulante />}
                {vistaActual === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
                {vistaActual === 'dashboard' && <DashboardAdmin onNavigate={navegarA} />}
                {vistaActual === 'reportes' && <PanelReportes onNavigate={navegarA} />}
                {vistaActual === 'notas' && <RegistroNotas onNavigate={navegarA} />}
                {vistaActual === 'portal_estudiante' && <PortalPostulante onNavigate={navegarA} />}
            </div>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<App />);
}

import React, { useState } from 'react';

const Login = (props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMsg('Autenticación correcta. Redirigiendo...');
                // Guardar token y datos del usuario en almacenamiento local
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_name', data.full_name);
                localStorage.setItem('user_rol', data.rol);

                // Invocar directamente el callback de éxito
                if (props.onLoginSuccess) {
                    props.onLoginSuccess();
                }
            } else {
                setErrorMsg(data.error || 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
            }
        } catch (error) {
            setErrorMsg('Error de conexión. No se pudo establecer comunicación con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full p-8 sm:p-10 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
                {/* Efecto de resplandor de fondo premium */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Cabecera */}
                <div className="text-center mb-8 relative z-10">
                    <span className="px-3 py-1 text-xs font-semibold text-blue-400 bg-blue-900/30 rounded-full uppercase tracking-wider">
                        Sistema CUP UAGRM
                    </span>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                        Iniciar Sesión
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm">
                        Ingresa tus credenciales del Módulo Académico
                    </p>
                </div>

                {/* Alerta de Error */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-3 animate-fade-in text-sm font-medium relative z-10">
                        <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Alerta de Éxito */}
                {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-3 animate-fade-in text-sm font-medium relative z-10">
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-400 mb-2">Correo Electrónico *</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="usuario@ficct.uagrm.edu.bo"
                                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-400 mb-2">Contraseña *</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-4 ${
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
                                Autenticando...
                            </>
                        ) : (
                            <>
                                Iniciar Sesión Seguro
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;

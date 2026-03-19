import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { showToast } from '../../pages/HostDashboard';

const SecuritySettings: React.FC = () => {
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [token, setToken] = useState('');
    const [factorId, setFactorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkMFAStatus();
    }, []);

    const checkMFAStatus = async () => {
        const { data: { factors }, error } = await supabase.auth.mfa.listFactors();
        if (error) return;
        setMfaEnabled(factors.some((f: any) => f.status === 'verified'));
    };

    const handleEnroll = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Villa & Pirata Stays',
                friendlyName: 'CEO Dashboard Key'
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
        } catch (err: any) {
            showToast("Error al iniciar 2FA: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!factorId) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: token
            });

            if (error) throw error;

            setMfaEnabled(true);
            setQrCode(null);
            showToast("¡Autenticación 2FA activada con éxito!");
        } catch (err: any) {
            showToast("Código inválido: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <section className="bg-black text-white rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Lock className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-serif font-black italic text-2xl">Seguridad CEO (2FA)</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Capa de Blindaje para los Dueños</p>
                    </div>
                </div>

                {!mfaEnabled ? (
                    <div className="space-y-6 relative z-10">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <h4 className="flex items-center gap-2 font-bold mb-2">
                                <Smartphone className="w-5 h-5 text-primary" />
                                Autenticación de Doble Factor No Activada
                            </h4>
                            <p className="text-xs text-white/70 leading-relaxed mb-6">
                                Proteja su acceso administrativo. Al activar el 2FA, se requerirá un código de su aplicación de autenticación (Google Authenticator, Authy, etc.) cada vez que inicie sesión.
                            </p>
                            
                            {!qrCode ? (
                                <button 
                                    onClick={handleEnroll}
                                    disabled={loading}
                                    className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {loading ? 'Preparando...' : 'Configurar 2FA Ahora'}
                                </button>
                            ) : (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="bg-white p-4 rounded-3xl">
                                            <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-xs font-bold text-primary italic">1. Escanee este código QR con su aplicación de autenticación.</p>
                                            <p className="text-[10px] text-white/50">O ingrese el código manualmente: <code className="bg-white/10 px-2 py-1 rounded text-white">{secret}</code></p>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">2. Ingrese el código de 6 dígitos</label>
                                                <input 
                                                    value={token} 
                                                    onChange={e => setToken(e.target.value)}
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-2xl font-serif font-black tracking-[0.5em] text-center focus:border-primary transition-all outline-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleVerify}
                                                disabled={loading || token.length < 6}
                                                className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl"
                                            >
                                                {loading ? 'Verificando...' : 'Verificar y Activar Protocolo'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 animate-scale-in relative z-10">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-xl text-green-400">Paz Mental Activada</h4>
                            <p className="text-xs text-white/70">Su cuenta está protegida con Autenticación de Doble Factor.</p>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30 italic">Protocolo de Seguridad Nivel CEO</p>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="text-orange-400 w-5 h-5" />
                    </div>
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-1">Copia de Seguridad</h5>
                        <p className="text-[10px] text-text-light leading-relaxed">Guarde su clave secreta en un lugar seguro. Si pierde su dispositivo, necesitará esta clave para recuperar su cuenta.</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center">
                        <Smartphone className="text-primary w-5 h-5" />
                    </div>
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-1">Múltiples Dispositivos</h5>
                        <p className="text-[10px] text-text-light leading-relaxed">Puede escanear el código QR con varios teléfonos si desea tener el acceso compartido con los otros dueños.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBooking } from '../contexts/BookingContext';
import { useProperty } from '../contexts/PropertyContext';
import { format, differenceInDays } from 'date-fns';
import { 
  X, 
  Wifi, 
  Navigation, 
  Car, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle, 
  Circle, 
  Info, 
  Copy,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StayDashboard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { calculateRefund } = useBooking();
    const { properties } = useProperty();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        if (!booking || (booking.status !== 'pending' && booking.status !== 'pending_payment')) return;
        if (!booking.auto_cancel_at) return;

        const timer = setInterval(() => {
            const expireTime = new Date(booking.auto_cancel_at).getTime();
            const nowTime = new Date().getTime();
            const diff = expireTime - nowTime;

            if (diff <= 0) {
                setTimeLeft("EXPIRADO");
                clearInterval(timer);
                return;
            }

            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [booking?.auto_cancel_at, booking?.status]);

    useEffect(() => {
        const loadBooking = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, property:properties(*)')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.warn('Booking not found', error);
                setBooking(null);
            } else {
                setBooking(data);
            }
            setLoading(false);
        };
        loadBooking();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-b-2 border-primary rounded-full animate-spin mb-4"></div>
            <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Preparando su Experiencia VIP</p>
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen bg-[#0a0a0a] px-4 pt-12 pb-24 text-center">
            <h1 className="text-2xl font-serif text-white mb-4">Reserva no encontrada</h1>
            <button onClick={() => navigate('/')} className="text-primary hover:underline">Regresar al inicio</button>
        </div>
    );

    const prop = booking.property;
    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    const now = new Date();
    
    const diffDays = differenceInDays(checkInDate, now);
    const isPaid = booking.status === 'Paid' || booking.status === 'confirmed';
    const isSigned = booking.contract_signed === true;
    const isCheckinDay = format(now, 'yyyy-MM-dd') === booking.check_in;
    const hoursPostCheckOut = (now.getTime() - checkOutDate.getTime()) / (1000 * 3600);
    
    // 🔒 TRIPLE LOCK GOVERNANCE: Tiered Access Chronology
    let accessLevel = 1; 
    if (diffDays <= 7) accessLevel = 2; // Bronze: Guide & Location
    if (isPaid && isSigned && (isCheckinDay || (diffDays >= 0 && diffDays <= 1))) accessLevel = 3; // Gold: Entry Code & WiFi Pass
    if (hoursPostCheckOut > 12) accessLevel = 1; // Secure Lock after stay

    const coords = accessLevel >= 2 ? (prop?.location_coords || '18.07065,-67.16544') : '18.0772,-67.1477'; 
    const lockCode = accessLevel >= 3 ? (prop?.access_code || "1234") : "BLOQUEADO";
    const wifiNetwork = prop?.wifi_name || "VillaVacacional";
    const wifiPass = accessLevel >= 3 ? (prop?.wifi_pass || "Wifivacacional") : "BLOQUEADO";

    const copyToClipboard = (text: string, label: string) => {
        if (text === "BLOQUEADO") return;
        navigator.clipboard.writeText(text);
        alert(`¡${label} copiado con éxito!`);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary selection:text-white font-sans overflow-x-hidden">
            {/* Header / Hero Section with Parallax Vibe */}
            <header className="relative h-[40vh] overflow-hidden">
                <motion.img 
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.5 }}
                    transition={{ duration: 1.5 }}
                    src={prop?.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                <div className="absolute bottom-8 left-6 right-6">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-primary font-bold tracking-[0.4em] uppercase text-[9px] mb-2 flex items-center gap-2">
                             <span className="w-2 h-2 bg-primary rounded-full animate-pulse" /> Su Refugio Privado
                        </p>
                        <h1 className="text-4xl font-serif font-black leading-tight tracking-tight">{prop?.title || 'Villa Retiro'}</h1>
                    </motion.div>
                </div>
                
                <button 
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 w-10 h-10 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
                >
                    <X size={20} className="text-white" />
                </button>
            </header>

            <main className="px-6 -mt-6 relative z-10 pb-32 space-y-8">
                
                {/* 🔒 ACCESS MODULE: The Crown Jewel */}
                <section className="bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-3xl p-8 shadow-2xl overflow-hidden relative group">
                    <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-1000" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Acceso a la Villa</h2>
                            <p className="text-lg font-serif font-bold text-white">Estado: {accessLevel === 3 ? 'Oro (Acceso Total)' : 'Progresando'}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary mb-4 border border-white/10 shadow-lg">
                            {accessLevel === 3 ? <Unlock size={24} /> : <Lock size={24} />}
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Door Code */}
                        <div className={`p-6 rounded-3xl border transition-all duration-700 ${accessLevel >= 3 ? 'bg-primary/10 border-primary/30 shadow-inner' : 'bg-white/5 border-white/5 grayscale'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Código de Entrada</p>
                                {accessLevel >= 3 && <CheckCircle size={14} className="text-green-400" />}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`font-mono tracking-[0.4em] ${accessLevel >= 3 ? 'text-4xl font-black text-white' : 'text-xl italic text-white/20'}`}>
                                    {lockCode}
                                </span>
                                {accessLevel >= 3 && (
                                    <button onClick={() => copyToClipboard(lockCode, 'Código')} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 active:scale-90">
                                        <Copy size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Stepper */}
                        <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
                            <div className="text-center">
                                <span className={`mb-1 ${isPaid ? 'text-primary' : 'text-white/20'}`}>{isPaid ? <CheckCircle size={14} /> : <Circle size={14} />}</span>
                                <p className={`text-[8px] font-bold uppercase tracking-tighter ${isPaid ? 'text-white' : 'text-white/20'}`}>Pago</p>
                            </div>
                            <div className="text-center">
                                <span className={`mb-1 ${isSigned ? 'text-primary' : 'text-white/20'}`}>{isSigned ? <CheckCircle size={14} /> : <Circle size={14} />}</span>
                                <p className={`text-[8px] font-bold uppercase tracking-tighter ${isSigned ? 'text-white' : 'text-white/20'}`}>Contrato</p>
                            </div>
                            <div className="text-center">
                                <span className={`mb-1 ${isCheckinDay ? 'text-primary' : 'text-white/20'}`}>{isCheckinDay ? <CheckCircle size={14} /> : <Circle size={14} />}</span>
                                <p className={`text-[8px] font-bold uppercase tracking-tighter ${isCheckinDay ? 'text-white' : 'text-white/20'}`}>Llegada</p>
                            </div>
                        </div>

                        {accessLevel < 3 && (
                            <div className="bg-orange-950/30 border border-orange-500/20 p-4 rounded-2xl flex gap-3 items-center">
                                <Info size={16} className="text-orange-500" />
                                <p className="text-[10px] text-orange-200/80 leading-snug">
                                    Complete el pago y firme su contrato para revelar el código {diffDays > 0 ? `el día ${booking.check_in}` : 'hoy'}.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 📶 WIFI MODULE: One-Touch Connection */}
                <section className="grid gap-4">
                    <a 
                        href={accessLevel >= 3 ? `WIFI:S:${wifiNetwork};T:WPA;P:${wifiPass};;` : '#'}
                        className={`group relative flex items-center justify-between p-8 rounded-[2.5rem] border transition-all ${accessLevel >= 3 ? 'bg-primary border-primary/20 shadow-xl shadow-primary/20' : 'bg-white/5 border-white/10 opacity-60'}`}
                    >
                        <div className="relative z-10">
                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${accessLevel >= 3 ? 'text-white/80' : 'text-white/30'}`}>Conectividad Instantánea</p>
                            <h3 className="text-xl font-bold">Unirse al WiFi</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 ${accessLevel >= 3 ? 'bg-white text-primary' : 'bg-white/5 text-white/20'}`}>
                            <Wifi size={24} />
                        </div>
                    </a>

                    {accessLevel >= 3 && (
                        <div className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-xl">
                            <div className="flex-1">
                                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5">Red</p>
                                <p className="text-sm font-bold truncate">{wifiNetwork}</p>
                            </div>
                            <div className="flex-1 border-l border-white/10 pl-4">
                                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-0.5">Clave</p>
                                <p className="text-sm font-bold truncate">{wifiPass}</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* 🗺️ LOCATION HUB: Smart Navigation */}
                <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Mapa & GPS</h2>
                        <p className="text-lg font-serif font-bold italic">Llegada sin complicaciones</p>
                    </div>

                    <div className="w-full h-48 bg-white/5 rounded-3xl overflow-hidden relative border border-white/10 group shadow-inner">
                        <iframe
                            title="Navigation Map"
                            width="100%"
                            height="100%"
                            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)' }}
                            loading="lazy"
                            src={`https://www.google.com/maps?q=${coords}&z=15&output=embed`}
                        ></iframe>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent pointer-events-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${coords}`}
                            target="_blank"
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Navigation size={16} className="text-green-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Google Maps</span>
                        </a>
                        <a 
                            href={`https://waze.com/ul?ll=${coords}&navigate=yes`}
                            target="_blank"
                            className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Car size={16} className="text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Waze</span>
                        </a>
                    </div>
                </section>

                {/* 🐆 SALTY VIP CONCIERGE: Direct AI Actions */}
                <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/5 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-serif font-black italic">Salty Concierge</h2>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Atención prioritaria para huéspedes</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => navigate('/messages', { state: { in_stay: true, property_id: booking.property_id, villa: prop?.title } })}
                                className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/50"
                            >
                                💬 Preguntar algo a Salty <ArrowRight size={14} />
                            </button>
                            <p className="text-[9px] text-center text-white/30 italic">
                                "Salty conoce cada detalle de esta propiedad, desde el A/C hasta la cafetera."
                            </p>
                        </div>
                    </div>
                </section>

                {/* Express Checkout: Only visible on departure day */}
                {isCheckinDay && (
                     <section className="pt-8 border-t border-white/5">
                        <button 
                            onClick={async () => {
                                if (confirm("¿Está listo para dejar su refugio? Notificaremos a nuestro equipo de limpieza.")) {
                                    alert("¡Buen viaje! Salty ha notificado su salida. Vuelva pronto.");
                                    navigate('/');
                                }
                            }}
                            className="w-full py-5 rounded-[1.5rem] border border-secondary/30 text-secondary font-black uppercase tracking-[0.3em] text-[10px]"
                        >
                            Check-out Express
                        </button>
                     </section>
                )}

                {/* Footer Credits */}
                <footer className="pt-12 text-center pb-8 border-t border-white/5">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.5em] mb-4">Villa & Pirata Stays Exclusive Experience</p>
                    <div className="flex justify-center gap-6 text-white/40">
                         <span className="material-icons text-sm">verified_user</span>
                         <span className="material-icons text-sm">wifi_protected_setup</span>
                         <span className="material-icons text-sm">support_agent</span>
                    </div>
                </footer>
            </main>

            {/* Cancel Modal (Keep existing logic but styled) */}
            <AnimatePresence>
                {showCancelModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center"
                    >
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-[#1a1a1a] w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-10 border-t sm:border border-white/10 shadow-2xl"
                        >
                            <h3 className="text-3xl font-serif font-black text-white mb-4">Cancelar Estancia</h3>
                            <p className="text-white/40 text-sm leading-relaxed mb-8">
                                Lamentamos que deba irse. Se procesará un reembolso según las políticas de cancelación activas para su reserva.
                            </p>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setShowCancelModal(false)}
                                    className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-widest text-[10px]"
                                >
                                    Mantener mi Reserva
                                </button>
                                <button 
                                    className="w-full py-4 text-red-400 font-bold uppercase tracking-widest text-[9px]"
                                >
                                    Confirmar Cancelación
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StayDashboard;

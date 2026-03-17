import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBooking } from '../contexts/BookingContext';
import { useProperty } from '../contexts/PropertyContext';
import { format } from 'date-fns';

const StayDashboard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { calculateRefund } = useBooking();
    const { properties, villaKnowledge } = useProperty();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const loadBooking = async () => {
            // Mockup o fetch de base de datos
            const { data, error } = await supabase
                .from('bookings')
                .select('*, property:properties(title, location, address, location_coords, wifi_name, wifi_pass, access_code, lockbox_image_url, is_cleaning_in_progress)')
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

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando su portal de estadía...</div>;

    if (!booking) return (
        <div className="min-h-screen bg-sand px-4 pt-12 pb-24 font-sans text-center">
            <h1 className="text-2xl font-bold mb-4">Reserva no encontrada</h1>
            <button onClick={() => navigate('/')} className="text-primary hover:underline">Regresar al inicio</button>
        </div>
    );

    const prop = booking.property;
    
    // 🔒 SECURITY GOVERNANCE: Tiered Access Chronology
    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    const now = new Date();
    
    const diffDays = (checkInDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    const diffHours = (checkInDate.getTime() - now.getTime()) / (1000 * 3600);
    const hoursPostCheckOut = (now.getTime() - checkOutDate.getTime()) / (1000 * 3600);
    
    const isPaid = booking.status === 'Paid' || booking.status === 'confirmed';
    
    let accessLevel = 1; // Level 1: Immediate/Confirmed
    if (diffDays <= 7) accessLevel = 2; // Level 2: Guide
    if (diffHours <= 24 && isPaid) accessLevel = 3; // Level 3: Total Access
    if (hoursPostCheckOut > 12) accessLevel = 1; // Security Lock
    
    const lockCode = accessLevel >= 3 ? (prop?.access_code || "0000") : "REVELADO_24H_ANTES";
    const lockImage = accessLevel >= 3 ? (prop?.lockbox_image_url || "/assets/lockboxes/retiro.jpg") : null;
    const wifiNetwork = accessLevel >= 2 ? (prop?.wifi_name || "VillaRetiro_Guest") : "RESERVADO";
    const wifiPass = accessLevel >= 3 ? (prop?.wifi_pass || "Guest2024!") : "REVELADO_24H_ANTES";
    const coords = accessLevel >= 3 ? (prop?.location_coords || '18.07065,-67.16544') : '18.0772,-67.1477'; // General area if not level 3

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`¡Copiado: ${text}!`);
    };

    return (
        <div className="min-h-screen bg-sand px-4 pt-12 pb-24 animate-fade-in font-sans">
            <header className="mb-8">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-primary mb-4 block"><span className="material-icons text-sm">arrow_back</span> Regresar al Inicio</button>
                <h1 className="text-3xl font-serif font-bold text-text-main mb-2">Su Estadía en {booking?.property?.title || 'Villa Retiro'}</h1>
                <p className="text-sm text-text-light uppercase tracking-widest font-bold">Reserva #{booking?.id}</p>
            </header>

            <div className="space-y-6">
                {/* Status Badge */}
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                            <span className="material-icons">check_circle</span>
                        </div>
                        <div>
                            <p className="font-bold text-sm text-primary uppercase tracking-wider">Pago Confirmado</p>
                            <p className="text-xs text-text-light">Del {booking?.check_in} al {booking?.check_out}</p>
                        </div>
                    </div>
                </div>

                {/* Arrival & Entry */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-icons text-primary">vpn_key</span> Acceso Seguro (Lockbox)
                    </h2>
                    <div className="bg-sand/30 p-4 rounded-xl border border-gray-100 space-y-4">
                        <div className="flex gap-4 items-center">
                            {lockImage && (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                    <img src={lockImage} alt="Lockbox Reference" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1558235338-23212852179b?w=200&h=200&fit=crop' }} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Código Caja de Llaves</p>
                                <p className={`font-black text-slate-800 tracking-[0.2em] font-mono select-all ${accessLevel < 3 ? 'text-sm opacity-50 italic' : 'text-2xl'}`}>
                                    {lockCode}
                                </p>
                            </div>
                        </div>
                        {accessLevel < 3 && !isPaid && (
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-2">
                                <span className="material-icons text-orange-400 text-sm">lock</span>
                                <p className="text-[9px] font-bold text-orange-800 uppercase tracking-tighter">Pendiente de Pago Completo para revelar códigos.</p>
                            </div>
                        )}
                        <p className="text-[10px] text-red-400 italic font-bold">
                            {accessLevel < 3 ? `*Disponible 24h antes del check-in (${booking.check_in})` : `*Válido hasta 12h después del check-out`}
                        </p>
                    </div>
                </section>

                {/* Salty Stay Context - ACCIÓN PRIORITARIA */}
                <section className="bg-gradient-to-br from-primary/10 to-secondary/10 p-6 rounded-[2rem] border border-primary/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h2 className="font-serif font-bold text-lg text-text-main mb-1 flex items-center gap-2">
                                <span className="material-icons text-primary">auto_awesome</span> Asistente Salty (VIP)
                            </h2>
                            <p className="text-[10px] text-text-light leading-relaxed">
                                Pregunta sobre el uso del A/C, la piscina o reglas de la casa. Salty te dará prioridad.
                            </p>
                        </div>
                        <button 
                            onClick={() => navigate('/messages', { state: { in_stay: true, property_id: booking.property_id, villa: booking.property?.title } })}
                            className="bg-primary text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all whitespace-nowrap"
                        >
                            💬 Preguntar a Salty sobre la Villa
                        </button>
                    </div>
                </section>

                {/* Services & Wi-Fi */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-icons text-blue-500">wifi</span> Conectividad
                    </h2>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Red Wi-Fi</p>
                            <p className="text-sm font-bold text-text-main">{wifiNetwork}</p>
                            <p className={`text-xs font-mono text-gray-500 mt-1 ${accessLevel < 3 ? 'italic opacity-50' : ''}`}>
                                Pass: {wifiPass}
                            </p>
                        </div>
                        {accessLevel >= 3 && (
                            <button onClick={() => copyToClipboard(wifiPass)} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-blue-50 active:scale-95 transition-all">
                                <span className="material-icons text-[14px]">content_copy</span> Copiar Clave
                            </button>
                        )}
                    </div>
                </section>

                {/* GPS Map Dinámico */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-icons text-green-500">pin_drop</span> Ubicación Exacta
                    </h2>
                    <p className="text-xs text-text-light mb-4">Ubicada en {booking.property?.location || 'Cabo Rojo'}, muy cerca de los mejores puntos VIP del suroeste.</p>
                    {(() => {
                        const address = booking.property?.address || 'Cabo Rojo, PR';
                        
                        return (
                            <div className="w-full h-48 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100 shadow-inner group">
                                <iframe
                                    title="Google Maps"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    src={`https://www.google.com/maps?q=${coords}&z=15&output=embed`}
                                >
                                </iframe>
                                <div className="absolute bottom-3 right-3">
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${coords}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-white/90 backdrop-blur-md text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-all shadow-primary/10"
                                    >
                                        <span className="material-icons text-[12px]">navigation</span> Iniciar GPS
                                    </a>
                                </div>
                            </div>
                        );
                    })()}
                </section>

                {/* Contrato & Check-out */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="material-icons text-gray-500">description</span> Gestión de Estancia
                    </h2>
                    <p className="text-xs text-text-light mb-4 text-justify">Sus documentos y gestiones de salida están centralizados aquí.</p>
                    <div className="space-y-3">
                        {/* Check-out Express (Priority Visibility) */}
                        {new Date().toISOString().split('T')[0] === booking.check_out && (
                            <button 
                                onClick={async () => {
                                    if (confirm("¿Está listo para dejar la propiedad? Esto notificará a nuestro equipo de limpieza.")) {
                                        const { NotificationService } = await import('../services/NotificationService');
                                        await NotificationService.sendTelegramAlert(
                                            `🔔 <b>Check-out Express Realizado</b>\n\n` +
                                            `🏠 <b>Villa:</b> ${booking.property?.title}\n` +
                                            `👤 <b>Huésped:</b> ${booking.customer_name || 'Huésped del Portal'}\n\n` +
                                            `🧼 <i>La propiedad está lista para limpieza. El huésped acaba de salir.</i>`
                                        );
                                        alert("¡Buen viaje! Hemos notificado a nuestro equipo de su salida.");
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 p-4 bg-secondary text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 active:scale-95 transition-transform"
                            >
                                <span className="material-icons">logout</span> Check-out Express
                            </button>
                        )}

                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-gray-900/5 text-gray-900 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform">
                            <span className="material-icons text-sm">download</span> Cargar Contrato Firmado
                        </button>
                        
                        {booking.status !== 'cancelled' && (
                            <button 
                                onClick={() => setShowCancelModal(true)}
                                className="w-full p-2 text-red-300 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors"
                            >
                                Cancelar mi Estancia
                            </button>
                        )}
                    </div>
                </section>
            </div>

            {/* CANCELLATION MODAL */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-slide-up">
                        <div className="bg-red-50 p-8 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm mx-auto mb-4">
                                <span className="material-icons text-3xl">warning</span>
                            </div>
                            <h3 className="text-xl font-serif font-bold text-red-900">Confirmar Cancelación</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-1">Impacto de Reembolso</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {(() => {
                                const prop = properties.find(p => p.id === booking.property_id);
                                if (!prop) return <p>Calculando impacto...</p>;
                                const calculation = calculateRefund(booking, prop, { isCleaningInProgress: prop.is_cleaning_in_progress });
                                return (
                                    <>
                                        <div className="bg-sand/30 p-8 rounded-[2.5rem] border border-orange-100/50 flex flex-col items-center justify-center text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Monto a reembolsar</p>
                                            <p className="text-4xl font-serif font-black text-text-main">${calculation.refundAmount}</p>
                                            <p className="text-[10px] text-text-light mt-2">A su método de pago original</p>
                                        </div>
                                        
                                        <p className="text-[10px] text-text-light leading-relaxed italic text-center">
                                            "{calculation.explanation}"
                                        </p>
                                        
                                        <div className="space-y-3">
                                            <button 
                                                disabled={isCancelling}
                                                onClick={async () => {
                                                    setIsCancelling(true);
                                                    const { error } = await supabase
                                                        .from('bookings')
                                                        .update({ 
                                                            status: 'cancelled',
                                                            cancelled_at: new Date().toISOString(),
                                                            refund_amount_calculated: calculation.refundAmount,
                                                            retained_amount_calculated: calculation.retainedAmount,
                                                            cancellation_snapshot: calculation
                                                        })
                                                        .eq('id', id);
                                                    
                                                    if (!error) {
                                                        alert("Su reserva ha sido cancelada. El reembolso se procesará según los tiempos de su banco.");
                                                        navigate('/');
                                                    } else {
                                                        alert("Error al cancelar: " + error.message);
                                                        setIsCancelling(false);
                                                    }
                                                }}
                                                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isCancelling ? 'Procesando...' : 'Confirmar y Cancelar'}
                                            </button>
                                            <button 
                                                onClick={() => setShowCancelModal(false)}
                                                className="w-full py-2 text-[10px] font-bold text-text-light uppercase tracking-widest"
                                            >
                                                Mantener mi Reserva
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StayDashboard;

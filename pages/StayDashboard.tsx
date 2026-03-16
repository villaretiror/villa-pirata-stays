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
                .select('*, property:properties(title, location, address)')
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

    const isPirata = booking.property?.title?.toLowerCase().includes('pirata') || booking.property_id?.toString() === '42839458' || booking.property_id?.toString() === '2';
    const lockCode = isPirata ? "2197" : "0895";
    const lockImage = isPirata ? "/assets/lockboxes/pirata.jpg" : "/assets/lockboxes/retiro.jpg";
    const wifiNetwork = "Wifivacacional";
    const wifiPass = "Wifivacacional";

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
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                <img src={lockImage} alt="Lockbox Reference" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1558235338-23212852179b?w=200&h=200&fit=crop' }} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Código Caja de Llaves</p>
                                <p className="text-2xl font-black text-slate-800 tracking-[0.2em] font-mono select-all">{lockCode}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-red-400 italic font-bold">*El código se activa a las {villaKnowledge?.policies.checkIn}</p>
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
                            <p className="text-xs font-mono text-gray-500 mt-1">Pass: {wifiPass}</p>
                        </div>
                        <button onClick={() => copyToClipboard(wifiPass)} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-blue-50 active:scale-95 transition-all">
                            <span className="material-icons text-[14px]">content_copy</span> Copiar Clave
                        </button>
                    </div>
                </section>

                {/* GPS Map */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-icons text-green-500">pin_drop</span> Ubicación Exacta
                    </h2>
                    <p className="text-xs text-text-light mb-4">Ubicada en Cabo Rojo, muy cerca de puntos VIP: Playa Buyé, Poblado de Boquerón y Faro Los Morrillos.</p>
                    <div className="w-full h-48 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <iframe
                                title="Google Maps"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight={0}
                                marginWidth={0}
                                src={`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=Poblado%20de%20Boqueron,%20Cabo%20Rojo,%20Puerto%20Rico&t=&z=14&ie=UTF8&iwloc=B&output=embed`}>
                            </iframe>
                        </div>
                    </div>
                </section>

                {/* Contrato de Alquiler */}
                <section className="bg-white p-6 rounded-[2rem] shadow-card border border-gray-100">
                    <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="material-icons text-gray-500">description</span> Documentos
                    </h2>
                    <p className="text-xs text-text-light mb-4 text-justify">Su Contrato Digital de Alquiler firmado al momento del pago está guardado de forma segura.</p>
                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md active:scale-95 transition-transform">
                            <span className="material-icons">download</span> Cargar PDF Firmado
                        </button>
                        
                        {booking.status !== 'cancelled' && (
                            <button 
                                onClick={() => setShowCancelModal(true)}
                                className="w-full p-3 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors"
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
                                const calculation = calculateRefund(booking, prop);
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

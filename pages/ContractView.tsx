import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Shield, MapPin, Users, Info, ArrowLeft } from 'lucide-react';

const ContractView = () => {
    const [searchParams] = useSearchParams();
    const propertyId = searchParams.get('id') || '1081171030449673920';
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProperty() {
            setLoading(true);
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', propertyId)
                .single();

            if (!error && data) {
                setProperty(data);
            }
            setLoading(false);
        }
        fetchProperty();
    }, [propertyId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FCFBF7]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6633]"></div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFBF7] p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Propiedad no encontrada</h1>
                <Link to="/" className="text-[#FF6633] flex items-center gap-2">
                    <ArrowLeft size={20} /> Volver al Inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCFBF7] text-[#1A1A1A] font-sans">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6633] mb-8 transition-colors">
                    <ArrowLeft size={18} /> Volver
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 rounded-3xl p-8 md:p-12 shadow-sm"
                >
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1.5 bg-orange-50 text-[#FF6633] rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                            Contrato Digital
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black mb-4">
                            CONTRATO DE ALQUILER VACACIONAL
                        </h1>
                        <p className="text-xl text-gray-400 font-medium">{property.title}</p>
                    </div>

                    <div className="space-y-12 leading-relaxed">
                        <section>
                            <h2 className="flex items-center gap-3 text-lg font-bold mb-4">
                                <Users className="text-[#FF6633]" size={20} />
                                1. IDENTIFICACIÓN Y CAPACIDAD
                            </h2>
                            <div className="pl-8 space-y-2 text-gray-600">
                                <p><strong>Propiedad:</strong> {property.title}</p>
                                <p><strong>Ubicación:</strong> Cabo Rojo, Puerto Rico.</p>
                                <p><strong>Ocupación Máxima:</strong> El alojamiento está limitado estrictamente a <strong>{property.guests} personas</strong>. El exceso de personas no autorizadas resultará en la cancelación de la reserva sin reembolso.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-lg font-bold mb-4">
                                <Info className="text-[#FF6633]" size={20} />
                                2. DESGLOSE DE CARGOS ADICIONALES
                            </h2>
                            <div className="pl-8 space-y-2 text-gray-600">
                                <p><strong>Tarifa de Limpieza:</strong> Se aplicará un cargo único de <strong>${property.cleaning_fee}</strong>.</p>
                                <p><strong>Cargo por Servicio:</strong> Se aplicará un cargo de <strong>${property.service_fee || 20}</strong>.</p>
                                <p className="text-sm italic">Estos cargos son obligatorios y se procesan al momento de confirmar la reserva.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-lg font-bold mb-4">
                                <Shield className="text-[#FF6633]" size={20} />
                                3. DEPÓSITO DE SEGURIDAD
                            </h2>
                            <div className="pl-8 space-y-4 text-gray-600">
                                <p>Se requiere un depósito de seguridad de <strong>${property.security_deposit}</strong>.</p>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <p className="font-bold text-sm mb-2 uppercase tracking-wide">Política de Reembolso:</p>
                                    <p className="text-sm">Este monto se retendrá y será devuelto íntegramente en un periodo de 48 a 72 horas después del check-out, siempre que no se identifiquen daños en la propiedad, multas por ruido o violaciones a las reglas de la casa establecidas en este contrato.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-lg font-bold mb-4">
                                <MapPin className="text-[#FF6633]" size={20} />
                                4. REGLAS DE ORO Y CONVIVENCIA
                            </h2>
                            <div className="pl-8 space-y-4 text-gray-600">
                                <p><strong>Política de Cancelación:</strong> {property.policies?.cancellation || 'Cancelación flexible según términos de plataforma.'}</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm italic">
                                    <li><strong>Ruidos:</strong> Horas de silencio obligatorias de 10:00 PM a 8:00 AM. Puerto Rico tiene leyes estrictas de ruidos innecesarios; cualquier multa será responsabilidad del huésped.</li>
                                    <li><strong>Fumar/Fiestas:</strong> Queda terminantemente prohibido fumar dentro de la villa y realizar eventos o fiestas de cualquier tipo.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="pt-8 border-t border-gray-100">
                            <div className="bg-orange-600 text-white p-8 rounded-3xl text-center shadow-xl shadow-orange-200">
                                <h3 className="text-xl font-bold mb-4">5. ACEPTACIÓN DIGITAL</h3>
                                <p className="text-sm opacity-90 leading-relaxed">
                                    Al proceder con el pago de esta reserva, el Huésped declara que ha leído, entendido y aceptado los términos aquí expuestos para la propiedad <strong>{property.title}</strong>.
                                </p>
                            </div>
                        </section>
                    </div>

                    <div className="mt-12 text-center text-[10px] text-gray-300 uppercase tracking-widest font-bold">
                        Villa Retiro R LLC • Cabo Rojo, PR • {new Date().getFullYear()}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ContractView;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TermsOfService: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [policies, setPolicies] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const propertyId = id || '1081171030449673920'; // Default to Villa Retiro R

    useEffect(() => {
        const fetchPolicies = async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('title, policies, house_rules')
                .eq('id', propertyId)
                .single();

            if (!error && data) {
                setPolicies(data);
            }
            setLoading(true);
            // Artificial elite delay for cinematic loading if needed, but here we want speed
            setLoading(false);
        };
        fetchPolicies();
    }, [propertyId]);

    const PageLoader = () => (
        <div className="min-h-screen bg-sand flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 font-serif italic text-primary/60">Cargando soberanía legal...</p>
        </div>
    );

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-sand pt-32 pb-20 px-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 p-8 md:p-16 rounded-[2rem] shadow-2xl"
            >
                <div className="flex flex-col items-center mb-12 text-center">
                    <span className="font-serif italic font-black text-4xl text-primary mb-4">VRR</span>
                    <h1 className="font-serif font-black text-4xl text-secondary tracking-tighter">Términos de Servicio</h1>
                    <p className="text-xs uppercase font-bold tracking-[0.3em] text-primary mt-2 opacity-60 italic">
                        {policies?.title || 'Villa Retiro Exclusive'} · Rev. {new Date().getFullYear()}
                    </p>
                </div>

                <div className="space-y-10 prose prose-slate max-w-none text-secondary/80 font-medium leading-relaxed">
                    {/* 🔱 DYNAMIC POLICIES FETCHED FROM DASHBOARD */}
                    {policies?.policies?.terms ? (
                        <div dangerouslySetInnerHTML={{ __html: policies.policies.terms }} className="dynamic-content" />
                    ) : (
                        <>
                            <section>
                                <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                                    <span className="w-8 h-[2px] bg-primary mr-4"></span>
                                    1. Acuerdo de Hospedaje
                                </h2>
                                <p>
                                    Al reservar en {policies?.title || 'nuestras villas'}, usted acepta cumplir con las reglas de la casa y políticas de seguridad dictadas por el anfitrión.
                                </p>
                            </section>

                            <section>
                                <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                                    <span className="w-8 h-[2px] bg-primary mr-4"></span>
                                    2. Reglas de la Casa (Dashbord Sync)
                                </h2>
                                <ul className="list-disc pl-10 space-y-2">
                                    {(policies?.house_rules || []).map((rule: string, i: number) => (
                                        <li key={i}>{rule}</li>
                                    ))}
                                    {(!policies?.house_rules || policies.house_rules.length === 0) && (
                                        <li>Se aplican las normas estándar de convivencia y respeto mutuo.</li>
                                    )}
                                </ul>
                            </section>
                            
                            <section>
                                <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                                    <span className="w-8 h-[2px] bg-primary mr-4"></span>
                                    3. Política de Cancelación
                                </h2>
                                <p>
                                    {policies?.policies?.cancellationPolicy || 'La política de cancelación es estricta. Consulte su confirmación de reserva para detalles específicos.'}
                                </p>
                            </section>
                        </>
                    )}
                    
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 mt-10">
                        <p className="text-[10px] uppercase font-black tracking-widest text-primary/60 mb-2">Nota del Capitán:</p>
                        <p className="text-xs italic text-secondary/70">
                            "Este documento es dinámico y refleja la soberanía operativa de {policies?.title || 'Villa Retiro R'}. Al confirmar su pago, usted acepta la versión vigente de estas políticas."
                        </p>
                    </div>
                </div>

                <div className="mt-20 pt-12 border-t border-secondary/10 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-secondary/40">
                        Villa Retiro LLC © {new Date().getFullYear()} · Cabo Rojo, Puerto Rico
                    </p>
                    <p className="text-[8px] text-secondary/20 mt-2">ID Propietario: {propertyId}</p>
                </div>
            </motion.div>
        </div>
    );
};

export default TermsOfService;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PrivacyPolicy: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [policies, setPolicies] = useState<any>(null);
    const propertyId = id || '1081171030449673920'; // Default to Villa Retiro R

    useEffect(() => {
        const fetchPolicies = async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('title, policies, description')
                .eq('id', propertyId)
                .single();

            if (!error && data) {
                setPolicies(data);
            }
        };
        fetchPolicies();
    }, [propertyId]);

    return (
        <div className="min-h-screen bg-sand pt-32 pb-20 px-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 p-8 md:p-16 rounded-[2rem] shadow-2xl"
            >
                <div className="flex flex-col items-center mb-12 text-center">
                    <span className="font-serif italic font-black text-4xl text-primary mb-4">VRR</span>
                    <h1 className="font-serif font-black text-4xl text-secondary tracking-tighter">Política de Privacidad</h1>
                    <p className="text-xs uppercase font-bold tracking-[0.3em] text-primary mt-2 opacity-60 italic">{policies?.title || 'Villa Retiro Exclusive'} · Rev. {new Date().getFullYear()}</p>
                </div>

                <div className="space-y-10 prose prose-slate max-w-none text-secondary/80 font-medium leading-relaxed">
                    <section>
                        <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                            <span className="w-8 h-[2px] bg-primary mr-4"></span>
                            1. Tratamiento de Datos
                        </h2>
                        <p>
                            Al interactuar con {policies?.title || 'nuestras villas'} a través de esta plataforma o mediante Salty Concierge, sus datos personales son manejados exclusivamente con fines de gestión de hospitalidad. No vendemos ni compartimos su información con terceros para fines publicitarios.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                            <span className="w-8 h-[2px] bg-primary mr-4"></span>
                            2. Protección Digital y Stripe
                        </h2>
                        <p>
                            Como marca boutique, priorizamos el cifrado de nivel bancario. Los pagos son gestionados íntegramente por Stripe Inc., por lo que nuestra base de datos nunca almacena datos sensibles de sus tarjetas.
                        </p>
                    </section>

                    {policies?.policies?.privacy && (
                        <div dangerouslySetInnerHTML={{ __html: policies.policies.privacy }} />
                    )}

                    <section>
                        <h2 className="font-serif font-black text-2xl text-secondary mb-4 tracking-tight flex items-center">
                            <span className="w-8 h-[2px] bg-primary mr-4"></span>
                            3. Finalidad de la Información
                        </h2>
                        <p>
                            Utilizamos su información para:
                            <ul className="list-disc pl-6 space-y-2 mt-4 font-bold opacity-80">
                                <li>Validar disponibilidad en tiempo real.</li>
                                <li>Generar su comprobante de pago seguro.</li>
                                <li>Permitir que Salty Concierge actúe como su asistente local personalizado.</li>
                                <li>Comunicar instrucciones de acceso de forma cifrada (Smart Lock).</li>
                            </ul>
                        </p>
                    </section>
                </div>

                <div className="mt-20 pt-12 border-t border-secondary/10 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-secondary/40">
                        Villa Retiro LLC © {new Date().getFullYear()} · Cabo Rojo, Puerto Rico
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default PrivacyPolicy;

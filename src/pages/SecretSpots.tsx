import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SmartImage from '../components/SmartImage';

import { useProperty } from '../contexts/PropertyContext';

const SecretSpots: React.FC = () => {
    const navigate = useNavigate();
    const { secretSpots } = useProperty();

    const SECRETS = secretSpots.length > 0 ? secretSpots : [
        {
            title: "Cargando Spots...",
            desc: "Salty está buscando sus lugares favoritos en la base de datos...",
            image: "https://images.unsplash.com/photo-1544148103-0773bf10d32b?auto=format&fit=crop&q=80&w=800",
            tip: "Un momento por favor."
        }
    ];

    useEffect(() => {
        document.title = "Salty's Secret Spots | Cabo Rojo";
        const meta = document.createElement('meta');
        meta.name = "robots";
        meta.content = "noindex, nofollow";
        document.head.appendChild(meta);
        return () => {
            document.head.removeChild(meta);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-20">
            {/* Hero Section */}
            <div className="relative h-[40vh] bg-black flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-60">
                    <SmartImage
                        src="https://images.unsplash.com/photo-1506466010722-395ee2bef877?auto=format&fit=crop&q=80&w=1200"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#FDFCFB] via-transparent to-black/20"></div>

                <div className="relative z-10 text-center px-6">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/30 mb-4"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Regalo Exclusivo de Salty</span>
                    </motion.div>
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-serif font-black text-text-main"
                    >
                        Spots Secretos de <span className="text-secondary italic">Cabo Rojo</span>
                    </motion.h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
                <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-black/5 space-y-16">
                    <div className="text-center space-y-4">
                        <p className="text-lg text-text-light italic leading-relaxed">
                            "Hola, soy Salty. He volado por todo Cabo Rojo y estos son los lugares donde realmente dejo que mi alma descanse. Guárdalos para ti, hablemos de esto como un secreto entre amigos."
                        </p>
                        <div className="w-12 h-1 bg-primary/20 mx-auto rounded-full"></div>
                    </div>

                    <div className="space-y-24">
                        {SECRETS.map((spot, i) => (
                            <motion.section
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-10 items-center`}
                            >
                                <div className="w-full md:w-1/2 aspect-square rounded-[2.5rem] overflow-hidden shadow-xl">
                                    <SmartImage src={spot.image} className="w-full h-full object-cover" />
                                </div>
                                <div className="w-full md:w-1/2 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-sand flex items-center justify-center font-serif font-black text-primary border border-primary/10">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-2xl font-serif font-bold text-text-main">{spot.title}</h3>
                                    </div>
                                    <p className="text-text-light leading-relaxed">{spot.desc}</p>
                                    <div className="bg-sand/30 p-4 rounded-2xl border border-orange-100 flex gap-3">
                                        <span className="material-icons text-primary text-sm">lightbulb</span>
                                        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wider leading-tight">
                                            TIP DE SALTY: <span className="text-text-main normal-case">{spot.tip}</span>
                                        </p>
                                    </div>
                                </div>
                            </motion.section>
                        ))}
                    </div>

                    <div className="pt-12 border-t border-dashed border-gray-100 text-center">
                        <h4 className="text-xl font-serif font-bold mb-4">¿Listo para la aventura?</h4>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl"
                        >
                            Volver a mi Reserva
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecretSpots;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Property, Review } from '../types';
import SmartImage from '../components/SmartImage';

const HostProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [host, setHost] = useState<any>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHostData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // 1. Fetch Host Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (profile) setHost(profile);

                // 2. Fetch Host Properties
                const { data: props } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('host_id', id);

                if (props) setProperties(props as any[]);
            } catch (err) {
                console.error("Error fetching host profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHostData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-sand flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="font-serif italic text-text-light">Cargando perfil del anfitrión...</p>
            </div>
        );
    }

    if (!host) {
        return (
            <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-serif font-bold mb-4">Anfitrión no encontrado</h1>
                <button onClick={() => navigate('/')} className="bg-black text-white px-8 py-3 rounded-full font-bold">Volver al inicio</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sand pb-32">
            {/* Header Premium */}
            <div className="relative h-80 bg-black overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000"
                    className="w-full h-full object-cover opacity-60"
                    alt="Luxury background"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sand via-transparent to-black/20"></div>

                <div className="absolute top-12 left-6 right-6 flex justify-between items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 glass rounded-full flex items-center justify-center text-white"
                    >
                        <span className="material-icons">arrow_back</span>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Info */}
                    <div className="md:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 shadow-card border border-white text-center"
                        >
                            <div className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-sand overflow-hidden shadow-xl">
                                <SmartImage src={host.avatar_url || ''} className="w-full h-full object-cover" />
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-text-main mb-2">{host.full_name}</h1>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <span className="material-icons text-primary text-sm">verified</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Identidad Verificada</span>
                            </div>

                            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-text-main">{properties.length}</p>
                                    <p className="text-[9px] font-black uppercase text-gray-400">Villas</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-text-main">5.0</p>
                                    <p className="text-[9px] font-black uppercase text-gray-400">Rating</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-[2.5rem] p-8 shadow-card border border-white"
                        >
                            <h3 className="font-serif font-bold text-lg mb-4 text-text-main">Sobre mí</h3>
                            <p className="text-sm text-text-light leading-relaxed italic">
                                {host.bio || "Apasionado por brindar experiencias únicas en la costa de Cabo Rojo. Miembro de la familia Villa & Pirata Stays."}
                            </p>
                        </motion.div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-text-main mb-6">Alojamientos de {host.full_name.split(' ')[0]}</h2>
                            <div className="grid grid-cols-1 gap-6">
                                {properties.map((prop, idx) => (
                                    <motion.div
                                        key={prop.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => navigate(`/property/${prop.id}`)}
                                        className="bg-white rounded-[2rem] overflow-hidden shadow-card border border-white flex flex-col sm:flex-row cursor-pointer hover:scale-[1.01] transition-all"
                                    >
                                        <div className="w-full sm:w-48 h-48 bg-gray-100">
                                            <SmartImage src={prop.images?.[0] || ''} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="text-lg font-bold text-text-main">{prop.title}</h3>
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-icons text-primary text-sm">star</span>
                                                        <span className="text-xs font-bold">{prop.rating}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-text-light line-clamp-2 mb-4">{prop.description}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-black text-secondary-light font-serif">${prop.price} <small className="text-[10px] font-medium text-gray-400 font-sans uppercase">/ noche</small></span>
                                                <div className="flex gap-3 text-text-light scale-90">
                                                    <div className="flex items-center gap-1"><span className="material-icons text-base">bed</span><span className="text-[10px] font-bold">{prop.bedrooms}</span></div>
                                                    <div className="flex items-center gap-1"><span className="material-icons text-base">bathtub</span><span className="text-[10px] font-bold">{prop.baths}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostProfile;

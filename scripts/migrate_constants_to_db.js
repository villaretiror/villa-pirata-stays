import { createClient } from '@supabase/supabase-js';
import { PROPERTIES, INITIAL_LOCAL_GUIDE } from './constants.js';
import { VILLA_KNOWLEDGE } from './constants/villa_knowledge.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 🕵️ SECRETS from SecretSpots.tsx
const SECRETS = [
    {
        title: "Cueva del Pirata (Punta Guaniquilla)",
        desc: "No vayas al mediodía. Camina el sendero de Punta Guaniquilla a las 4:30 PM. Encontrarás cuevas con fósiles marinos y una vista del atardecer que parece de otro planeta. Es mi lugar favorito para meditar con el sonido del mar.",
        image: "https://images.unsplash.com/photo-1544148103-0773bf10d32b?auto=format&fit=crop&q=80&w=800",
        tip: "Lleva calzado cerrado, el terreno es de roca kárstica (filosa)."
    },
    {
        title: "El Muelle Espejo de Joyuda",
        desc: "Joyuda es famoso por el marisco, pero pocos saben que detrás de los restaurantes hay pequeños muelles de madera. Ve después de que baje el sol; el agua se convierte en un espejo perfecto que refleja el cielo rosado del oeste.",
        image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=800",
        tip: "Pide el 'Mofongo relleno de carrucho' en cualquier chinchorro local."
    },
    {
        title: "Torre de Observación de Boquerón",
        desc: "Dentro del Bosque Estatal de Boquerón hay una torre de observación de aves. Si subes temprano, verás la neblina sobre los manglares y toda la bahía de Boquerón sin un solo turista a la vista.",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800",
        tip: "Lleva binoculares y mucho repelente."
    },
    {
        title: "Playa Tortuga (El Rincón Escondido)",
        desc: "Cerca de la concurrida Playa Combate, hay un pequeño recodo llamado Playa Tortuga. Es cristalina, baja y usualmente está vacía. Es donde las tortugas realmente vienen a saludar si guardas silencio.",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
        tip: "Lleva tu propia sombra, no hay árboles cerca del agua."
    },
    {
        title: "Los Acantilados del Faro",
        desc: "No te quedes solo en el Faro. Camina por el borde de los acantilados de piedra caliza roja hacia el este. La brisa del Caribe aquí tiene una energía diferente. Es el punto más al suroeste de la isla.",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800",
        tip: "Mantente alejado del borde, el viento puede ser muy fuerte."
    }
];

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""
);

async function migrate() {
  console.log("🚀 Iniciando Migración de Constantes a Supabase...");

  // 1. Migrar Propiedades
  for (const p of PROPERTIES) {
    const { error } = await supabase.from('properties').upsert({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      location: p.location,
      address: p.address,
      description: p.description,
      price: p.price,
      cleaning_fee: p.cleaning_fee,
      service_fee: p.service_fee,
      security_deposit: p.security_deposit,
      fees: p.fees,
      policies: p.policies,
      calendarSync: p.calendarSync,
      rating: p.rating,
      reviews_count: p.reviews_count,
      images: p.images,
      amenities: p.amenities,
      featuredAmenity: p.featuredAmenity,
      category: p.category,
      guests: p.guests,
      bedrooms: p.bedrooms,
      beds: p.beds,
      baths: p.baths,
      host: p.host
    }, { onConflict: 'id' });

    if (error) console.error(`❌ Error migrando propiedad ${p.id}:`, error);
    else console.log(`✅ Propiedad ${p.title} sincronizada.`);
  }

  // 2. Migrar System Settings
  const settings = [
    { key: 'local_guide_data', value: INITIAL_LOCAL_GUIDE },
    { key: 'villa_knowledge', value: VILLA_KNOWLEDGE },
    { key: 'secret_spots', value: SECRETS }
  ];

  for (const s of settings) {
    const { error } = await supabase.from('system_settings').upsert({
      key: s.key,
      value: s.value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) console.error(`❌ Error migrando setting ${s.key}:`, error);
    else console.log(`✅ Setting ${s.key} sincronizado.`);
  }

  console.log("🏁 Migración completada.");
}

migrate();


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Note: Using relative paths that work with tsx execution from root
import { PROPERTIES, INITIAL_LOCAL_GUIDE } from '../src/constants/index';
import { VILLA_KNOWLEDGE } from '../src/constants/villa_knowledge';
import { SECRETS_DATA } from '../src/constants/secrets_data';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("🔱 SALTY: Iniciando Operación Bunker (Migración de Conocimiento)...");

  if (!supabaseKey) {
      console.error("❌ ERROR: Falta SERVICE_ROLE_KEY. No puedo realizar escrituras maestras.");
      return;
  }

  // 1. MIGRAR PROPIEDADES (Mapping total al esquema de DB)
  console.log("\n🏠 Sincronizando Propiedades...");
  for (const p of PROPERTIES) {
    const dbPayload = {
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      location: p.location,
      address: p.address,
      description: p.description,
      price: p.price,
      cleaning_fee: p.cleaning_fee,
      service_fee: p.service_fee,
      security_deposit: p.security_deposit || 0,
      fees: p.fees,
      policies: p.policies,
      calendarSync: p.calendarSync,
      rating: p.rating,
      reviews_count: p.reviews_count,
      images: p.images,
      amenities: p.amenities,
      featuredamenity: (p as any).featuredAmenity || (p as any).featuredamenity || null,
      category: p.category,
      guests: p.guests,
      bedrooms: p.bedrooms,
      beds: p.beds,
      baths: p.baths,
      host: p.host,
      // Metadata extraída de policies si existe
      wifi_name: (p.policies as any)?.wifiName || null,
      wifi_pass: (p.policies as any)?.wifiPass || null,
      access_code: (p.policies as any)?.accessCode || null,
      cancellation_policy_type: (p.policies as any)?.cancellationPolicy || 'firm',
      house_rules: (p.policies as any)?.houseRules || [],
      min_price_floor: (p as any).min_price_floor || 150,
      max_discount_allowed: (p as any).max_discount_allowed || 15,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('properties').upsert(dbPayload, { onConflict: 'id' });

    if (error) console.error(`   ❌ Error en ${p.title}:`, error.message);
    else console.log(`   ✅ ${p.title} blindada en DB.`);
  }

  // 2. MIGRAR SYSTEM SETTINGS (Cerebro Centralizado)
  console.log("\n🧠 Sincronizando Córtex (System Settings)...");
  const settings = [
    { key: 'local_guide_data', value: INITIAL_LOCAL_GUIDE },
    { key: 'villa_knowledge', value: VILLA_KNOWLEDGE },
    { key: 'secret_spots', value: SECRETS_DATA },
    { key: 'salty_personality_config', value: {
        tone: 'Sophisticated Caribbean',
        emoji_limit: 1,
        active_engine: 'gemini-2.0-flash-exp'
    }}
  ];

  for (const s of settings) {
    const { error } = await supabase.from('system_settings').upsert({
      key: s.key,
      value: s.value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) console.error(`   ❌ Error en ${s.key}:`, error.message);
    else console.log(`   ✅ Conocimiento '${s.key}' centralizado.`);
  }

  console.log("\n🏁 OPERACIÓN BUNKER COMPLETADA: Salty ahora es dinámico.");
}

migrate();

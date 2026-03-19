import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testInsert() {
    const toInsert = [{
        property_id: '1081171030449673920',
        status: 'external_block',
        check_in: '2026-03-20',
        check_out: '2026-03-22',
        source: 'Airbnb',
        guests_count: 1,
        total_price: 0
    }];

    console.log("Attempting to insert:", toInsert);
    const { data, error } = await supabase.from('bookings').insert(toInsert).select();
    
    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("INSERT SUCCESS:", data);
        
        // Clean up
        await supabase.from('bookings').delete().eq('id', data[0].id);
    }
}

testInsert().catch(console.error);

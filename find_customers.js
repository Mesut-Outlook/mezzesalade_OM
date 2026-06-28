import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findCustomers() {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*');

        if (error) {
            console.error('Error fetching customers:', error);
            process.exit(1);
        }

        const targetPhone = '0634316902';
        const cleanTarget = targetPhone.replace(/\D/g, '');

        const matches = data.filter(c => {
            const custPhone = (c.phone || '').replace(/\D/g, '');
            if (!custPhone) return false;
            // Check for flexible match (last 9 digits usually enough for mobile)
            return custPhone.endsWith(cleanTarget.slice(-9)) || cleanTarget.endsWith(custPhone.slice(-9));
        });

        console.log(JSON.stringify(matches, null, 2));
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

findCustomers();

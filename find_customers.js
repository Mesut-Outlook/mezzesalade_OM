import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvcpjupsxuwfxnyfuyzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Y3BqdXBzeHV3ZnhueWZ1eXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTQ3MzYsImV4cCI6MjA4MTgzMDczNn0.91o5vVzfMjb8dt6wbMGmj2VjrUeKC5K4x0ciamtRng8';

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

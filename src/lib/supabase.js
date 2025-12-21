import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hvcpjupsxuwfxnyfuyzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Y3BqdXBzeHV3ZnhueWZ1eXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTQ3MzYsImV4cCI6MjA4MTgzMDczNn0.91o5vVzfMjb8dt6wbMGmj2VjrUeKC5K4x0ciamtRng8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==================== CUSTOMERS ====================

export async function fetchCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
    return data || [];
}

export async function addCustomer(customer) {
    const { data, error } = await supabase
        .from('customers')
        .insert([{
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
            address: customer.address || null,
            notes: customer.notes || null
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding customer:', error);
        return null;
    }
    return data;
}

export async function updateCustomer(id, updates) {
    const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating customer:', error);
        return null;
    }
    return data;
}

export async function deleteCustomer(id) {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting customer:', error);
        return false;
    }
    return true;
}

// ==================== ORDERS ====================

export async function fetchOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (*)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    // Transform data to match existing format
    return (data || []).map(order => ({
        id: order.id,
        customerId: order.customer_id,
        date: order.date,
        status: order.status,
        notes: order.notes,
        total: parseFloat(order.total) || 0,
        createdAt: order.created_at,
        items: (order.order_items || []).map(item => ({
            productId: item.product_id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            variation: item.variation,
            category: item.category
        }))
    }));
}

export async function addOrder(order) {
    // First, insert the order
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
            customer_id: order.customerId,
            date: order.date,
            status: order.status || 'new',
            notes: order.notes || null,
            total: order.total || 0
        }])
        .select()
        .single();

    if (orderError) {
        console.error('Error adding order:', orderError);
        return null;
    }

    // Then, insert order items
    if (order.items && order.items.length > 0) {
        const orderItems = order.items.map(item => ({
            order_id: orderData.id,
            product_id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variation: item.variation || null,
            category: item.category || null
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('Error adding order items:', itemsError);
        }
    }

    return {
        ...order,
        id: orderData.id,
        createdAt: orderData.created_at
    };
}

export async function updateOrder(id, updates) {
    const updateData = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.total !== undefined) updateData.total = updates.total;

    const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating order:', error);
        return null;
    }
    return data;
}

export async function deleteOrder(id) {
    // Order items will be deleted automatically via CASCADE
    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting order:', error);
        return false;
    }
    return true;
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export function subscribeToOrders(callback) {
    const subscription = supabase
        .channel('orders-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('Order change:', payload);
                callback();
            }
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'order_items' },
            (payload) => {
                console.log('Order item change:', payload);
                callback();
            }
        )
        .subscribe();

    return () => subscription.unsubscribe();
}

export function subscribeToCustomers(callback) {
    const subscription = supabase
        .channel('customers-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'customers' },
            (payload) => {
                console.log('Customer change:', payload);
                callback();
            }
        )
        .subscribe();

    return () => subscription.unsubscribe();
}

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

// Public function to find customer by phone
export async function fetchCustomerByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    const { data, error } = await supabase
        .from('customers')
        .select('*');

    if (error || !data) return null;

    // Filter in JS for flexible matching
    return data.find(c => {
        const custPhone = (c.phone || '').replace(/\D/g, '');
        return custPhone.endsWith(cleanPhone.slice(-9)) || cleanPhone.endsWith(custPhone.slice(-9));
    });
}

// Public function to fetch specific customer orders
export async function fetchOrdersByCustomerId(customerId) {
    const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_id', customerId)
        .order('date', { ascending: false });

    if (error) return [];

    return data.map(order => ({
        id: order.id,
        date: order.date,
        status: order.status,
        total: parseFloat(order.total) || 0,
        shipping: parseFloat(order.shipping) || 0,
        notes: order.notes,
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
        shipping: parseFloat(order.shipping) || 0,
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
    console.log('📝 Creating order:', order);

    const dataToInsert = {
        customer_id: order.customerId,
        date: order.date,
        status: order.status || 'new',
        notes: order.notes || null,
        shipping: parseFloat(order.shipping) || 0,
        total: parseFloat(order.total) || 0
    };

    console.log('📤 Data being sent to Supabase:', dataToInsert);

    // First, insert the order
    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([dataToInsert])
        .select()
        .single();

    if (orderError) {
        console.error('❌ Error adding order:', orderError);
        console.error('Error details:', {
            message: orderError.message,
            details: orderError.details,
            hint: orderError.hint,
            code: orderError.code
        });
        alert(`Sipariş kaydedilemedi: ${orderError.message}\n${orderError.hint || ''}`);
        return null;
    }

    console.log('✅ Order created:', orderData);

    // Then, insert order items
    if (order.items && order.items.length > 0) {
        // Filter out items with invalid product IDs (must be valid UUID or integer from Supabase)
        const validItems = order.items.filter(item => {
            // Check if productId exists and is valid
            if (!item.productId) {
                console.warn('⚠️ Skipping item without productId:', item.name);
                return false;
            }

            // Check if it's a valid UUID format (for Supabase products)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);

            // Check if it's a valid integer (for legacy products)
            const isInteger = Number.isInteger(item.productId) || /^\d+$/.test(String(item.productId));

            if (!isUUID && !isInteger) {
                console.warn('⚠️ Skipping item with invalid productId:', item.name, item.productId);
                return false;
            }

            return true;
        });

        if (validItems.length === 0) {
            console.warn('⚠️ No valid items to insert');
            alert('Hiçbir geçerli ürün bulunamadı. Lütfen ürünlerin veritabanında tanımlı olduğundan emin olun.');
            return null;
        }

        const orderItems = validItems.map(item => ({
            order_id: orderData.id,
            product_id: item.productId,
            name: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            variation: item.variation || null,
            category: item.category || null
        }));

        console.log('📦 Adding order items:', orderItems);
        if (validItems.length < order.items.length) {
            console.warn(`⚠️ ${order.items.length - validItems.length} item(s) were skipped due to invalid product IDs`);
        }

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('❌ Error adding order items:', itemsError);
            alert(`Ürünler kaydedilemedi: ${itemsError.message}`);
            // Don't return null here, order is already created
        } else {
            console.log('✅ Order items added successfully');
            if (validItems.length < order.items.length) {
                alert(`Sipariş oluşturuldu! Not: ${order.items.length - validItems.length} ürün veritabanında bulunamadığı için eklenmedi.`);
            }
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
    if (updates.shipping !== undefined) updateData.shipping = updates.shipping;
    if (updates.total !== undefined) updateData.total = updates.total;
    if (updates.customerId !== undefined) updateData.customer_id = updates.customerId;

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

    // If items are provided, replace them
    if (updates.items) {
        // Delete existing items
        await supabase
            .from('order_items')
            .delete()
            .eq('order_id', id);

        // Insert new items
        const orderItems = updates.items.map(item => ({
            order_id: id,
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
            console.error('Error updating order items:', itemsError);
        }
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

// ==================== PRODUCTS ====================

export async function fetchProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    // Transform to match local format
    return (data || []).map(p => ({
        ...p,
        variationPrices: p.variation_prices || {}
    }));
}

export async function addProduct(product) {
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: product.name,
            price: parseFloat(product.price),
            category: product.category,
            description: product.description || null,
            image: product.image || null,
            ingredients: product.ingredients || null,
            variations: product.variations || [],
            variation_prices: product.variationPrices || {},
            is_active: true
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding product:', error);
        return null;
    }
    return { ...data, variationPrices: data.variation_prices };
}

export async function updateProduct(id, updates) {
    const transformedUpdates = { ...updates };
    if (updates.variationPrices) {
        transformedUpdates.variation_prices = updates.variationPrices;
        delete transformedUpdates.variationPrices;
    }

    const { data, error } = await supabase
        .from('products')
        .update(transformedUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating product:', error);
        return null;
    }
    return { ...data, variationPrices: data.variation_prices };
}

export async function deactivateProduct(id) {
    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        console.error('Error deactivating product:', error);
        return false;
    }
    return true;
}

export async function migrateProducts(products) {
    const transformed = products.map(p => ({
        name: p.name,
        price: parseFloat(p.price),
        category: p.category,
        description: p.description || null,
        image: p.image || null,
        variations: p.variations || [],
        variation_prices: p.variationPrices || p.variation_prices || {},
        is_active: true
    }));

    const { data, error } = await supabase
        .from('products')
        .insert(transformed)
        .select();

    if (error) {
        console.error('Error migrating products:', error);
        return null;
    }
    return data;
}

export async function uploadProductImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
    }

    const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export function subscribeToProducts(callback) {
    const subscription = supabase
        .channel('products-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Product change:', payload);
                callback();
            }
        )
        .subscribe();

    return () => subscription.unsubscribe();
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

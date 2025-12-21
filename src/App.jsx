import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import {
    fetchCustomers,
    fetchOrders,
    addCustomer as addCustomerDb,
    updateCustomer as updateCustomerDb,
    deleteCustomer as deleteCustomerDb,
    addOrder as addOrderDb,
    updateOrder as updateOrderDb,
    deleteOrder as deleteOrderDb,
    subscribeToOrders,
    subscribeToCustomers
} from './lib/supabase';
import TopNav from './components/Layout/TopNav';
import CalendarDashboard from './components/Dashboard/CalendarDashboard';
import OrderForm from './components/Orders/OrderForm';
import OrderList from './components/Orders/OrderList';
import OrderDetail from './components/Orders/OrderDetail';
import DailySummary from './components/Orders/DailySummary';
import CustomerList from './components/Customers/CustomerList';
import TextParser from './components/AI/TextParser';
import ProductCatalog from './components/Products/ProductCatalog';

function AppContent() {
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Load data from Supabase
    const loadData = useCallback(async () => {
        setSyncing(true);
        try {
            const [ordersData, customersData] = await Promise.all([
                fetchOrders(),
                fetchCustomers()
            ]);
            setOrders(ordersData);
            setCustomers(customersData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, []);

    // Initial load and real-time subscriptions
    useEffect(() => {
        loadData();

        // Subscribe to real-time changes
        const unsubOrders = subscribeToOrders(loadData);
        const unsubCustomers = subscribeToCustomers(loadData);

        return () => {
            unsubOrders();
            unsubCustomers();
        };
    }, [loadData]);

    // Add a new order
    const addOrder = async (order) => {
        setSyncing(true);
        const newOrder = await addOrderDb(order);
        if (newOrder) {
            // Immediately update local state
            setOrders(prev => [{ ...order, id: newOrder.id, createdAt: newOrder.createdAt }, ...prev]);
        }
        setSyncing(false);
        return newOrder;
    };

    // Update an order
    const updateOrder = async (orderId, updates) => {
        setSyncing(true);
        await updateOrderDb(orderId, updates);
        // Optimistically update local state
        setOrders(prev => prev.map(order =>
            order.id === orderId ? { ...order, ...updates } : order
        ));
        setSyncing(false);
    };

    // Delete an order
    const deleteOrder = async (orderId) => {
        setSyncing(true);
        await deleteOrderDb(orderId);
        setOrders(prev => prev.filter(order => order.id !== orderId));
        setSyncing(false);
    };

    // Add a new customer
    const addCustomer = async (customer) => {
        setSyncing(true);
        const newCustomer = await addCustomerDb(customer);
        if (newCustomer) {
            setCustomers(prev => [newCustomer, ...prev]);
        }
        setSyncing(false);
        return newCustomer;
    };

    // Update a customer
    const updateCustomer = async (customerId, updates) => {
        setSyncing(true);
        await updateCustomerDb(customerId, updates);
        setCustomers(prev => prev.map(customer =>
            customer.id === customerId ? { ...customer, ...updates } : customer
        ));
        setSyncing(false);
    };

    // Delete a customer
    const deleteCustomer = async (customerId) => {
        setSyncing(true);
        await deleteCustomerDb(customerId);
        setCustomers(prev => prev.filter(customer => customer.id !== customerId));
        setSyncing(false);
    };

    // Get customer by ID
    const getCustomer = (customerId) => {
        return customers.find(c => c.id === customerId);
    };

    // Get order by ID
    const getOrder = (orderId) => {
        return orders.find(o => o.id === orderId);
    };

    if (loading) {
        return (
            <div className="app">
                <div className="loading" style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    <div className="spinner" />
                    <p className="text-muted">Veriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Sync indicator */}
            {syncing && (
                <div style={{
                    position: 'fixed',
                    top: 10,
                    right: 10,
                    background: 'var(--accent-warning)',
                    color: 'black',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                }}>
                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    Senkronize...
                </div>
            )}

            <TopNav />

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Navigate to="/calendar" replace />} />
                    <Route
                        path="/calendar"
                        element={
                            <CalendarDashboard
                                orders={orders}
                                customers={customers}
                            />
                        }
                    />
                    <Route
                        path="/new-order"
                        element={
                            <OrderForm
                                customers={customers}
                                addCustomer={addCustomer}
                                addOrder={addOrder}
                            />
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <OrderList
                                orders={orders}
                                customers={customers}
                                getCustomer={getCustomer}
                            />
                        }
                    />
                    <Route
                        path="/order/:id"
                        element={
                            <OrderDetail
                                orders={orders}
                                customers={customers}
                                getOrder={getOrder}
                                getCustomer={getCustomer}
                                updateOrder={updateOrder}
                                deleteOrder={deleteOrder}
                            />
                        }
                    />
                    <Route
                        path="/daily-summary"
                        element={
                            <DailySummary
                                orders={orders}
                            />
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <CustomerList
                                customers={customers}
                                orders={orders}
                                addCustomer={addCustomer}
                                updateCustomer={updateCustomer}
                                deleteCustomer={deleteCustomer}
                            />
                        }
                    />
                    <Route
                        path="/ai-parser"
                        element={
                            <TextParser
                                customers={customers}
                                addCustomer={addCustomer}
                                addOrder={addOrder}
                            />
                        }
                    />
                    <Route
                        path="/products"
                        element={<ProductCatalog />}
                    />
                </Routes>
            </main>

        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;

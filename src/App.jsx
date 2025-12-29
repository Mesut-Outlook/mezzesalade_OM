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
    fetchProducts,
    addProduct as addProductDb,
    updateProduct as updateProductDb,
    deactivateProduct as deactivateProductDb,
    subscribeToOrders,
    subscribeToCustomers,
    subscribeToProducts
} from './lib/supabase';
import TopNav from './components/Layout/TopNav';
import CalendarDashboard from './components/Dashboard/CalendarDashboard';
import RevenueReport from './components/Dashboard/RevenueReport';
import OrderForm from './components/Orders/OrderForm';
import OrderList from './components/Orders/OrderList';
import AllOrders from './components/Orders/AllOrders';
import OrderDetail from './components/Orders/OrderDetail';
import DailySummary from './components/Orders/DailySummary';
import CustomerList from './components/Customers/CustomerList';
import TextParser from './components/AI/TextParser';
import ProductCatalog from './components/Products/ProductCatalog';
import HomeDashboard from './components/Dashboard/HomeDashboard';
import LoginPage from './components/Auth/LoginPage';
import CustomerOrderView from './components/Customer/CustomerOrderView';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Public route check
    const isPublicRoute = location.pathname.startsWith('/siparis');

    // Load data from Supabase
    const loadData = useCallback(async () => {
        // Even for public route we need products
        setSyncing(true);
        try {
            const [ordersData, customersData, productsData] = await Promise.all([
                isAuthenticated ? fetchOrders() : Promise.resolve([]),
                isAuthenticated ? fetchCustomers() : Promise.resolve([]),
                fetchProducts()
            ]);
            setOrders(ordersData);
            setCustomers(customersData);
            setProducts(productsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, [isAuthenticated]);

    // Initial load and real-time subscriptions
    useEffect(() => {
        loadData();

        if (!isAuthenticated) return;

        // Subscribe to real-time changes
        const unsubOrders = subscribeToOrders(loadData);
        const unsubCustomers = subscribeToCustomers(loadData);
        const unsubProducts = subscribeToProducts(loadData);

        return () => {
            unsubOrders();
            unsubCustomers();
            unsubProducts();
        };
    }, [loadData, isAuthenticated]);

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
        const result = await updateOrderDb(orderId, updates);
        // Optimistically update local state
        setOrders(prev => prev.map(order =>
            order.id === orderId ? { ...order, ...updates, ...result } : order
        ));
        setSyncing(false);
        return result;
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

    // Add a new product
    const addProduct = async (product) => {
        setSyncing(true);
        const newProduct = await addProductDb(product);
        if (newProduct) {
            setProducts(prev => [newProduct, ...prev]);
        }
        setSyncing(false);
        return newProduct;
    };

    // Update a product
    const updateProduct = async (productId, updates) => {
        setSyncing(true);
        const result = await updateProductDb(productId, updates);
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, ...updates, ...result } : p
        ));
        setSyncing(false);
        return result;
    };

    // Deactivate a product
    const deactivateProduct = async (productId) => {
        setSyncing(true);
        const success = await deactivateProductDb(productId);
        if (success) {
            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, is_active: false } : p
            ));
        }
        setSyncing(false);
        return success;
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

    // Special handling for Customer Order Page (Public)
    if (isPublicRoute) {
        return (
            <Routes>
                <Route
                    path="/siparis"
                    element={
                        <CustomerOrderView
                            products={products}
                            addOrder={addOrderDb}
                            addCustomer={addCustomerDb}
                            updateOrder={updateOrder}
                        />
                    }
                />
            </Routes>
        );
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="*" element={<LoginPage />} />
            </Routes>
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

            {location.pathname !== '/' && <TopNav />}

            <main className="main-content">
                <Routes>
                    <Route
                        path="/"
                        element={
                            <HomeDashboard
                                orders={orders}
                                customers={customers}
                                products={products}
                                getCustomer={getCustomer}
                            />
                        }
                    />
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
                        path="/revenue"
                        element={
                            <RevenueReport
                                orders={orders}
                                customers={customers}
                                getCustomer={getCustomer}
                            />
                        }
                    />
                    <Route
                        path="/new-order"
                        element={
                            <OrderForm
                                customers={customers}
                                products={products}
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
                        path="/all-orders"
                        element={
                            <AllOrders
                                orders={orders}
                                customers={customers}
                                getCustomer={getCustomer}
                            />
                        }
                    />
                    <Route
                        path="/edit-order/:id"
                        element={
                            <OrderForm
                                customers={customers}
                                products={products}
                                orders={orders}
                                addCustomer={addCustomer}
                                addOrder={addOrder}
                                updateOrder={updateOrder}
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
                                products={products}
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
                                products={products}
                                addCustomer={addCustomer}
                                addOrder={addOrder}
                            />
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProductCatalog
                                products={products}
                                addProduct={addProduct}
                                updateProduct={updateProduct}
                                deactivateProduct={deactivateProduct}
                            />
                        }
                    />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;


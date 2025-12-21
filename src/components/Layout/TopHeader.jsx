import { Link, useLocation } from 'react-router-dom';

export default function TopHeader() {
    const location = useLocation();

    // Get page title based on current path
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/calendar' || path === '/') return null; // Home, no subtitle
        if (path === '/new-order') return 'Yeni Sipariş';
        if (path === '/orders') return 'Siparişler';
        if (path.startsWith('/order/')) return 'Sipariş Detay';
        if (path === '/daily-summary') return 'Günlük Özet';
        if (path === '/customers') return 'Müşteriler';
        if (path === '/ai-parser') return 'AI Ayrıştırıcı';
        if (path === '/products') return 'Ürün Kataloğu';
        return null;
    };

    const pageTitle = getPageTitle();
    const isHome = location.pathname === '/calendar' || location.pathname === '/';

    return (
        <header className="top-header">
            <div className="top-header-content">
                {/* Back button on sub-pages */}
                {!isHome && (
                    <Link to="/calendar" className="back-button">
                        ←
                    </Link>
                )}

                {/* Logo */}
                <Link to="/calendar" className="logo">
                    <span className="logo-icon">🍽️</span>
                    <span className="logo-text">Mezzesalade</span>
                </Link>

                {/* Page title on sub-pages */}
                {pageTitle && (
                    <span className="page-title">{pageTitle}</span>
                )}
            </div>
        </header>
    );
}

import { NavLink, Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const mainNavItems = [
    { path: '/admin', icon: '🏠', label: 'Ana Sayfa' },
    { path: '/admin/calendar', icon: '📅', label: 'Takvim' },
    { path: '/admin/new-order', icon: '📝', label: 'Sipariş' },
    { path: '/admin/ai-parser', icon: '🤖', label: 'AI' },
];

const otherNavItems = [
    { path: '/admin/customers', icon: '👥', label: 'Müşteriler' },
    { path: '/admin/products', icon: '📦', label: 'Ürünler' },
    { path: '/admin/daily-summary', icon: '📊', label: 'Özet' },
];

export default function TopNav() {
    const location = useLocation();
    const { logout } = useAuth();
    const [showOtherMenu, setShowOtherMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowOtherMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check if any "other" item is active
    const isOtherActive = otherNavItems.some(item => location.pathname === item.path);

    return (
        <header className="top-nav-header">
            {/* Logo */}
            <Link to="/admin" className="logo">
                <img src="/images/logo.png" alt="Mezzesalade" className="logo-image" />
            </Link>

            {/* Navigation Items - Icons Only with Tooltips */}
            <nav className="top-nav-items">
                {mainNavItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-icon-btn ${isActive ? 'active' : ''}`}
                        title={item.label}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-tooltip">{item.label}</span>
                    </NavLink>
                ))}

                {/* Diğer Dropdown */}
                <div className="nav-dropdown" ref={menuRef}>
                    <button
                        className={`nav-icon-btn ${isOtherActive ? 'active' : ''}`}
                        onClick={() => setShowOtherMenu(!showOtherMenu)}
                        title="Diğer"
                    >
                        <span className="nav-icon">📋</span>
                        <span className="nav-tooltip">Diğer</span>
                    </button>

                    {showOtherMenu && (
                        <div className="dropdown-menu">
                            {otherNavItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setShowOtherMenu(false)}
                                >
                                    <span className="icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
                {/* Logout Button */}
                <button
                    className="nav-icon-btn logout-btn"
                    onClick={logout}
                    title="Çıkış Yap"
                >
                    <span className="nav-icon">🚪</span>
                    <span className="nav-tooltip">Çıkış</span>
                </button>
            </nav>
        </header>
    );
}

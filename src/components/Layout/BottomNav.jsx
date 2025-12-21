import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

const mainNavItems = [
    { path: '/calendar', icon: '📅', label: 'Takvim' },
    { path: '/new-order', icon: '📝', label: 'Sipariş' },
    { path: '/ai-parser', icon: '🤖', label: 'AI' },
];

const otherNavItems = [
    { path: '/customers', icon: '👥', label: 'Müşteriler' },
    { path: '/products', icon: '📦', label: 'Ürünler' },
    { path: '/daily-summary', icon: '📊', label: 'Özet' },
];

export default function BottomNav({ currentPath }) {
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
    const isOtherActive = otherNavItems.some(item => currentPath === item.path);

    return (
        <nav className="top-nav">
            {mainNavItems.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="icon">{item.icon}</span>
                    <span>{item.label}</span>
                </NavLink>
            ))}
            
            {/* Diğer Dropdown */}
            <div className="nav-dropdown" ref={menuRef}>
                <button 
                    className={`nav-item ${isOtherActive ? 'active' : ''}`}
                    onClick={() => setShowOtherMenu(!showOtherMenu)}
                >
                    <span className="icon">📋</span>
                    <span>Diğer</span>
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
        </nav>
    );
}

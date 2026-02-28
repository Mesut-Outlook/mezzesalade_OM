import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublicOrders } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../hooks/useLocalStorage';
import './CustomerOrder.css';

export default function JoinOrderSelection() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSummaries() {
            const data = await fetchPublicOrders();
            setSummaries(data);
            setLoading(false);
        }
        loadSummaries();
    }, []);

    const handleJoinDate = (dateSummary) => {
        // Convert map of items to array for the order view
        const items = Object.values(dateSummary.items);
        navigate('/ozel-siparis', {
            state: {
                preselectedDate: dateSummary.date,
                restrictedItems: items,
                isJoining: true
            }
        });
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="join-selection-page">
            <header className="header">
                <button className="btn btn-icon" onClick={() => navigate('/')}>
                    ←
                </button>
                <h1>{t('available_days_title')}</h1>
                <div style={{ width: 40 }} />
            </header>

            <main className="container pt-md">
                {summaries.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">🗓️</div>
                        <p>{t('no_available_days')}</p>
                        <button
                            className="btn btn-primary mt-md"
                            onClick={() => navigate('/ozel-siparis')}
                        >
                            {t('create_new_title')}
                        </button>
                    </div>
                ) : (
                    <div className="summaries-grid">
                        {summaries.map((summary) => (
                            <div
                                key={summary.date}
                                className="summary-card card"
                                onClick={() => handleJoinDate(summary)}
                            >
                                <div className="summary-header">
                                    <h3>📅 {formatDate(summary.date)}</h3>
                                    <div className="badge badge-success">{t('status_new')}</div>
                                </div>

                                <div className="summary-items mt-md">
                                    {Object.values(summary.items).map((item, idx) => (
                                        <div key={idx} className="summary-item-line">
                                            <span>{item.name} {item.variation && <small>({item.variation})</small>}</span>
                                            <span className="price">{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
                                </div>

                                <button className="btn btn-primary btn-block mt-lg">
                                    {t('join_btn')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                .join-selection-page {
                    min-height: 100vh;
                    background: var(--bg-tertiary);
                    padding-bottom: var(--spacing-xl);
                }
                .summaries-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--spacing-md);
                }
                .summary-card {
                    cursor: pointer;
                    transition: transform 0.2s;
                    border: 1px solid var(--border-color);
                }
                .summary-card:hover {
                    transform: scale(1.02);
                    border-color: var(--accent-primary);
                }
                .summary-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: var(--spacing-sm);
                }
                .summary-item-line {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9rem;
                    padding: 4px 0;
                    border-bottom: 1px dashed var(--border-color);
                }
                .summary-item-line:last-child {
                    border-bottom: none;
                }
                .summary-item-line small {
                    color: var(--text-muted);
                }
                .summary-item-line .price {
                    font-weight: bold;
                }
            `}} />
        </div>
    );
}

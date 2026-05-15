import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useMemo } from 'react';
import './CustomerOrder.css';

export default function CustomerLanding() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const randomBgUrl = useMemo(() => {
        const query = "salad,mezze,food";
        return `https://loremflickr.com/1920/1080/${query}?random=${Math.floor(Math.random() * 1000)}`;
    }, []);

    return (
        <div className="landing-page" style={{ backgroundImage: `url(${randomBgUrl})` }}>
            <div className="landing-overlay"></div>
            <div className="landing-container" style={{ position: 'relative', zIndex: 10 }}>
                <header className="landing-header">
                    <div className="landing-logo">
                        <img src="/images/logo.png" alt="Mezzesalade" style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
                    </div>
                    <h1 style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{t('welcome_title')}</h1>
                    <p style={{ color: '#f0f0f0', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{t('welcome_subtitle')}</p>
                </header>

                <div className="landing-options">
                    <div
                        className="landing-card create-card"
                        onClick={() => navigate('/ozel-siparis')}
                    >
                        <div className="card-icon">📝</div>
                        <h2>{t('create_new_title')}</h2>
                        <p>{t('create_new_desc')}</p>
                        <div className="card-action">
                            <span>{t('create_new_action')} →</span>
                        </div>
                    </div>

                    <div
                        className="landing-card join-card"
                        onClick={() => navigate('/toplu-siparis')}
                    >
                        <div className="card-icon">👥</div>
                        <h2>{t('join_existing_title')}</h2>
                        <p>{t('join_existing_desc')}</p>
                        <div className="card-action">
                            <span>{t('see_all')} →</span>
                        </div>
                    </div>
                </div>

                <footer className="landing-footer">
                    <p>Mezzesalade © {new Date().getFullYear()}</p>
                </footer>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .landing-page {
                    min-height: 100vh;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--spacing-lg);
                    position: relative;
                }
                .landing-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    z-index: 1;
                }
                .landing-container {
                    max-width: 900px;
                    width: 100%;
                    text-align: center;
                }
                .landing-header {
                    margin-bottom: var(--spacing-lg);
                }
                .landing-logo {
                    font-size: 4rem;
                    margin-bottom: var(--spacing-sm);
                }
                .landing-header h1 {
                    font-size: 1.75rem;
                    margin-bottom: var(--spacing-xs);
                    color: #ffffff;
                }
                .landing-header p {
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.85);
                }
                .landing-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                }
                .landing-card {
                    background: rgba(255, 255, 255, 0.12);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                .landing-card:hover {
                    transform: translateY(-6px);
                    background: rgba(255, 255, 255, 0.18);
                    border-color: var(--accent-primary);
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
                }
                .card-icon {
                    font-size: 2.25rem;
                    margin-bottom: var(--spacing-sm);
                }
                .landing-card h2 {
                    margin-bottom: var(--spacing-xs);
                    color: #ffffff;
                    font-size: 1.1rem;
                }
                .landing-card p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: var(--spacing-md);
                    flex: 1;
                    font-size: 0.875rem;
                }
                .card-action {
                    font-weight: bold;
                    color: var(--accent-primary);
                }
                .landing-footer {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }
                @media (max-width: 768px) {
                    .landing-options {
                        grid-template-columns: 1fr;
                    }
                    .landing-header h1 {
                        font-size: 1.5rem;
                    }
                    .landing-card {
                        padding: var(--spacing-md);
                    }
                    .card-icon {
                        font-size: 2rem;
                    }
                }
            `}} />
        </div>
    );
}

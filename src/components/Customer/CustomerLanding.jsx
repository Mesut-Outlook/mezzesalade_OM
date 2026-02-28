import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './CustomerOrder.css';

export default function CustomerLanding() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <div className="landing-page">
            <div className="landing-container">
                <header className="landing-header">
                    <div className="landing-logo">🥗</div>
                    <h1>{t('welcome_title')}</h1>
                    <p>{t('welcome_subtitle')}</p>
                </header>

                <div className="landing-options">
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

                    <div
                        className="landing-card create-card"
                        onClick={() => navigate('/ozel-siparis')}
                    >
                        <div className="card-icon">📝</div>
                        <h2>{t('create_new_title')}</h2>
                        <p>{t('create_new_desc')}</p>
                        <div className="card-action">
                            <span>{t('confirm_order')} →</span>
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
                    background: var(--bg-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--spacing-lg);
                }
                .landing-container {
                    max-width: 900px;
                    width: 100%;
                    text-align: center;
                }
                .landing-header {
                    margin-bottom: var(--spacing-xl);
                }
                .landing-logo {
                    font-size: 4rem;
                    margin-bottom: var(--spacing-md);
                }
                .landing-header h1 {
                    font-size: 2.5rem;
                    margin-bottom: var(--spacing-sm);
                    color: var(--text-primary);
                }
                .landing-header p {
                    font-size: 1.25rem;
                    color: var(--text-muted);
                }
                .landing-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                }
                .landing-card {
                    background: var(--card-bg);
                    padding: var(--spacing-xl);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    box-shadow: var(--shadow-md);
                }
                .landing-card:hover {
                    transform: translateY(-8px);
                    border-color: var(--accent-primary);
                    box-shadow: var(--shadow-lg);
                }
                .card-icon {
                    font-size: 3rem;
                    margin-bottom: var(--spacing-md);
                }
                .landing-card h2 {
                    margin-bottom: var(--spacing-sm);
                    color: var(--text-primary);
                }
                .landing-card p {
                    color: var(--text-muted);
                    margin-bottom: var(--spacing-lg);
                    flex: 1;
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
                        font-size: 2rem;
                    }
                }
            `}} />
        </div>
    );
}

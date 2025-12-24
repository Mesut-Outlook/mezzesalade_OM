import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (login(username, password)) {
            // Success! AuthContext will update and App will redirect
        } else {
            setError('Geçersiz kullanıcı adı veya şifre');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-section">
                        <h1>Mezzesalade</h1>
                        <p>Yönetim Paneli Girişi</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Kullanıcı Adı</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Kullanıcı adınızı girin"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Şifre</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifrenizi girin"
                            required
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-btn">
                        Giriş Yap
                    </button>
                </form>

                <div className="login-footer">
                    <p>&copy; {new Date().getFullYear()} Mezzesalade Ottoman Mission</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

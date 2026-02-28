import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup } = useContext(AuthContext);
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedSkills, setSelectedSkills] = useState(['General Support']);
    const [error, setError] = useState(null);

    const defaultSkills = [
        "General Support",
        "Registration",
        "Tech Support",
        "Crowd Control",
        "Setup & Teardown",
        "Medical / First Aid"
    ];

    const toggleSkill = (skill) => {
        if (skill === "General Support") return; // Cannot deselect default
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, fullName, selectedSkills);
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="brand">EventHub</h1>
                    <p>{isLogin ? 'Welcome back! Log in to your account.' : 'Create an account to start managing events.'}</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Skills</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {defaultSkills.map(skill => (
                                        <div
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                cursor: skill === "General Support" ? 'not-allowed' : 'pointer',
                                                border: selectedSkills.includes(skill) ? '1px solid var(--success-color)' : '1px solid transparent',
                                                backgroundColor: 'transparent',
                                                color: selectedSkills.includes(skill) ? 'var(--success-color)' : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                                fontWeight: selectedSkills.includes(skill) ? '600' : '400',
                                                opacity: skill === "General Support" ? 0.8 : 1
                                            }}
                                        >
                                            {skill}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '500' }}
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;

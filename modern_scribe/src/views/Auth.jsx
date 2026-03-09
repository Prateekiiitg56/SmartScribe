import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { apiCall } from '../api';

const ModernAuth = ({ onBack, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        fullName: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const data = await apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                username: data.username,
                fullName: data.fullName
            }));

            onAuthSuccess(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Real Google OAuth using credential response (One Tap / popup)
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                // Get user info from Google using the access token
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();

                // Send to our backend to create/find user and get JWT
                const data = await apiCall('/auth/google', {
                    method: 'POST',
                    body: JSON.stringify({
                        credential: tokenResponse.access_token,
                        email: userInfo.email,
                        name: userInfo.name,
                        sub: userInfo.sub
                    })
                });

                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify({
                    username: data.username,
                    fullName: data.fullName
                }));

                onAuthSuccess(data);
            } catch (err) {
                setError('Google sign-in failed: ' + err.message);
            } finally {
                setLoading(false);
            }
        },
        onError: (err) => {
            setError('Google sign-in was cancelled or failed.');
            console.error('Google Login Error:', err);
        }
    });

    return (
        <div style={{ padding: '120px 8% 60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', position: 'relative', zIndex: 10 }}>
            {/* Background Glows */}
            <div style={{ position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(212,130,10,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: -1 }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="glass"
                style={{ width: '100%', maxWidth: '460px', padding: '3.5rem', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
            >
                {/* Top Accent Line */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--amber), transparent)' }} />

                <header style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--amber)', marginBottom: '1.2rem' }}>
                        <ShieldCheck size={18} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 600 }}>Account Access</span>
                    </div>
                    <h2 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '0.6rem', lineHeight: 1.1 }}>
                        {isLogin ? 'Welcome back.' : 'Create Account.'}
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'var(--body)' }}>
                        {isLogin ? 'Enter your details to sign in.' : 'Fill in the information to get started.'}
                    </p>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {error && (
                        <div style={{ padding: '0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.75rem', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                key="register-fields"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', overflow: 'hidden' }}
                            >
                                <div className="input-group" style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><User size={16} /></div>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,130,10,0.1)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                                <div className="input-group" style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><Mail size={16} /></div>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,130,10,0.1)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><User size={16} /></div>
                        <input
                            type="text"
                            placeholder="Username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,130,10,0.1)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.85rem', outline: 'none' }}
                        />
                    </div>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}><Lock size={16} /></div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,130,10,0.1)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.85rem', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-premium"
                        style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Authenticating...' : (isLogin ? 'LOGIN' : 'REGISTER')}
                        <ChevronRight size={18} />
                    </button>
                </form>

                {/* Google Sign-In Divider */}
                <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.1)' }} />
                    <span style={{ margin: '0 1.5rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.1)' }} />
                </div>

                {/* Real Google Sign-In Button */}
                <button
                    onClick={() => googleLogin()}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        width: '100%', padding: '14px', marginTop: '1.5rem',
                        background: '#fff', color: '#000', border: 'none',
                        fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        borderRadius: '2px', transition: 'all 0.3s',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z" />
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36.5 24 36.5c-5.3 0-9.6-3.5-11.2-8.2l-6.5 5C9.6 39.8 16.3 44 24 44z" />
                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.2C40.7 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
                    </svg>
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>

                <footer style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.7rem', cursor: 'pointer', transition: 'color 0.3s' }}
                        className="hover:text-[var(--amber2)]"
                    >
                        {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </footer>
            </motion.div>
        </div>
    );
};

export default ModernAuth;

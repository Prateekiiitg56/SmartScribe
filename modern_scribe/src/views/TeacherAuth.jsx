import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { apiCall } from '../api';

const TeacherAuth = ({ onBack, onAuthSuccess }) => {
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
            const endpoint = isLogin ? '/auth/teacher/login' : '/auth/teacher/register';
            const data = await apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                username: data.username,
                fullName: data.fullName,
                role: data.role
            }));

            onAuthSuccess(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();

                const data = await apiCall('/auth/teacher/google', {
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
                    fullName: data.fullName,
                    role: data.role
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

    const inputStyle = {
        width: '100%',
        padding: '1.2rem 1.2rem 1.2rem 3.5rem',
        background: 'rgba(74, 144, 217, 0.04)',
        border: '1px solid rgba(74, 144, 217, 0.2)',
        color: 'var(--paper)',
        fontFamily: 'var(--mono)',
        fontSize: '0.8rem',
        outline: 'none',
        transition: 'border-color 0.3s'
    };

    return (
        <div style={{ padding: '140px 8% 80px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'radial-gradient(circle at 90% 10%, rgba(74, 144, 217, 0.06) 0%, transparent 40%)' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="glass"
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '4rem',
                    border: '1px solid rgba(74, 144, 217, 0.2)',
                    position: 'relative',
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)'
                }}
            >
                <div style={{ position: 'absolute', top: 0, left: 30, right: 30, height: '1px', background: 'linear-gradient(90deg, transparent, #4A90D9, transparent)', opacity: 0.4 }} />

                <header style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', color: '#4A90D9', marginBottom: '1.5rem' }}>
                        <GraduationCap size={20} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 600 }}>TEACHER ACCESS</span>
                    </div>
                    <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.8rem', letterSpacing: '-0.03em' }}>
                        {isLogin ? 'Welcome, Mentor.' : 'Register as Teacher.'}
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6 }}>
                        {isLogin ? 'Access your classrooms and review essays.' : 'Create your teacher account to get started.'}
                    </p>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.75rem', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '1rem' }}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                key="reg-fields"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#4A90D9', opacity: 0.6 }}><User size={16} /></div>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#4A90D9', opacity: 0.6 }}><Mail size={16} /></div>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#4A90D9', opacity: 0.6 }}><User size={16} /></div>
                        <input
                            type="text"
                            placeholder="Username (must be unique)"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#4A90D9', opacity: 0.6 }}><Lock size={16} /></div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '1.5rem',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1.2rem',
                            fontFamily: 'var(--mono)',
                            fontSize: '0.8rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: '#fff',
                            background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
                            padding: '1.2rem 3rem',
                            clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)',
                            border: 'none',
                            fontWeight: 900,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: '0 8px 25px rgba(74, 144, 217, 0.3)',
                            transition: 'all 0.4s'
                        }}
                    >
                        {loading ? 'PROCESSING...' : (isLogin ? 'ENTER CLASSROOM' : 'CREATE TEACHER ACCOUNT')}
                        <ChevronRight size={18} />
                    </button>
                </form>

                {/* Google sign-in divider */}
                <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(74,144,217,0.12)' }} />
                    <span style={{ margin: '0 1.5rem', opacity: 0.5 }}>OR USE GOOGLE</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(74,144,217,0.12)' }} />
                </div>

                <button
                    onClick={() => googleLogin()}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        width: '100%', padding: '16px', marginTop: '2rem',
                        background: 'rgba(74,144,217,0.04)', color: 'var(--paper)', border: '1px solid rgba(74,144,217,0.2)',
                        fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.2em',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        borderRadius: '2px', transition: 'all 0.4s',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#ea4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285f4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#fbbc05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34a853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    {loading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
                </button>

                <footer style={{ marginTop: '3.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.3s', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                    >
                        {isLogin ? "New Teacher? — Register" : "Already registered? — Sign In"}
                    </button>
                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={onBack}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.6rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}
                        >
                            ← Back to Student Login
                        </button>
                    </div>
                </footer>
            </motion.div>
        </div>
    );
};

export default TeacherAuth;

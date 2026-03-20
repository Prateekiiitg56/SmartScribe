import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github } from 'lucide-react';
import Hero3D from './components/Hero3D';
import Evaluate from './views/Evaluate';
import Dashboard from './views/Dashboard';
import Auth from './views/Auth';
import './index.css';

const Navbar = ({ activePage, setActivePage, user, onLogout }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { name: 'Home', id: 'home' },
        { name: 'Evaluate', id: 'evaluate' },
        { name: 'Dashboard', id: 'dashboard' },
    ];

    const navStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '0 8%',
        height: '90px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        background: scrolled ? 'rgba(7, 8, 10, 0.98)' : 'linear-gradient(to bottom, rgba(7, 8, 10, 0.9) 0%, rgba(7, 8, 10, 0) 100%)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent'
    };

    return (
        <nav style={navStyle}>
            <div
                onClick={() => setActivePage('home')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
            >
                <div style={{ width: 12, height: 12, background: 'var(--amber)', borderRadius: '50%', boxShadow: '0 0 20px var(--amber)' }} />
                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', fontWeight: 900, color: 'var(--paper)', letterSpacing: '-0.03em' }}>SmartScribe</span>
            </div>

            <div style={{ display: 'flex', gap: '3.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '2.5rem' }}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            style={{
                                fontFamily: 'var(--mono)',
                                fontSize: '0.7rem',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: activePage === item.id ? 'var(--amber2)' : 'rgba(240,235,224,0.5)',
                                transition: 'all 0.4s',
                                position: 'relative',
                                padding: '0.5rem 0'
                            }}
                        >
                            {item.name}
                            {activePage === item.id && (
                                <motion.div
                                    layoutId="nav-glow"
                                    style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 1.5, background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {user ? (
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--paper)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.fullName || 'User'}</span>
                        <button
                            onClick={onLogout}
                            style={{
                                fontFamily: 'var(--mono)',
                                fontSize: '0.65rem',
                                color: 'rgba(240,235,224,0.6)',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                padding: '0.6rem 1.2rem',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                transition: 'all 0.3s'
                            }}
                            className="hover:border-[var(--amber)] hover:text-[var(--amber)]"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setActivePage('login')}
                        style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.7rem',
                            letterSpacing: '0.15em',
                            padding: '0.8rem 1.8rem',
                            background: activePage === 'login' ? 'var(--amber2)' : 'var(--amber)',
                            color: '#000',
                            fontWeight: 900,
                            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        LOGIN
                    </button>
                )}
            </div>
        </nav>
    );
};

const HomeView = ({ setActivePage }) => (
    <>
        <section style={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '160px 8% 100px',
            overflow: 'hidden',
            background: 'radial-gradient(circle at 10% 20%, rgba(212, 130, 10, 0.03) 0%, transparent 40%)'
        }}>
            <Hero3D />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 850 }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '3rem' }}
                >
                    <div style={{ width: 50, height: 1, background: 'var(--amber)' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--amber)', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600 }}>AI ESSAY EVALUATOR</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                    style={{ fontSize: 'clamp(3.5rem, 8vw, 7.5rem)', lineHeight: 0.85, marginBottom: '3rem', letterSpacing: '-0.05em', fontWeight: 900 }}
                >
                    Write better.<br />
                    <span style={{ color: 'var(--amber2)', fontStyle: 'italic', position: 'relative' }}>
                        Score higher.
                        <svg style={{ position: 'absolute', bottom: -12, left: 0, width: '100%' }} viewBox="0 0 300 20">
                            <path d="M5 15 Q 150 5 295 15" fill="none" stroke="var(--amber)" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
                        </svg>
                    </span><br />
                    Every time.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    style={{ fontSize: '1.2rem', fontWeight: 300, color: 'rgba(240,235,224,0.7)', maxWidth: 600, margin: '3rem 0 4rem', lineHeight: 1.8, fontFamily: 'var(--body)' }}
                >
                    SmartScribe uses AI to check your grammar, flow, and coherence — providing detailed feedback in seconds.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    style={{ display: 'flex', gap: '2.5rem' }}
                >
                    <button className="btn-premium" onClick={() => setActivePage('evaluate')}>START EVALUATING</button>
                    <button style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.8rem',
                        padding: '1.2rem 3rem',
                        background: 'transparent',
                        border: '1px solid rgba(240,235,224,0.1)',
                        color: 'var(--paper)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        cursor: 'pointer',
                        transition: 'all 0.4s'
                    }} className="hover:border-[var(--amber)] hover:text-[var(--amber)]">LEARN MORE</button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    style={{ display: 'flex', gap: '6rem', marginTop: '8rem', padding: '4rem 0', borderTop: '1px solid var(--border)' }}
                >
                    <div><div style={{ fontFamily: 'var(--serif)', fontSize: '3.2rem', fontWeight: 900, color: 'var(--amber2)' }}>7</div><div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>METRIC LAYERS</div></div>
                    <div><div style={{ fontFamily: 'var(--serif)', fontSize: '3.2rem', fontWeight: 900, color: 'var(--amber2)' }}>99%</div><div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>ACCURACY</div></div>
                    <div><div style={{ fontFamily: 'var(--serif)', fontSize: '3.2rem', fontWeight: 900, color: 'var(--amber2)' }}>&lt;1s</div><div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>SPEED</div></div>
                </motion.div>
            </div>
        </section>
    </>
);

const App = () => {
    const [activePage, setActivePage] = useState('home');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }

        // Listen for session expiry from api.js
        const handleAuthLogout = () => {
            setUser(null);
            setActivePage('login');
        };
        window.addEventListener('auth:logout', handleAuthLogout);
        return () => window.removeEventListener('auth:logout', handleAuthLogout);
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activePage]);

    const handleAuthSuccess = (data) => {
        setUser({ username: data.username, fullName: data.fullName });
        setActivePage('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setActivePage('home');
    };

    return (
        <div style={{ background: 'var(--ink)', minHeight: '100vh', position: 'relative' }}>
            <Navbar activePage={activePage} setActivePage={setActivePage} user={user} onLogout={handleLogout} />

            <main>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePage}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    >
                        {activePage === 'home' && <HomeView setActivePage={setActivePage} />}
                        {activePage === 'evaluate' && (user ? <Evaluate /> : <Auth onBack={() => setActivePage('home')} onAuthSuccess={handleAuthSuccess} />)}
                        {activePage === 'dashboard' && (user ? <Dashboard /> : <Auth onBack={() => setActivePage('home')} onAuthSuccess={handleAuthSuccess} />)}
                        {activePage === 'login' && <Auth onBack={() => setActivePage('home')} onAuthSuccess={handleAuthSuccess} />}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer style={{ borderTop: '1px solid var(--border)', padding: '6rem 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(7,8,10,0.8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ width: 10, height: 10, background: 'var(--amber)', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'var(--serif)', fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>SmartScribe.</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                    IIIT Guwahati · Computer Engineering Lab · 2026
                </div>
                <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Source Archive</span>
                    <Github size={22} color="var(--muted)" style={{ cursor: 'pointer' }} className="hover:text-[var(--amber)] transition-colors" />
                </div>
            </footer>
        </div>
    );
};

export default App;

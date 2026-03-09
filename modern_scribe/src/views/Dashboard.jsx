import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, User, History, Download, TrendingUp, Star, Award, ChevronRight, Loader2 } from 'lucide-react';
import { apiCall } from '../api';

const KPICard = ({ icon: Icon, label, value, trend, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.8 }}
        className="glass-card"
        style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, background: 'rgba(212,130,10,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                <Icon size={20} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>{trend}</div>
        </div>
        <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>{label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '2.4rem', fontWeight: 900, color: 'var(--paper)' }}>{value}</div>
        </div>
    </motion.div>
);

const HistoryRow = ({ date, title, score, status, delay }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.6 }}
        style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 40px', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(212,130,10,0.08)', transition: 'background 0.3s' }}
        className="hover:bg-white/5 cursor-pointer"
    >
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>{new Date(date).toLocaleDateString()}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--paper)', fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--amber2)', textAlign: 'center' }}>{score}%</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{status}</span>
        </div>
        <ChevronRight size={16} color="var(--muted)" />
    </motion.div>
);

const ModernDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiCall('/dashboard/stats');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                <Loader2 size={48} className="animate-spin" />
            </div>
        );
    }

    const { averages, recent_essays, total_submissions } = stats || {};

    return (
        <section style={{ padding: '120px 8% 60px', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.2rem', color: 'var(--amber)' }}>
                            <TrendingUp size={16} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>PERFORMANCE</span>
                        </div>
                        <h2 style={{ fontSize: '3.6rem', fontWeight: 900 }}>My <em>Progress.</em></h2>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(240,235,224,0.03)', border: '1px solid var(--border)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase' }}>ACCOUNT</div>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--paper)' }}>{user.fullName || 'User'}</div>
                        </div>
                        <div style={{ width: 44, height: 44, background: 'var(--amber)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                    <KPICard icon={Star} label="Average Score" value={`${averages?.avg_overall || 0}%`} trend="" delay={0.1} />
                    <KPICard icon={History} label="All Essays" value={total_submissions || 0} trend="" delay={0.2} />
                    <KPICard icon={Award} label="Best Skill" value="Grammar" trend="" delay={0.3} />
                    <KPICard icon={BarChart3} label="Level" value="Lvl 4" trend="" delay={0.4} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                    <div className="glass" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem' }}>Recent Essays</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 40px', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Title</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Score</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                            <span />
                        </div>

                        {recent_essays?.map((essay, i) => (
                            <HistoryRow
                                key={essay.id}
                                date={essay.submitted_at}
                                title={essay.title}
                                score={essay.overall_score}
                                status="Saved"
                                delay={0.2 + (i * 0.1)}
                            />
                        ))}
                        {(!recent_essays || recent_essays.length === 0) && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>No records found.</div>
                        )}
                    </div>

                    <div className="glass" style={{ border: '1px solid var(--border)', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', width: '220px', height: '220px', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', width: '70%', height: '70%', border: '1px solid rgba(212,130,10,0.1)', borderRadius: '50%' }} />
                            <div style={{ position: 'absolute', width: '40%', height: '40%', border: '1px solid rgba(212,130,10,0.05)', borderRadius: '50%' }} />
                            <div style={{ fontFamily: 'var(--serif)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--amber)', zIndex: 2 }}>{averages?.avg_overall || 0}%</div>
                        </div>
                        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem' }}>Overall Score</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, maxWidth: 220 }}>Tracking your progress across <em>{total_submissions || 0} essays</em>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ModernDashboard;

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, User, History, Download, TrendingUp, Star, Award, ChevronRight, Loader2, Trash2, FileText } from 'lucide-react';
import { apiCall } from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const KPICard = ({ icon: Icon, label, value, trend, delay, color = 'var(--amber)' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.8 }}
        className="glass-card"
        style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: '1 1 200px', minWidth: '220px' }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'rgba(212,130,10,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                <Icon size={18} />
            </div>
            {trend && <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>{trend}</div>}
        </div>
        <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 900, color: 'var(--paper)' }}>{value}</div>
        </div>
    </motion.div>
);

const HistoryRow = ({ essay, delay, onOpen }) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.5 }}
        onClick={() => onOpen(essay)}
        style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 40px', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(212,130,10,0.05)', transition: 'all 0.3s' }}
        className="hover:bg-amber-500/5 cursor-pointer group"
    >
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>{new Date(essay.submitted_at).toLocaleDateString()}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--paper)', fontWeight: 700 }}>{essay.title}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--amber2)', textAlign: 'center' }}>{Math.round(essay.overall_score)}%</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: essay.overall_score > 70 ? '#10b981' : '#f59e0b' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                {essay.overall_score > 70 ? 'Excellent' : 'Needs Work'}
            </span>
        </div>
        <ChevronRight size={16} className="text-muted group-hover:text-amber transition-colors translate-x-0 group-hover:translate-x-1" />
    </motion.div>
);

const Modal = ({ essay, onClose, onDelete, onDownload }) => {
    if (!essay) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(7,8,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', background: 'var(--ink2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Essay Analysis</div>
                        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>{essay.title}</h2>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>Submitted on {new Date(essay.submitted_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => { console.log('Downloading PDF...'); onDownload(essay); }} style={{ background: 'rgba(212,130,10,0.1)', border: '1px solid var(--amber)', padding: '0.8rem', color: 'var(--amber)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={16} /> Save PDF
                        </button>
                        <button onClick={() => { console.log('Deleting essay...'); onDelete(essay.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '0.8rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Trash2 size={16} /> Delete
                        </button>
                        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', padding: '0.8rem', color: 'var(--paper)', cursor: 'pointer' }}>Close</button>
                    </div>
                </div>

                <div style={{ overflowY: 'auto', padding: '2.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
                    <div>
                        <h4 style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Full Content</h4>
                        <div style={{ fontSize: '1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'rgba(240,235,224,0.8)', fontFamily: 'var(--serif)' }}>
                            {essay.content}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: '3.5rem', fontWeight: 900, color: 'var(--amber)' }}>{Math.round(essay.overall_score)}%</div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Overall Score</div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <h4 style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>AI Feedback</h4>
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic', background: 'rgba(212,130,10,0.03)', padding: '1rem', borderLeft: '2px solid var(--amber)' }}>
                                {essay.feedback}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{Math.round(essay.grammar_score)}%</div>
                                <div style={{ fontSize: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Grammar</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{Math.round(essay.coherence_score)}%</div>
                                <div style={{ fontSize: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Coherence</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{Math.round(essay.argument_score)}%</div>
                                <div style={{ fontSize: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Argument</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ModernDashboard = () => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEssay, setSelectedEssay] = useState(null);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchDashboardData = async () => {
        try {
            const [statsData, historyData] = await Promise.all([
                apiCall('/dashboard/stats'),
                apiCall('/dashboard/essays')
            ]);
            setStats(statsData);
            setHistory(historyData);
        } catch (err) {
            console.error('Fetch dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleDeleteEssay = async (essayId) => {
        if (!confirm('Are you sure you want to delete this essay forever?')) return;
        try {
            await apiCall(`/essays/${essayId}`, { method: 'DELETE' });
            setSelectedEssay(null);
            fetchDashboardData();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete essay: ' + err.message);
        }
    };

    const downloadSingleEssayPDF = (essay) => {
        try {
            console.log('Generating Single PDF for:', essay.title);
            const doc = new jsPDF();

            doc.setFillColor(7, 8, 10);
            doc.rect(0, 0, 210, 297, 'F');

            doc.setTextColor(212, 130, 10);
            doc.setFontSize(24);
            doc.text(essay.title, 20, 30);

            doc.setTextColor(150, 150, 150);
            doc.setFontSize(10);
            doc.text(`Submitted on: ${new Date(essay.submitted_at).toLocaleString()}`, 20, 40);

            doc.setTextColor(240, 235, 224);
            doc.setFontSize(12);
            doc.text(`Overall Score: ${Math.round(essay.overall_score)}%`, 20, 55);

            autoTable(doc, {
                startY: 65,
                head: [['Dimensions', 'Score']],
                body: [
                    ['Grammar', `${Math.round(essay.grammar_score)}%`],
                    ['Coherence', `${Math.round(essay.coherence_score)}%`],
                    ['Argumentation', `${Math.round(essay.argument_score)}%`],
                ],
                theme: 'grid',
                headStyles: { fillColor: [212, 130, 10] },
                styles: { fillColor: [20, 20, 20], textColor: [240, 235, 224] }
            });

            let finalY = doc.lastAutoTable.finalY + 15;
            doc.setTextColor(212, 130, 10);
            doc.text("AI FEEDBACK", 20, finalY);
            doc.setTextColor(240, 235, 224);
            doc.setFontSize(10);
            const splitFeedback = doc.splitTextToSize(essay.feedback || 'No feedback available.', 170);
            doc.text(splitFeedback, 20, finalY + 10);

            finalY += (splitFeedback.length * 5) + 20;
            if (finalY > 260) { doc.addPage(); finalY = 20; }

            doc.setTextColor(212, 130, 10);
            doc.text("CONTENT", 20, finalY);
            doc.setTextColor(240, 235, 224);
            const splitContent = doc.splitTextToSize(essay.content || 'No content.', 170);
            doc.text(splitContent, 20, finalY + 10);

            doc.save(`${essay.title.replace(/\s+/g, '_')}_Analysis.pdf`);
            console.log('Single PDF saved.');
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Failed to generate PDF. Check console for details.');
        }
    };

    const generateFullReport = () => {
        try {
            console.log('Generating Full Report...');
            if (!history || history.length === 0) return alert('No essays found to generate a report.');

            const doc = new jsPDF();
            doc.setFillColor(7, 8, 10);
            doc.rect(0, 0, 210, 297, 'F');

            doc.setTextColor(212, 130, 10);
            doc.setFontSize(28);
            doc.text("SMARTSCRIBE REPORT", 20, 40);

            doc.setTextColor(240, 235, 224);
            doc.setFontSize(14);
            doc.text(`Mastery Overview for ${user.fullName || 'Writer'}`, 20, 55);

            autoTable(doc, {
                startY: 70,
                head: [['Date', 'Title', 'Score', 'Status']],
                body: history.map(e => [
                    new Date(e.submitted_at).toLocaleDateString(),
                    e.title,
                    `${Math.round(e.overall_score)}%`,
                    e.overall_score > 70 ? 'Excellent' : 'Improving'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [212, 130, 10] },
                styles: { fillColor: [15, 15, 15], textColor: [200, 200, 200] }
            });

            doc.save(`SmartScribe_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            console.log('Full report saved.');
        } catch (err) {
            console.error('Report Generation Error:', err);
            alert('Failed to generate report. Check console for details.');
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                <Loader2 size={48} className="animate-spin" />
            </div>
        );
    }

    const { averages, recent_essays, total_submissions } = stats || {};
    const displayedEssays = showAllHistory ? history : (recent_essays || []);

    return (
        <section style={{ padding: '120px 8% 60px', minHeight: '100vh', background: 'radial-gradient(circle at 90% 10%, rgba(212, 130, 10, 0.05) 0%, transparent 50%)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.2rem', color: 'var(--amber)' }}>
                            <TrendingUp size={16} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>DASHBOARD OVERVIEW</span>
                        </div>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>Welcome back, <br /><span style={{ color: 'var(--amber2)', fontStyle: 'italic' }}>{user.fullName || 'Writer'}</span></h2>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.2rem 2.5rem', background: 'rgba(240,235,224,0.02)', border: '1px solid var(--border)', clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member Since</div>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: '0.9rem', color: 'var(--paper)', fontWeight: 700 }}>2025</div>
                        </div>
                        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--amber), var(--amber2))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', boxShadow: '0 0 20px rgba(212,130,10,0.3)' }}>
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
                    <KPICard icon={Star} label="Average Mastery" value={`${Math.round(averages?.avg_overall || 0)}%`} trend="+2.4%" delay={0.1} />
                    <KPICard icon={History} label="Essays Analyzed" value={total_submissions || 0} trend="Top 10%" delay={0.2} />
                    <KPICard icon={Award} label="Primary Strength" value="Coherence" trend="Strong" color="#10b981" delay={0.3} />
                    <KPICard icon={BarChart3} label="Writer Level" value={`Level ${Math.floor((total_submissions || 0) / 2) + 1}`} trend="Advancing" delay={0.4} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)', gap: '3rem' }}>
                    <div className="glass" style={{ border: '1px solid var(--border)', padding: '2.5rem', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Essay History</h3>
                            <button
                                onClick={() => setShowAllHistory(!showAllHistory)}
                                style={{ background: 'transparent', border: '1px solid var(--border)', padding: '0.6rem 1.2rem', color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                                className="hover:bg-amber-500/10 transition-colors"
                            >
                                {showAllHistory ? 'Show Recent' : 'View All'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 40px', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', opacity: 0.4 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Date</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Essay Title</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center' }}>Score</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Assigned</span>
                            <span />
                        </div>

                        <div style={{ maxHeight: showAllHistory ? '600px' : 'none', overflowY: showAllHistory ? 'auto' : 'visible' }}>
                            {displayedEssays.map((essay, i) => (
                                <HistoryRow
                                    key={essay.id}
                                    essay={essay}
                                    onOpen={setSelectedEssay}
                                    delay={0.1 + (i * 0.05)}
                                />
                            ))}
                        </div>

                        {displayedEssays.length === 0 && (
                            <div style={{ padding: '5rem 3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', opacity: 0.5 }}>Your literary journey begins with your first essay submission.</div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass" style={{ border: '1px solid var(--border)', padding: '3.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(212,130,10,0.05)" strokeWidth="2" />
                                    <motion.circle
                                        cx="50" cy="50" r="45" fill="none" stroke="var(--amber)" strokeWidth="2"
                                        strokeDasharray="283"
                                        initial={{ strokeDashoffset: 283 }}
                                        animate={{ strokeDashoffset: 283 - (283 * (averages?.avg_overall || 0) / 100) }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div style={{ textAlign: 'center', zIndex: 2 }}>
                                    <div style={{ fontFamily: 'var(--serif)', fontSize: '3rem', fontWeight: 900, color: 'var(--amber)' }}>{Math.round(averages?.avg_overall || 0)}<span style={{ fontSize: '1.2rem' }}>%</span></div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Consistency</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.8rem', fontWeight: 700 }}>Skill Distribution</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>Your writing shows strong <em>argumentation patterns</em> and reliable grammar.</p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(212,130,10,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <FileText size={20} color="var(--amber)" />
                                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Export Analytics</h4>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Download a comprehensive PDF report of your progress and AI feedback across all sessions.</p>
                            <button
                                onClick={() => { console.log('Generate Report clicked'); generateFullReport(); }}
                                style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedEssay && (
                    <Modal
                        essay={selectedEssay}
                        onClose={() => setSelectedEssay(null)}
                        onDelete={handleDeleteEssay}
                        onDownload={downloadSingleEssayPDF}
                    />
                )}
            </AnimatePresence>
        </section>
    );
};

export default ModernDashboard;

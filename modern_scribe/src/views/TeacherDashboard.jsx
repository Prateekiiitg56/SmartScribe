import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Users, FileText, ArrowLeft, X, Send, Star,
    Copy, CheckCircle, Trash2, Eye, ChevronRight, BookOpen
} from 'lucide-react';
import { apiCall } from '../api';

/* ─── colour tokens ─── */
const BLUE = '#4A90D9';
const BLUE_DIM = 'rgba(74, 144, 217, 0.15)';
const BLUE_GLOW = 'rgba(74, 144, 217, 0.35)';

/* ─── reusable inline-styles ─── */
const card = {
    background: 'linear-gradient(135deg, rgba(74,144,217,0.08) 0%, rgba(14,15,18,0.82) 100%)',
    border: `1px solid ${BLUE_DIM}`,
    borderRadius: 12,
    padding: '2rem',
    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
    cursor: 'pointer',
};
const badge = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.15em', padding: '0.35rem 0.8rem', borderRadius: 100,
    background: BLUE_DIM, color: BLUE,
};
const inputStyle = {
    width: '100%', padding: '1rem 1.2rem',
    background: 'rgba(74,144,217,0.04)', border: `1px solid ${BLUE_DIM}`,
    color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.8rem',
    outline: 'none', borderRadius: 6,
};
const btnPrimary = {
    fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    background: `linear-gradient(135deg, ${BLUE}, #357ABD)`, color: '#fff',
    border: 'none', padding: '1rem 2rem', borderRadius: 6,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: `0 6px 20px ${BLUE_GLOW}`, transition: 'all 0.3s',
};
const btnOutline = {
    ...btnPrimary, background: 'transparent', color: BLUE,
    border: `1px solid ${BLUE_DIM}`, boxShadow: 'none',
};

/* ───────────────────────────────────────────────── */
/*                 TEACHER DASHBOARD                  */
/* ───────────────────────────────────────────────── */
const TeacherDashboard = () => {
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState(null);
    const [view, setView] = useState('list');       // list | room | essay
    const [activeRoom, setActiveRoom] = useState(null);
    const [activeEssay, setActiveEssay] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newRoom, setNewRoom] = useState({ name: '', description: '' });
    const [newMember, setNewMember] = useState('');
    const [review, setReview] = useState({ grammar: 75, coherence: 75, argument: 75, overall: 75, review: '' });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [essayTab, setEssayTab] = useState('active'); // active | history
    const [evalConfig, setEvalConfig] = useState({ min_words: 0, style: 'any' }); // missing evaluation configuration

    const fetchRooms = async () => { try { setRooms(await apiCall('/rooms')); } catch { } };
    const fetchStats = async () => { try { setStats(await apiCall('/teacher/dashboard/stats')); } catch { } };
    useEffect(() => { fetchRooms(); fetchStats(); }, []);

    /* ── actions ── */
    const createRoom = async () => {
        if (!newRoom.name.trim()) return;
        setLoading(true);
        try {
            await apiCall('/rooms', { method: 'POST', body: JSON.stringify(newRoom) });
            setNewRoom({ name: '', description: '' });
            setShowCreate(false);
            fetchRooms();
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const openRoom = async (id) => {
        setLoading(true);
        try {
            const r = await apiCall(`/rooms/${id}`);
            setActiveRoom(r);
            setView('room');
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const addMember = async () => {
        if (!newMember.trim()) return;
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}/members`, { method: 'POST', body: JSON.stringify({ username: newMember }) });
            setNewMember('');
            setShowAddMember(false);
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const removeMember = async (sid) => {
        try {
            await apiCall(`/rooms/${activeRoom.id}/members/${sid}`, { method: 'DELETE' });
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); }
    };

    const clearHistory = async () => {
        if (!window.confirm("Are you sure you want to delete all archived essays?")) return;
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}/history`, { method: 'DELETE' });
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const deleteRoom = async () => {
        if (!window.confirm(`Are you sure you want to delete room "${activeRoom.name}" and all its data? This cannot be undone.`)) return;
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}`, { method: 'DELETE' });
            setMsg('Room deleted successfully');
            setView('list');
            fetchRooms();
            fetchStats();
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const approveMember = async (sid) => {
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}/members/${sid}/approve`, { method: 'POST' });
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const rejectMember = async (sid) => {
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}/members/${sid}/reject`, { method: 'POST' });
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const openEssay = async (essayId) => {
        setLoading(true);
        try {
            const e = await apiCall(`/rooms/${activeRoom.id}/essays/${essayId}`);
            setActiveEssay(e);
            setReview({
                grammar: e.teacher_grammar || 75, coherence: e.teacher_coherence || 75,
                argument: e.teacher_argument || 75, overall: e.teacher_overall || 75,
                review: e.teacher_review || ''
            });
            setView('essay');
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const submitReview = async () => {
        setLoading(true);
        try {
            await apiCall(`/rooms/${activeRoom.id}/essays/${activeEssay.id}/review`, {
                method: 'POST', body: JSON.stringify(review)
            });
            setMsg('Review submitted!');
            openRoom(activeRoom.id);
            setView('room');
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const runAiReview = async (type = 'ai') => {
        setLoading(true);
        setMsg(`Running ${type === 'ai' ? 'AI' : 'Local Model'} evaluation...`);
        try {
            const ep = type === 'ai' ? 'ai-review' : 'hf-review';
            const res = await apiCall(`/rooms/${activeRoom.id}/essays/${activeEssay.id}/${ep}`, {
                method: 'POST',
                body: JSON.stringify(evalConfig)
            });
            setMsg(`Evaluation complete!`);
            // Automatically fill slider scores with the returned values
            const scores = res.ai_scores || res.hf_scores;
            setReview({
                grammar: Math.round(scores.grammar),
                coherence: Math.round(scores.coherence),
                argument: Math.round(scores.argumentation || scores.argument),
                overall: Math.round(res.overall || scores.overall),
                review: res.feedback || (scores.feedback || `Evaluated by ${type.toUpperCase()}`)
            });
        } catch (e) { setMsg(e.message); }
        setLoading(false);
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* ── clear transient messages ── */
    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); } }, [msg]);

    /* ── score slider ── */
    const ScoreSlider = ({ label, value, onChange }) => (
        <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: BLUE }}>{value}</span>
            </div>
            <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: BLUE }} />
        </div>
    );

    /* ═══════════════════ ESSAY REVIEW VIEW ═══════════════════ */
    if (view === 'essay' && activeEssay) return (
        <div style={{ padding: '140px 8% 80px', minHeight: '100vh' }}>
            <button onClick={() => setView('room')} style={{ ...btnOutline, marginBottom: '2rem', padding: '0.6rem 1.2rem', fontSize: '0.65rem' }}>
                <ArrowLeft size={14} /> Back to Room
            </button>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
                {/* Essay content */}
                <div style={{ ...card, cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{activeEssay.title}</h2>
                        <span style={badge}><Users size={12} /> {activeEssay.full_name}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--body)', fontSize: '0.95rem', lineHeight: 2, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>
                        {activeEssay.content}
                    </p>
                    <div style={{ marginTop: '1.5rem', fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Submitted: {new Date(activeEssay.submitted_at).toLocaleString()}
                    </div>
                </div>

                {/* Review panel */}
                <div style={{ ...card, cursor: 'default', position: 'sticky', top: 120, alignSelf: 'start' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Star size={18} color={BLUE} /> Review Panel
                    </h3>
                    {activeEssay.reviewed_at && (
                        <div style={{ ...badge, marginBottom: '1rem', background: 'rgba(110,203,138,0.15)', color: '#6ECB8A' }}>
                            <CheckCircle size={12} /> Previously Reviewed
                        </div>
                    )}
                    <ScoreSlider label="Grammar" value={review.grammar} onChange={(v) => setReview({ ...review, grammar: v })} />
                    <ScoreSlider label="Coherence" value={review.coherence} onChange={(v) => setReview({ ...review, coherence: v })} />
                    <ScoreSlider label="Argumentation" value={review.argument} onChange={(v) => setReview({ ...review, argument: v })} />
                    <ScoreSlider label="Overall" value={review.overall} onChange={(v) => setReview({ ...review, overall: v })} />

                    <div style={{ marginTop: '1.5rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ marginBottom: '0.8rem' }}>
                            <label style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)', display: 'block', marginBottom: 6 }}>Min Words</label>
                            <input type="number"
                                value={evalConfig.min_words}
                                onChange={(e) => setEvalConfig({ ...evalConfig, min_words: parseInt(e.target.value) || 0 })}
                                style={{ ...inputStyle, padding: '0.5rem', fontSize: '0.8rem' }}
                                min={0}
                            />
                        </div>
                        <div>
                            <label style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)', display: 'block', marginBottom: 6 }}>Style</label>
                            <select
                                value={evalConfig.style}
                                onChange={(e) => setEvalConfig({ ...evalConfig, style: e.target.value })}
                                style={{ ...inputStyle, padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                                <option value="any">Any (Standard)</option>
                                <option value="formal">Formal</option>
                                <option value="informal">Informal</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                        <button onClick={() => runAiReview('ai')} disabled={loading} style={{ ...btnOutline, flex: 1, padding: '0.5rem', fontSize: '0.6rem', justifyContent: 'center' }}>
                            SmartScribe AI
                        </button>
                        <button onClick={() => runAiReview('hf')} disabled={loading} style={{ ...btnOutline, flex: 1, padding: '0.5rem', fontSize: '0.6rem', justifyContent: 'center', borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                            Local Model (HF)
                        </button>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                        <label style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-soft)', display: 'block', marginBottom: 8 }}>Feedback</label>
                        <textarea
                            value={review.review}
                            onChange={(e) => setReview({ ...review, review: e.target.value })}
                            rows={5}
                            placeholder="Write your feedback for the student..."
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--body)', lineHeight: 1.7, fontSize: '0.85rem' }}
                        />
                    </div>
                    <button onClick={submitReview} disabled={loading} style={{ ...btnPrimary, width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <Send size={14} /> {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </motion.div>
        </div>
    );

    /* ═══════════════════ ROOM DETAIL VIEW ═══════════════════ */
    if (view === 'room' && activeRoom) return (
        <div style={{ padding: '140px 8% 80px', minHeight: '100vh' }}>
            {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 100, right: 40, zIndex: 9999, background: BLUE, color: '#fff', padding: '0.8rem 1.5rem', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{msg}</motion.div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button onClick={() => { setView('list'); fetchRooms(); fetchStats(); }} style={{ ...btnOutline, padding: '0.6rem 1.2rem', fontSize: '0.65rem' }}>
                    <ArrowLeft size={14} /> All Rooms
                </button>
                <button onClick={deleteRoom} disabled={loading} style={{ ...btnOutline, padding: '0.6rem 1.2rem', fontSize: '0.65rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete Room
                </button>
            </div>

            {/* Room header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, cursor: 'default', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{activeRoom.name}</h2>
                        {activeRoom.description && <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginBottom: '1rem' }}>{activeRoom.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: 4 }}>Room Code</div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 900, color: BLUE, letterSpacing: '0.15em' }}>{activeRoom.room_code}</div>
                        </div>
                        <button onClick={() => copyCode(activeRoom.room_code)} style={{ background: 'transparent', border: `1px solid ${BLUE_DIM}`, borderRadius: 6, padding: 8, cursor: 'pointer', color: BLUE, transition: 'all 0.3s' }}>
                            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Members panel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...card, cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} color={BLUE} /> Students ({activeRoom.members?.length || 0})</h3>
                        <button onClick={() => setShowAddMember(true)} style={{ ...btnOutline, padding: '0.5rem 1rem', fontSize: '0.6rem' }}><Plus size={12} /> Add</button>
                    </div>

                    <AnimatePresence>
                        {showAddMember && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
                                <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Student username" style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && addMember()} />
                                <button onClick={addMember} disabled={loading} style={{ ...btnPrimary, padding: '0 1rem' }}><Plus size={14} /></button>
                                <button onClick={() => setShowAddMember(false)} style={{ ...btnOutline, padding: '0 0.8rem' }}><X size={14} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {activeRoom.pending_members && activeRoom.pending_members.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Pending Approvals</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {activeRoom.pending_members.map(m => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(248, 113, 113, 0.05)', borderRadius: 6, border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{m.full_name || m.username}</div>
                                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)' }}>@{m.username}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => approveMember(m.id)} style={{ ...btnOutline, padding: '0.3rem 0.6rem', fontSize: '0.55rem', color: '#6ECB8A', borderColor: 'rgba(110,203,138,0.3)' }}>Approve</button>
                                            <button onClick={() => rejectMember(m.id)} style={{ ...btnOutline, padding: '0.3rem 0.6rem', fontSize: '0.55rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(activeRoom.members || []).length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem', textAlign: 'center', padding: '2rem 0' }}>No students yet. Share the room code!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {(activeRoom.members || []).map((m) => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(74,144,217,0.04)', borderRadius: 8, border: `1px solid ${BLUE_DIM}` }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.full_name || m.username}</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>@{m.username}</div>
                                    </div>
                                    <button onClick={() => removeMember(m.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', transition: 'color 0.3s' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Essays panel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...card, cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} color={BLUE} /> Submitted Essays</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(74,144,217,0.1)', padding: '0.2rem', borderRadius: 8 }}>
                            <button onClick={() => setEssayTab('active')} style={{ ...btnOutline, border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.6rem', color: essayTab === 'active' ? '#fff' : BLUE, background: essayTab === 'active' ? BLUE : 'transparent' }}>Active</button>
                            <button onClick={() => setEssayTab('history')} style={{ ...btnOutline, border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.6rem', color: essayTab === 'history' ? '#fff' : BLUE, background: essayTab === 'history' ? BLUE : 'transparent' }}>History</button>
                        </div>
                    </div>

                    {essayTab === 'history' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={clearHistory} disabled={loading || !(activeRoom.essays || []).filter(e => e.is_archived).length} style={{ ...btnOutline, padding: '0.4rem 0.8rem', fontSize: '0.6rem', color: 'rgba(239,68,68,0.8)', borderColor: 'rgba(239,68,68,0.3)' }}>
                                <Trash2 size={12} style={{ marginRight: 4 }} /> Clear History
                            </button>
                        </div>
                    )}

                    {(activeRoom.essays || []).filter(e => essayTab === 'history' ? e.is_archived : !e.is_archived).length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem', textAlign: 'center', padding: '2rem 0' }}>
                            {essayTab === 'history' ? 'No archived essays.' : 'No active essays submitted yet.'}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {(activeRoom.essays || []).filter(e => essayTab === 'history' ? e.is_archived : !e.is_archived).map((e) => (
                                <div key={e.id} onClick={() => openEssay(e.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(74,144,217,0.04)', borderRadius: 8, border: `1px solid ${BLUE_DIM}`, cursor: 'pointer', transition: 'all 0.3s' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{e.title}</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>by {e.full_name || e.username} · {new Date(e.submitted_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {e.is_archived && <span style={{ ...badge, background: 'rgba(100,100,100,0.15)', color: '#888' }}>Archived</span>}
                                        {e.reviewed_at ? (
                                            <span style={{ ...badge, background: 'rgba(110,203,138,0.15)', color: '#6ECB8A' }}><CheckCircle size={10} /> Reviewed</span>
                                        ) : (
                                            <span style={{ ...badge, background: 'rgba(240,168,50,0.15)', color: '#f0a832' }}><Eye size={10} /> Pending</span>
                                        )}
                                        <ChevronRight size={16} color="var(--muted)" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );

    /* ═══════════════════ ROOMS LIST VIEW ═══════════════════ */
    return (
        <div style={{ padding: '140px 8% 80px', minHeight: '100vh' }}>
            {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', top: 100, right: 40, zIndex: 9999, background: BLUE, color: '#fff', padding: '0.8rem 1.5rem', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{msg}</motion.div>}

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <BookOpen size={22} color={BLUE} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4em', color: BLUE }}>Teacher Dashboard</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem' }}>
                    Your Classrooms
                </h1>
                <p style={{ color: 'var(--text-soft)', fontSize: '1.1rem', maxWidth: 600, lineHeight: 1.8 }}>
                    Create rooms, add students, and review their essays with detailed feedback.
                </p>
            </motion.div>

            {/* Stats overview */}
            {stats && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { label: 'Rooms', value: stats.total_rooms, color: BLUE },
                            { label: 'Students', value: stats.total_students, color: '#6ECB8A' },
                            { label: 'Total Essays', value: stats.total_essays, color: 'var(--amber2)' },
                            { label: 'Reviewed', value: stats.reviewed, color: '#6ECB8A' },
                            { label: 'Pending', value: stats.pending, color: stats.pending > 0 ? '#f87171' : 'var(--muted)' },
                        ].map((s, i) => (
                            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                                style={{ ...card, cursor: 'default', textAlign: 'center', padding: '1.5rem' }}>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: '2.2rem', fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
                                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)' }}>{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Avg scores row */}
                    {stats.reviewed > 0 && (
                        <div style={{ ...card, cursor: 'default', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)' }}>Avg Scores Given</span>
                            <div style={{ display: 'flex', gap: '2.5rem' }}>
                                {['grammar', 'coherence', 'argument', 'overall'].map((k) => (
                                    <div key={k} style={{ textAlign: 'center' }}>
                                        <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 900, color: BLUE }}>{stats.avg_scores[k]}</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>{k}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent essays */}
                    {stats.recent_essays && stats.recent_essays.length > 0 && (
                        <div style={{ ...card, cursor: 'default', padding: '1.5rem 2rem' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <FileText size={14} color={BLUE} /> Recent Submissions
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {stats.recent_essays.map((e) => (
                                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${BLUE_DIM}` }}>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{e.title}</span>
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', marginLeft: 8 }}>by {e.full_name || e.username}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)' }}>{e.room_name}</span>
                                            {e.reviewed_at ? (
                                                <span style={{ ...badge, background: 'rgba(110,203,138,0.15)', color: '#6ECB8A', fontSize: '0.5rem' }}><CheckCircle size={9} /> {e.teacher_overall}</span>
                                            ) : (
                                                <span style={{ ...badge, background: 'rgba(240,168,50,0.12)', color: '#f0a832', fontSize: '0.5rem' }}><Eye size={9} /> Pending</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Create room */}
            <div style={{ marginBottom: '2rem' }}>
                {!showCreate ? (
                    <button onClick={() => setShowCreate(true)} style={btnPrimary}><Plus size={16} /> Create New Room</button>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, cursor: 'default', maxWidth: 500 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>New Classroom</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="Room Name" style={inputStyle} />
                            <input value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} placeholder="Description (optional)" style={inputStyle} />
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <button onClick={createRoom} disabled={loading} style={btnPrimary}>{loading ? 'Creating...' : 'Create Room'}</button>
                                <button onClick={() => setShowCreate(false)} style={btnOutline}><X size={14} /> Cancel</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Room grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {rooms.map((r, i) => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => openRoom(r.id)}
                        style={card}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 60px ${BLUE_GLOW}`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = BLUE_DIM; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{r.name}</h3>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, color: BLUE, letterSpacing: '0.1em' }}>{r.room_code}</span>
                        </div>
                        {r.description && <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', marginBottom: '1.2rem', lineHeight: 1.6 }}>{r.description}</p>}
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <span style={badge}><Users size={12} /> {r.student_count} students</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {rooms.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '6rem 0' }}>
                    <BookOpen size={48} color="var(--muted)" style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>No rooms yet. Create your first classroom!</p>
                </motion.div>
            )}
        </div>
    );
};

export default TeacherDashboard;

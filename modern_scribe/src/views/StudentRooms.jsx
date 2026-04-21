import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, ArrowLeft, Send, CheckCircle, Eye,
    FileText, LogIn, ChevronRight, Star, AlertCircle
} from 'lucide-react';
import { apiCall } from '../api';

const AMBER = 'var(--amber)';
const AMBER_DIM = 'var(--border)';

const card = {
    background: 'linear-gradient(135deg, rgba(212,130,10,0.06) 0%, rgba(14,15,18,0.82) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '2rem',
    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
};
const inputStyle = {
    width: '100%', padding: '1rem 1.2rem',
    background: 'rgba(212,130,10,0.04)', border: '1px solid var(--border)',
    color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.8rem',
    outline: 'none', borderRadius: 6,
};
const badge = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.15em', padding: '0.35rem 0.8rem', borderRadius: 100,
};
const btnPrimary = {
    fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    background: 'var(--amber)', color: '#000',
    border: 'none', padding: '1rem 2rem', borderRadius: 6,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 6px 20px rgba(212,130,10,0.25)', transition: 'all 0.3s',
};
const btnOutline = {
    ...btnPrimary, background: 'transparent', color: 'var(--amber)',
    border: '1px solid var(--border)', boxShadow: 'none',
};

const StudentRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [view, setView] = useState('list');    // list | room
    const [activeRoom, setActiveRoom] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [essayTitle, setEssayTitle] = useState('');
    const [essayContent, setEssayContent] = useState('');
    const [showJoin, setShowJoin] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState('info'); // info | error

    const fetchRooms = async () => { try { setRooms(await apiCall('/student/rooms')); } catch { } };
    useEffect(() => { fetchRooms(); }, []);
    useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); } }, [msg]);

    const joinRoom = async () => {
        if (!roomCode.trim()) return;
        setLoading(true);
        try {
            const res = await apiCall('/student/rooms/join', { method: 'POST', body: JSON.stringify({ room_code: roomCode.trim() }) });
            setMsg(res.message);
            setMsgType('info');
            setRoomCode('');
            setShowJoin(false);
            fetchRooms();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
        setLoading(false);
    };

    const openRoom = async (id) => {
        setLoading(true);
        try {
            const r = await apiCall(`/student/rooms/${id}`);
            setActiveRoom(r);
            setView('room');
        } catch (e) { setMsg(e.message); setMsgType('error'); }
        setLoading(false);
    };

    const submitEssay = async () => {
        if (!essayTitle.trim() || !essayContent.trim()) return;
        setLoading(true);
        try {
            await apiCall(`/student/rooms/${activeRoom.id}/essays`, {
                method: 'POST',
                body: JSON.stringify({ title: essayTitle, content: essayContent })
            });
            setMsg('Essay submitted successfully!');
            setMsgType('info');
            setEssayTitle('');
            setEssayContent('');
            setShowSubmit(false);
            openRoom(activeRoom.id);
        } catch (e) { setMsg(e.message); setMsgType('error'); }
        setLoading(false);
    };

    const Toast = () => msg ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 100, right: 40, zIndex: 9999, background: msgType === 'error' ? '#ef4444' : 'var(--amber)', color: msgType === 'error' ? '#fff' : '#000', padding: '0.8rem 1.5rem', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            {msgType === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />} {msg}
        </motion.div>
    ) : null;

    /* ═══════════════════ ROOM DETAIL VIEW ═══════════════════ */
    if (view === 'room' && activeRoom) return (
        <div style={{ padding: '140px 8% 80px', minHeight: '100vh' }}>
            <Toast />

            <button onClick={() => { setView('list'); fetchRooms(); }} style={{ ...btnOutline, marginBottom: '2rem', padding: '0.6rem 1.2rem', fontSize: '0.65rem' }}>
                <ArrowLeft size={14} /> My Rooms
            </button>

            {/* Room header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>{activeRoom.name}</h2>
                {activeRoom.description && <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{activeRoom.description}</p>}
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code: {activeRoom.room_code}</div>
            </motion.div>

            {/* Submit essay */}
            <div style={{ marginBottom: '2rem' }}>
                {!showSubmit ? (
                    <button onClick={() => setShowSubmit(true)} style={btnPrimary}><Send size={14} /> Submit Essay</button>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={18} color="var(--amber)" /> Submit Essay
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input value={essayTitle} onChange={(e) => setEssayTitle(e.target.value)} placeholder="Essay Title" style={inputStyle} />
                            <textarea value={essayContent} onChange={(e) => setEssayContent(e.target.value)} placeholder="Write your essay here..." rows={10}
                                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--body)', fontSize: '0.9rem', lineHeight: 1.8 }} />
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <button onClick={submitEssay} disabled={loading} style={btnPrimary}>{loading ? 'Submitting...' : 'Submit'}</button>
                                <button onClick={() => setShowSubmit(false)} style={btnOutline}>Cancel</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Essay list */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} color="var(--amber)" /> My Submissions ({activeRoom.essays?.length || 0})
                </h3>

                {(activeRoom.essays || []).length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
                        <FileText size={40} color="var(--muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>No essays submitted yet. Write your first one!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(activeRoom.essays || []).map((e, i) => (
                            <motion.div key={e.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ ...card }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4 }}>{e.title}</h4>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>{new Date(e.submitted_at).toLocaleDateString()}</div>
                                    </div>
                                    {e.reviewed_at ? (
                                        <span style={{ ...badge, background: 'rgba(110,203,138,0.15)', color: '#6ECB8A' }}><CheckCircle size={10} /> Reviewed</span>
                                    ) : (
                                        <span style={{ ...badge, background: 'rgba(240,168,50,0.12)', color: '#f0a832' }}><Eye size={10} /> Pending Review</span>
                                    )}
                                </div>

                                {/* Essay content preview */}
                                <p style={{ fontFamily: 'var(--body)', fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.7, marginBottom: '1rem', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {e.content?.substring(0, 200)}{e.content?.length > 200 ? '...' : ''}
                                </p>

                                {/* Teacher review */}
                                {e.reviewed_at && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        style={{ background: 'rgba(110,203,138,0.06)', border: '1px solid rgba(110,203,138,0.15)', borderRadius: 10, padding: '1.5rem', marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                                            <Star size={16} color="#6ECB8A" />
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6ECB8A', fontWeight: 700 }}>Teacher Review</span>
                                        </div>

                                        {/* Scores */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.2rem' }}>
                                            {[
                                                { label: 'Grammar', value: e.teacher_grammar },
                                                { label: 'Coherence', value: e.teacher_coherence },
                                                { label: 'Argument', value: e.teacher_argument },
                                                { label: 'Overall', value: e.teacher_overall },
                                            ].map((s) => (
                                                <div key={s.label} style={{ textAlign: 'center', padding: '0.8rem', background: 'rgba(110,203,138,0.06)', borderRadius: 8 }}>
                                                    <div style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', fontWeight: 900, color: '#6ECB8A' }}>{s.value}</div>
                                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Feedback text */}
                                        {e.teacher_review && (
                                            <p style={{ fontFamily: 'var(--body)', fontSize: '0.85rem', color: 'var(--text-soft)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                                {e.teacher_review}
                                            </p>
                                        )}
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', marginTop: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            Reviewed: {new Date(e.reviewed_at).toLocaleString()}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );

    /* ═══════════════════ ROOMS LIST VIEW ═══════════════════ */
    return (
        <div style={{ padding: '140px 8% 80px', minHeight: '100vh' }}>
            <Toast />

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <BookOpen size={22} color="var(--amber)" />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--amber)' }}>My Classrooms</span>
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem' }}>
                    Your Rooms
                </h1>
                <p style={{ color: 'var(--text-soft)', fontSize: '1.1rem', maxWidth: 600, lineHeight: 1.8 }}>
                    Join classrooms, submit essays, and receive teacher feedback.
                </p>
            </motion.div>

            {/* Join room */}
            <div style={{ marginBottom: '2rem' }}>
                {!showJoin ? (
                    <button onClick={() => setShowJoin(true)} style={btnPrimary}><LogIn size={14} /> Join Room</button>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, maxWidth: 400, display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Room Code</label>
                            <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" style={{ ...inputStyle, letterSpacing: '0.2em', fontWeight: 700, fontSize: '1rem', textAlign: 'center' }} onKeyDown={(e) => e.key === 'Enter' && joinRoom()} maxLength={6} />
                        </div>
                        <button onClick={joinRoom} disabled={loading} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>{loading ? 'Joining...' : 'Join'}</button>
                        <button onClick={() => setShowJoin(false)} style={{ ...btnOutline, padding: '1rem' }}>✕</button>
                    </motion.div>
                )}
            </div>

            {/* Room list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {rooms.map((r, i) => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => openRoom(r.id)}
                        style={{ ...card, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.transform = 'translateY(-6px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>{r.name}</h3>
                        {r.description && <p style={{ color: 'var(--text-soft)', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5 }}>{r.description}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>by {r.teacher_name}</span>
                            <ChevronRight size={16} color="var(--muted)" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {rooms.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '6rem 0' }}>
                    <BookOpen size={48} color="var(--muted)" style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>You haven't joined any rooms yet. Ask your teacher for a room code!</p>
                </motion.div>
            )}
        </div>
    );
};

export default StudentRooms;

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Sparkles, FileText, Target, Zap, Layers,
    Cpu, Loader2, BookOpen, Briefcase, Palette, FlaskConical,
    ShieldCheck, AlertTriangle, CheckCircle2, Info,
    MessageSquare, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiCall } from '../api';

// ─── Mode Config ────────────────────────────────────────────────────────────
const MODES = [
    {
        id: 'Standard',
        label: 'Standard',
        emoji: '⚖️',
        tagline: 'Balanced evaluation',
        icon: Zap,
        accent: '#D4820A',
        description: 'Well-rounded scoring across grammar, flow, and arguments. Great starting point for any essay.'
    },
    {
        id: 'Creative',
        label: 'Creative',
        emoji: '🎨',
        tagline: 'Narrative & style focus',
        icon: Palette,
        accent: '#B08CFF',
        description: 'Prioritises rich language, emotional impact, and creative expression over rigid structure.'
    },
    {
        id: 'Professional',
        label: 'Professional',
        emoji: '💼',
        tagline: 'Formal & precise',
        icon: Briefcase,
        accent: '#4FC3F7',
        description: 'Strict assessment of formal tone, professional vocabulary, and structural discipline.'
    },
    {
        id: 'Academic',
        label: 'Academic',
        emoji: '🎓',
        tagline: 'Research & citations',
        icon: BookOpen,
        accent: '#6ECB8A',
        description: 'Deep analysis of logic, evidence, citation quality, and originality for scholarly work.'
    },
];

const MODE_MAP = Object.fromEntries(MODES.map(m => [m.id, m]));
const scoreColor = (v) => v >= 80 ? '#6ECB8A' : v >= 60 ? '#D4820A' : '#ef4444';

const chatPersonas = {
    Standard: 'AI Writing Coach',
    Creative: 'Creative Mentor',
    Professional: 'Editorial Director',
    Academic: 'Academic Reviewer',
};

const chatPlaceholders = {
    Standard: 'Ask anything about your essay…',
    Creative: 'Ask for narrative or style tips…',
    Professional: 'Request formal editorial feedback…',
    Academic: 'Ask about citations, logic, or argument strength…',
};

// ─── Format AI response (simple markdown-like rendering) ──────────────────
const FormattedResponse = ({ text, accent }) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} style={{ height: '0.4rem' }} />;
                if (trimmed.startsWith('## '))
                    return <p key={i} style={{ fontFamily: 'var(--serif)', fontWeight: 800, fontSize: '0.95rem', color: accent, marginBottom: '0.2rem' }}>{trimmed.slice(3)}</p>;
                if (trimmed.startsWith('# '))
                    return <p key={i} style={{ fontFamily: 'var(--serif)', fontWeight: 900, fontSize: '1.05rem', color: accent }}>{trimmed.slice(2)}</p>;
                if (trimmed.startsWith('**') && trimmed.endsWith('**'))
                    return <p key={i} style={{ fontWeight: 700, color: 'var(--paper)', fontSize: '0.85rem' }}>{trimmed.slice(2, -2)}</p>;
                if (trimmed.startsWith('- ') || trimmed.startsWith('• '))
                    return (
                        <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                            <span style={{ color: accent, marginTop: '0.15rem', flexShrink: 0, fontSize: '0.7rem' }}>▸</span>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(240,235,224,0.8)', lineHeight: 1.7, margin: 0 }}>{trimmed.slice(2)}</p>
                        </div>
                    );
                return <p key={i} style={{ fontSize: '0.82rem', color: 'rgba(240,235,224,0.75)', lineHeight: 1.8, margin: 0 }}>{trimmed}</p>;
            })}
        </div>
    );
};

// ─── Academic Metric Row ──────────────────────────────────────────────────
const AcademicMetric = ({ label, value, suffix, icon: Icon, color, hint, invert }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Icon size={12} color={color} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.57rem', color: 'rgba(240,235,224,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 800, color }}>{value}{suffix}</span>
        </div>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.3rem' }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${invert ? Math.max(0, 100 - value * 2.5) : value}%` }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${color}50, ${color})` }}
            />
        </div>
        <p style={{ margin: 0, fontSize: '0.58rem', color: 'rgba(240,235,224,0.3)', fontFamily: 'var(--mono)' }}>{hint}</p>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────
const ModernEvaluate = () => {
    const [essay, setEssay] = useState('');
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState('Standard');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // AI Chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatExpanded, setChatExpanded] = useState(false);
    const [aiQuestion, setAiQuestion] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isAsking, setIsAsking] = useState(false);
    const chatEndRef = useRef(null);

    const activeMode = MODE_MAP[mode];
    const wordCount = essay.split(/\s+/).filter(Boolean).length;

    // Auto-scroll chat to latest
    useEffect(() => {
        if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, chatOpen]);

    // ── Plagiarism/Citation helpers ────────────────────────────────────────
    const simulatePlagiarismScore = (text) => {
        const words = text.toLowerCase().split(/\s+/);
        const bigrams = new Set(); let repeats = 0;
        for (let i = 0; i < words.length - 1; i++) {
            const bg = words[i] + ' ' + words[i + 1];
            if (bigrams.has(bg)) repeats++;
            bigrams.add(bg);
        }
        return Math.round(Math.min(repeats / Math.max(words.length, 1) * 300, 35));
    };
    const simulateCitationScore = (text) => {
        const cite = (text.match(/\([\w\s]+,\s*\d{4}\)/g) || []).length;
        return Math.min(cite * 15 + (wordCount > 50 ? 20 : 0), 100);
    };
    const simulateOriginalityScore = (text) => {
        const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
        return Math.round(Math.min(wordCount ? uniqueWords.size / wordCount * 130 : 0, 100));
    };

    // ── Evaluate ──────────────────────────────────────────────────────────
    const handleEvaluate = async () => {
        if (!essay.trim()) return;
        setIsEvaluating(true);
        setError('');
        setResult(null);
        try {
            const data = await apiCall('/evaluate', {
                method: 'POST',
                body: JSON.stringify({ title: title || 'Untitled Essay', content: essay, mode }),
            });
            const dims = [
                { label: 'Grammar', value: Math.round(data.grammar), icon: Layers },
                { label: 'Coherence', value: Math.round(data.coherence), icon: Zap },
                { label: 'Argumentation', value: Math.round(data.argumentation), icon: Target },
            ];
            setResult({
                score: Math.round(data.overall),
                dimensions: dims,
                feedback: data.feedback,
                mode,
                id: data.id,
                academic: mode === 'Academic' ? {
                    plagiarism: data.plagiarism_score ?? simulatePlagiarismScore(essay),
                    citation: data.citation_score ?? simulateCitationScore(essay),
                    originality: data.originality_score ?? simulateOriginalityScore(essay),
                } : null,
            });
            // Open chat after first evaluation
            if (!chatOpen) setChatOpen(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsEvaluating(false);
        }
    };

    // ── Ask AI ────────────────────────────────────────────────────────────
    const handleAskAI = async () => {
        if (!aiQuestion.trim() || !essay.trim()) return;
        const userMsg = aiQuestion.trim();
        setAiQuestion('');
        setChatHistory(h => [...h, { role: 'user', text: userMsg }]);
        setIsAsking(true);
        try {
            const data = await apiCall('/ask-ai', {
                method: 'POST',
                body: JSON.stringify({ question: userMsg, context: essay, mode }),
            });
            setChatHistory(h => [...h, { role: 'ai', text: data.response }]);
        } catch (err) {
            setChatHistory(h => [...h, { role: 'ai', text: `Error: ${err.message}` }]);
        } finally {
            setIsAsking(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    return (
        <section style={{
            padding: '130px 6% 120px',
            minHeight: '100vh',
            background: `radial-gradient(circle at 85% 8%, ${activeMode.accent}06 0%, transparent 50%)`,
            transition: 'background 0.6s ease',
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                {/* ── Header ───────────────────────────────────────────── */}
                <header style={{ marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginBottom: '0.8rem' }}
                    >
                        <Cpu size={12} color={activeMode.accent} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: activeMode.accent, textTransform: 'uppercase', letterSpacing: '0.4em', transition: 'color 0.4s' }}>
                            {activeMode.emoji} {activeMode.label} Mode · Analysis Engine
                        </span>
                    </motion.div>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Evaluate your <em style={{ color: activeMode.accent, transition: 'color 0.4s' }}>Essay.</em>
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: '520px', lineHeight: 1.7 }}>
                        {activeMode.description}
                    </p>
                </header>

                {/* ── Mode Pills ───────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    {MODES.map((m) => {
                        const active = mode === m.id;
                        return (
                            <motion.button
                                key={m.id}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => { setMode(m.id); setResult(null); }}
                                style={{
                                    padding: '0.65rem 1.4rem',
                                    background: active ? `${m.accent}18` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${active ? m.accent : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '100px',
                                    cursor: 'pointer',
                                    color: active ? m.accent : 'rgba(240,235,224,0.5)',
                                    fontFamily: 'var(--mono)',
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <span>{m.emoji}</span>
                                {m.label}
                                {active && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{ width: 6, height: 6, borderRadius: '50%', background: m.accent, display: 'inline-block' }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* ── Main Grid ────────────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: result ? '1fr 420px' : '1fr',
                    gap: '2.5rem',
                    alignItems: 'start',
                    transition: 'grid-template-columns 0.6s cubic-bezier(0.16,1,0.3,1)',
                }}>

                    {/* ── Editor Panel ───────────────────────────────────── */}
                    <motion.div layout className="glass" style={{
                        border: `1px solid ${activeMode.accent}25`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'border-color 0.4s',
                    }}>
                        {/* Editor toolbar */}
                        <div style={{
                            padding: '1.2rem 2rem',
                            borderBottom: `1px solid ${activeMode.accent}15`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: `${activeMode.accent}05`,
                        }}>
                            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                                <activeMode.icon size={15} color={activeMode.accent} />
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: activeMode.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                    {activeMode.label} Draft
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                <span style={{
                                    fontFamily: 'var(--mono)', fontSize: '0.58rem',
                                    color: wordCount < 80 ? '#ef4444' : wordCount < 200 ? '#D4820A' : '#6ECB8A',
                                    padding: '0.3rem 0.8rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '4px',
                                    transition: 'color 0.3s',
                                }}>
                                    {wordCount} words
                                </span>
                                {mode === 'Academic' && (
                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: '#6ECB8A', padding: '0.3rem 0.8rem', background: 'rgba(110,203,138,0.06)', border: '1px solid rgba(110,203,138,0.2)', borderRadius: '4px' }}>
                                        ⚗ Academic
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '2rem 2.5rem' }}>
                            {/* Title input */}
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Essay Title"
                                style={{
                                    width: '100%', padding: '0.6rem 0',
                                    background: 'transparent', border: 'none',
                                    borderBottom: `1px solid ${activeMode.accent}15`,
                                    color: activeMode.accent,
                                    fontFamily: 'var(--serif)', fontSize: '1.8rem',
                                    fontWeight: 800, outline: 'none',
                                    marginBottom: '1.8rem',
                                    transition: 'border-color 0.3s, color 0.4s',
                                }}
                            />

                            {/* Academic hint */}
                            <AnimatePresence>
                                {mode === 'Academic' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ overflow: 'hidden', marginBottom: '1.2rem' }}
                                    >
                                        <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(110,203,138,0.04)', border: '1px solid rgba(110,203,138,0.15)', borderRadius: '6px', display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                                            <Info size={12} color="#6ECB8A" style={{ marginTop: 2, flexShrink: 0 }} />
                                            <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(240,235,224,0.5)', lineHeight: 1.7, fontFamily: 'var(--mono)' }}>
                                                Add citations like <em style={{ color: '#6ECB8A' }}>(Author, Year)</em> to boost your Citation Score. Plagiarism is heuristic-simulated.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Textarea */}
                            <textarea
                                value={essay}
                                onChange={(e) => setEssay(e.target.value)}
                                placeholder="Start writing your essay here…"
                                style={{
                                    width: '100%', minHeight: '460px',
                                    background: 'transparent', border: 'none',
                                    color: 'rgba(240,235,224,0.88)',
                                    fontFamily: 'var(--body)', fontSize: '1.05rem',
                                    lineHeight: '2', outline: 'none', resize: 'none',
                                    opacity: isEvaluating ? 0.25 : 1,
                                    transition: 'opacity 0.4s',
                                }}
                            />

                            {/* Action row */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${activeMode.accent}12`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                {/* Word count hint */}
                                {wordCount < 80 && essay.length > 0 && (
                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#ef4444' }}>
                                        ⚠ Add {80 - wordCount} more words for a better score
                                    </span>
                                )}
                                <div style={{ flex: 1 }} />
                                {error && <span style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.6rem' }}>{error}</span>}
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleEvaluate}
                                    disabled={isEvaluating || !essay.trim()}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                                        padding: '0.9rem 2.5rem',
                                        background: isEvaluating ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${activeMode.accent}, ${activeMode.accent}AA)`,
                                        border: `1px solid ${activeMode.accent}60`,
                                        borderRadius: '6px',
                                        color: '#000',
                                        fontFamily: 'var(--mono)', fontSize: '0.7rem',
                                        fontWeight: 900, letterSpacing: '0.15em',
                                        textTransform: 'uppercase',
                                        cursor: isEvaluating || !essay.trim() ? 'not-allowed' : 'pointer',
                                        opacity: !essay.trim() ? 0.4 : 1,
                                        transition: 'all 0.35s ease',
                                    }}
                                >
                                    {isEvaluating ? (
                                        <><Loader2 size={15} className="animate-spin" style={{ color: activeMode.accent }} /> <span style={{ color: activeMode.accent }}>Analyzing…</span></>
                                    ) : (
                                        <>{activeMode.emoji} Evaluate Now <Send size={14} /></>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Results Sidebar ───────────────────────────────── */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                key="sidebar"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'sticky', top: '110px' }}
                            >
                                {/* Score card */}
                                <div className="glass" style={{
                                    padding: '2.2rem',
                                    border: `1px solid ${activeMode.accent}35`,
                                    borderRadius: '8px',
                                    background: `radial-gradient(circle at 50% 0%, ${activeMode.accent}08 0%, transparent 60%)`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1rem' }}>{activeMode.emoji}</span>
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.57rem', color: activeMode.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{activeMode.label} Score</span>
                                        </div>
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'var(--muted)' }}>#{result.id ?? 'N/A'}</span>
                                    </div>

                                    {/* Score circle */}
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                                                <motion.circle
                                                    cx="65" cy="65" r="56" fill="none"
                                                    stroke={scoreColor(result.score)} strokeWidth="6"
                                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                                                    animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - result.score / 100) }}
                                                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <motion.span
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.3, duration: 0.6 }}
                                                    style={{ fontFamily: 'var(--serif)', fontSize: '2.6rem', fontWeight: 900, color: scoreColor(result.score), lineHeight: 1 }}
                                                >
                                                    {result.score}
                                                </motion.span>
                                                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>/ 100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dimension bars */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                                        {result.dimensions.map((dim, i) => (
                                            <div key={dim.label}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'rgba(240,235,224,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{dim.label}</span>
                                                    <span style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 800, color: scoreColor(dim.value) }}>{dim.value}</span>
                                                </div>
                                                <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${dim.value}%` }}
                                                        transition={{ delay: 0.2 + i * 0.1, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                                                        style={{ height: '100%', background: `linear-gradient(90deg, ${activeMode.accent}50, ${activeMode.accent})` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Academic extras */}
                                {result.academic && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                        className="glass"
                                        style={{ padding: '1.8rem', border: '1px solid rgba(110,203,138,0.18)', borderRadius: '8px', background: 'rgba(110,203,138,0.025)' }}
                                    >
                                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1.4rem' }}>
                                            <FlaskConical size={13} color="#6ECB8A" />
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: '#6ECB8A', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Academic Checks</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                            <AcademicMetric label="Plagiarism Risk" value={result.academic.plagiarism} suffix="%" icon={result.academic.plagiarism < 20 ? ShieldCheck : AlertTriangle} color={result.academic.plagiarism < 20 ? '#6ECB8A' : result.academic.plagiarism < 35 ? '#D4820A' : '#ef4444'} hint={result.academic.plagiarism < 20 ? 'Looks original' : 'Review repeated phrases'} invert />
                                            <AcademicMetric label="Citations" value={result.academic.citation} suffix="/100" icon={CheckCircle2} color={result.academic.citation >= 60 ? '#6ECB8A' : '#D4820A'} hint="(Author, Year) style in-text refs" />
                                            <AcademicMetric label="Originality" value={result.academic.originality} suffix="%" icon={Sparkles} color={result.academic.originality >= 70 ? '#6ECB8A' : '#D4820A'} hint="Vocabulary diversity index" />
                                        </div>
                                        <p style={{ marginTop: '1rem', fontSize: '0.57rem', color: 'rgba(240,235,224,0.25)', fontFamily: 'var(--mono)' }}>* Heuristic estimates — not a formal plagiarism tool.</p>
                                    </motion.div>
                                )}

                                {/* Feedback card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: result.academic ? 0.4 : 0.25 }}
                                    className="glass"
                                    style={{ padding: '1.8rem', border: `1px solid ${activeMode.accent}12`, borderRadius: '8px' }}
                                >
                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
                                        <Sparkles size={13} color={activeMode.accent} />
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.57rem', color: activeMode.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI Feedback</span>
                                    </div>
                                    <p style={{ fontSize: '0.88rem', color: 'rgba(240,235,224,0.72)', lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'var(--serif)', margin: 0 }}>
                                        "{result.feedback}"
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Floating AI Chat Panel ────────────────────────────────── */}
            <div style={{
                position: 'fixed', bottom: '2rem', right: '2rem',
                zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem',
            }}>
                <AnimatePresence>
                    {chatOpen && (
                        <motion.div
                            key="chat-panel"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                width: chatExpanded ? '520px' : '380px',
                                background: 'rgba(10,11,14,0.97)',
                                border: `1px solid ${activeMode.accent}30`,
                                borderRadius: '12px',
                                boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${activeMode.accent}10`,
                                overflow: 'hidden',
                                transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Chat header */}
                            <div style={{
                                padding: '1rem 1.4rem',
                                borderBottom: `1px solid ${activeMode.accent}15`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: `${activeMode.accent}08`,
                            }}>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${activeMode.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <activeMode.icon size={13} color={activeMode.accent} />
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: activeMode.accent, letterSpacing: '0.1em' }}>{chatPersonas[mode]}</div>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'var(--muted)' }}>{activeMode.emoji} {activeMode.label} mode</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => setChatExpanded(e => !e)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem' }}>
                                        {chatExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </button>
                                    <button onClick={() => setChatOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Chat messages */}
                            <div style={{ height: chatExpanded ? '420px' : '280px', overflowY: 'auto', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'height 0.4s ease' }}>
                                {chatHistory.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.65rem', lineHeight: 1.8 }}>
                                        <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>{activeMode.emoji}</div>
                                        <div style={{ color: activeMode.accent, marginBottom: '0.4rem' }}>{chatPersonas[mode]}</div>
                                        <div>I'm here to help you improve your essay.<br />Ask me anything about your draft!</div>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        {msg.role === 'ai' && (
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${activeMode.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.6rem', flexShrink: 0, marginTop: '0.2rem' }}>
                                                <activeMode.icon size={10} color={activeMode.accent} />
                                            </div>
                                        )}
                                        <div style={{
                                            maxWidth: '88%',
                                            padding: '0.75rem 1rem',
                                            background: msg.role === 'user' ? `${activeMode.accent}18` : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${msg.role === 'user' ? activeMode.accent + '40' : 'rgba(255,255,255,0.06)'}`,
                                            borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        }}>
                                            {msg.role === 'user'
                                                ? <p style={{ fontSize: '0.78rem', color: 'var(--paper)', margin: 0, lineHeight: 1.6 }}>{msg.text}</p>
                                                : <FormattedResponse text={msg.text} accent={activeMode.accent} />
                                            }
                                        </div>
                                    </motion.div>
                                ))}
                                {isAsking && (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${activeMode.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <activeMode.icon size={10} color={activeMode.accent} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[0, 1, 2].map(j => (
                                                <motion.div key={j} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }}
                                                    style={{ width: 5, height: 5, borderRadius: '50%', background: activeMode.accent }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '0.8rem 1rem', borderTop: `1px solid ${activeMode.accent}10`, display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskAI()}
                                    placeholder={chatPlaceholders[mode]}
                                    disabled={!essay.trim()}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${activeMode.accent}20`,
                                        borderRadius: '8px',
                                        padding: '0.65rem 1rem',
                                        color: 'var(--paper)',
                                        fontFamily: 'var(--mono)',
                                        fontSize: '0.68rem',
                                        outline: 'none',
                                    }}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleAskAI}
                                    disabled={isAsking || !aiQuestion.trim() || !essay.trim()}
                                    style={{
                                        width: 36, height: 36, borderRadius: '8px',
                                        background: `${activeMode.accent}22`,
                                        border: `1px solid ${activeMode.accent}40`,
                                        color: activeMode.accent,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        opacity: isAsking || !aiQuestion.trim() || !essay.trim() ? 0.4 : 1,
                                    }}
                                >
                                    {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat toggle FAB */}
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setChatOpen(o => !o)}
                    style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: chatOpen ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${activeMode.accent}, ${activeMode.accent}CC)`,
                        border: `1px solid ${activeMode.accent}60`,
                        color: chatOpen ? activeMode.accent : '#000',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: chatOpen ? 'none' : `0 8px 24px ${activeMode.accent}40`,
                        transition: 'all 0.35s ease',
                        position: 'relative',
                    }}
                >
                    {chatOpen ? <X size={20} /> : <MessageSquare size={20} />}
                    {chatHistory.length > 0 && !chatOpen && (
                        <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#6ECB8A', border: '2px solid #07080a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: '0.45rem', color: '#000', fontWeight: 900 }}>
                            {chatHistory.filter(m => m.role === 'ai').length}
                        </div>
                    )}
                </motion.button>
            </div>
        </section>
    );
};

export default ModernEvaluate;

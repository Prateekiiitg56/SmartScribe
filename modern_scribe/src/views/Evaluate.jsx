import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Sparkles, FileText, Target, Zap, Layers,
    Cpu, Loader2, BookOpen, Briefcase, Palette, FlaskConical,
    ShieldCheck, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import { apiCall } from '../api';

// ─── Mode Config ────────────────────────────────────────────────────────────
const MODES = [
    {
        id: 'Standard',
        label: 'Balanced',
        tagline: 'General purpose analysis',
        icon: Zap,
        accent: '#D4820A',
        description: 'A well-rounded evaluation that equally weighs grammar, coherence, and argumentation. Best for general essays and assignments.'
    },
    {
        id: 'Creative',
        label: 'Artistic',
        tagline: 'Flow & narrative depth',
        icon: Palette,
        accent: '#B08CFF',
        description: 'Prioritises narrative richness, vocabulary variety, and emotional resonance. Structure rules are relaxed in favour of expressive flow.'
    },
    {
        id: 'Professional',
        label: 'Formal',
        tagline: 'Tone & structural integrity',
        icon: Briefcase,
        accent: '#4FC3F7',
        description: 'Stringent evaluation of formal tone, professional vocabulary, and rigid structure. Ideal for business writing and reports.'
    },
    {
        id: 'Academic',
        label: 'Rigorous',
        tagline: 'Logic, citations & originality',
        icon: BookOpen,
        accent: '#6ECB8A',
        description: 'Deep analysis of argumentative depth, evidentiary reasoning, citation simulation, and originality check. Best for research and thesis work.'
    },
];

const MODE_MAP = Object.fromEntries(MODES.map(m => [m.id, m]));

// ─── Score colour ─────────────────────────────────────────────────────────
const scoreColor = (v) => {
    if (v >= 80) return '#6ECB8A';
    if (v >= 60) return '#D4820A';
    return '#ef4444';
};


// ─── Component ────────────────────────────────────────────────────────────
const ModernEvaluate = () => {
    const [essay, setEssay] = useState('');
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState('Standard');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    const activeMode = MODE_MAP[mode];
    const wordCount = essay.split(/\s+/).filter(Boolean).length;

    // ── Evaluate ──────────────────────────────────────────────────────────
    const handleEvaluate = async () => {
        if (!essay.trim()) return;
        setIsEvaluating(true);
        setError('');
        setResult(null);

        try {
            const data = await apiCall('/evaluate', {
                method: 'POST',
                body: JSON.stringify({
                    title: title || 'Untitled Essay',
                    content: essay,
                    mode: mode,
                }),
            });

            // Build core dimensions
            const dims = [
                { label: 'Grammar', value: Math.round(data.grammar), icon: Layers },
                { label: 'Coherence', value: Math.round(data.coherence), icon: Zap },
                { label: 'Argumentation', value: Math.round(data.argumentation), icon: Target },
            ];

            // Academic-only extras
            const academic = mode === 'Academic' ? {
                plagiarism: data.plagiarism_score ?? simulatePlagiarismScore(essay),
                citation: data.citation_score ?? simulateCitationScore(essay),
                originality: data.originality_score ?? simulateOriginalityScore(essay),
            } : null;

            setResult({
                score: Math.round(data.overall),
                dimensions: dims,
                feedback: data.feedback,
                mode: mode,
                id: data.id,
                academic,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsEvaluating(false);
        }
    };

    // ── Plagiarism / Citation simulation (client-side heuristics) ──────────
    const simulatePlagiarismScore = (text) => {
        // Simple heuristic: long repeated n-grams suggest higher plagiarism risk
        const words = text.toLowerCase().split(/\s+/);
        const bigrams = new Set();
        let repeats = 0;
        for (let i = 0; i < words.length - 1; i++) {
            const bg = words[i] + ' ' + words[i + 1];
            if (bigrams.has(bg)) repeats++;
            bigrams.add(bg);
        }
        const ratio = words.length ? repeats / words.length : 0;
        return Math.round(Math.min(ratio * 300, 35)); // max 35% simulated
    };

    const simulateCitationScore = (text) => {
        const cite = (text.match(/\([\w\s]+,\s*\d{4}\)/g) || []).length;
        const score = Math.min(cite * 15, 100);
        return Math.max(score, wordCount > 50 ? 20 : 0);
    };

    const simulateOriginalityScore = (text) => {
        const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
        const ratio = wordCount ? uniqueWords.size / wordCount : 0;
        return Math.round(Math.min(ratio * 130, 100));
    };

    // ── Ask AI ────────────────────────────────────────────────────────────
    const handleAskAI = async () => {
        if (!aiQuestion.trim() || !essay.trim()) return;
        setIsAsking(true);
        try {
            const data = await apiCall('/ask-ai', {
                method: 'POST',
                body: JSON.stringify({ question: aiQuestion, context: essay }),
            });
            setAiResponse(data.response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAsking(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    return (
        <section style={{
            padding: '140px 6% 100px',
            minHeight: '100vh',
            background: 'radial-gradient(circle at 85% 8%, rgba(212,130,10,0.04) 0%, transparent 55%)',
        }}>
            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

                {/* ── Page Header ─────────────────────────────────────────── */}
                <header style={{ marginBottom: '3rem' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem' }}
                    >
                        <Cpu size={13} color="var(--amber)" />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.45em' }}>
                            Analysis Engine · {activeMode.label} Mode
                        </span>
                    </motion.div>
                    <h2 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.8rem' }}>
                        Craft your <em style={{ color: activeMode.accent, transition: 'color 0.4s' }}>Masterpiece.</em>
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '560px', lineHeight: 1.7 }}>
                        {activeMode.description}
                    </p>
                </header>

                {/* ── Mode Selector ────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
                    {MODES.map((m) => {
                        const active = mode === m.id;
                        return (
                            <motion.div
                                key={m.id}
                                whileHover={{ y: -3, scale: 1.01 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { setMode(m.id); setResult(null); }}
                                style={{
                                    padding: '1.4rem 1.6rem',
                                    background: active ? `${m.accent}12` : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${active ? m.accent : 'var(--border)'}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="mode-glow"
                                        style={{
                                            position: 'absolute', inset: 0,
                                            background: `radial-gradient(circle at 20% 50%, ${m.accent}10 0%, transparent 70%)`,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}
                                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                                    <m.icon size={15} color={active ? m.accent : 'var(--muted)'} style={{ transition: 'color 0.3s' }} />
                                    <span style={{
                                        fontFamily: 'var(--mono)', fontSize: '0.62rem',
                                        color: active ? m.accent : 'rgba(240,235,224,0.8)',
                                        textTransform: 'uppercase', letterSpacing: '0.12em',
                                        transition: 'color 0.3s',
                                    }}>{m.label}</span>
                                </div>
                                <p style={{ fontSize: '0.63rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{m.tagline}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Main Grid ────────────────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: result ? '1fr 440px' : '1fr',
                    gap: '3rem',
                    transition: 'grid-template-columns 0.7s cubic-bezier(0.16,1,0.3,1)',
                    alignItems: 'start',
                }}>

                    {/* ── Editor Panel ───────────────────────────────────────── */}
                    <motion.div
                        layout
                        className="glass"
                        style={{
                            padding: '3rem 3.5rem',
                            border: '1px solid var(--border)',
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 32px 100%, 0 calc(100% - 32px))',
                        }}
                    >
                        {/* Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: activeMode.accent, opacity: 0.7 }}>
                                <FileText size={17} />
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>MANUSCRIPT</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                <span style={{
                                    fontFamily: 'var(--mono)', fontSize: '0.58rem', color: wordCount < 80 ? '#ef4444' : 'var(--muted)',
                                    padding: '0.4rem 0.9rem', background: 'rgba(240,235,224,0.03)',
                                    border: '1px solid var(--border)', borderRadius: '2px', letterSpacing: '0.1em',
                                }}>
                                    {wordCount} WORDS
                                </span>
                                {mode === 'Academic' && (
                                    <span style={{
                                        fontFamily: 'var(--mono)', fontSize: '0.58rem', color: '#6ECB8A',
                                        padding: '0.4rem 0.9rem', background: 'rgba(110,203,138,0.05)',
                                        border: '1px solid rgba(110,203,138,0.2)', borderRadius: '2px', letterSpacing: '0.1em',
                                    }}>
                                        ⚗ ACADEMIC
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Essay Title"
                            style={{
                                width: '100%', padding: '0.8rem 0',
                                background: 'transparent', border: 'none',
                                borderBottom: `1px solid ${activeMode.accent}20`,
                                color: activeMode.accent, fontFamily: 'var(--serif)',
                                fontSize: '2rem', fontWeight: 800, outline: 'none',
                                marginBottom: '2rem', transition: 'border-color 0.3s',
                            }}
                        />

                        {/* Textarea */}
                        <textarea
                            value={essay}
                            onChange={(e) => setEssay(e.target.value)}
                            placeholder="Begin your narrative here…"
                            style={{
                                width: '100%', minHeight: '520px',
                                background: 'transparent', border: 'none',
                                color: 'rgba(240,235,224,0.88)', fontFamily: 'var(--body)',
                                fontSize: '1.15rem', lineHeight: '2', outline: 'none',
                                resize: 'none',
                                opacity: isEvaluating ? 0.25 : 1, transition: 'opacity 0.4s',
                            }}
                        />

                        {/* Academic hint banner */}
                        <AnimatePresence>
                            {mode === 'Academic' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    style={{
                                        margin: '1.5rem 0',
                                        padding: '1rem 1.5rem',
                                        background: 'rgba(110,203,138,0.04)',
                                        border: '1px solid rgba(110,203,138,0.15)',
                                        borderRadius: '4px',
                                        display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                                    }}
                                >
                                    <Info size={13} color="#6ECB8A" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(240,235,224,0.55)', lineHeight: 1.7, fontFamily: 'var(--mono)' }}>
                                        <strong style={{ color: '#6ECB8A' }}>Academic Mode active.</strong> Add in-text citations like <em>(Author, Year)</em> to boost your Citation Score. The Plagiarism Score is a heuristic simulation; use a dedicated tool for formal submission checks.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* AI response panel */}
                        <AnimatePresence>
                            {aiResponse && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    style={{
                                        margin: '2rem 0',
                                        padding: '1.8rem',
                                        background: 'rgba(212,130,10,0.02)',
                                        borderLeft: '2px solid var(--amber)',
                                        borderRadius: '2px',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', color: 'var(--amber2)', marginBottom: '0.8rem', fontSize: '0.65rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                        <Sparkles size={13} /> AI INSIGHT
                                    </div>
                                    <p style={{ color: 'var(--paper)', lineHeight: '1.85', fontSize: '1rem', fontStyle: 'italic', fontFamily: 'var(--serif)', margin: 0 }}>{aiResponse}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer bar */}
                        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    placeholder="Ask the AI about your essay…"
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        padding: '0.9rem 3rem 0.9rem 1.3rem',
                                        color: 'var(--paper)', fontFamily: 'var(--mono)',
                                        fontSize: '0.72rem', borderRadius: '3px', outline: 'none',
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                />
                                <button
                                    onClick={handleAskAI}
                                    disabled={isAsking || !aiQuestion.trim() || !essay.trim()}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--amber)', cursor: 'pointer', opacity: isAsking ? 0.4 : 1 }}
                                >
                                    {isAsking ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={17} />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0 }}>
                                {error && <span style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', maxWidth: '180px' }}>{error}</span>}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleEvaluate}
                                    disabled={isEvaluating || !essay.trim()}
                                    className="btn-premium"
                                    style={{
                                        opacity: isEvaluating || !essay.trim() ? 0.45 : 1,
                                        display: 'flex', alignItems: 'center', gap: '1.2rem',
                                        padding: '1rem 3rem',
                                        background: `linear-gradient(135deg, ${activeMode.accent}CC, ${activeMode.accent}88)`,
                                        border: `1px solid ${activeMode.accent}60`,
                                        transition: 'all 0.4s ease',
                                    }}
                                >
                                    {isEvaluating ? (
                                        <><Loader2 size={16} className="animate-spin" /> ANALYZING…</>
                                    ) : (
                                        <>ANALYZE <Send size={16} /></>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Results Sidebar ───────────────────────────────────── */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                key="result-sidebar"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                                style={{ alignSelf: 'start', position: 'sticky', top: '120px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                {/* Score card */}
                                <div
                                    className="glass"
                                    style={{
                                        padding: '2.8rem',
                                        border: `1px solid ${activeMode.accent}40`,
                                        clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                                        background: `radial-gradient(circle at 50% 0%, ${activeMode.accent}08 0%, transparent 65%)`,
                                    }}
                                >
                                    {/* Mode badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                            <activeMode.icon size={13} color={activeMode.accent} />
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: activeMode.accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{activeMode.label} Mode</span>
                                        </div>
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.15em' }}>SS-{result.id ?? 'N/A'}</span>
                                    </div>

                                    {/* Big score */}
                                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>Proficiency Score</div>
                                        <motion.div
                                            initial={{ scale: 0.6, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                            style={{ position: 'relative', display: 'inline-block' }}
                                        >
                                            <span style={{
                                                fontFamily: 'var(--serif)', fontSize: '6rem', fontWeight: 900,
                                                color: scoreColor(result.score), lineHeight: 0.9, letterSpacing: '-0.05em',
                                            }}>{result.score}</span>
                                            <span style={{ position: 'absolute', top: 4, right: -22, fontFamily: 'var(--mono)', fontSize: '1.3rem', color: scoreColor(result.score), opacity: 0.5 }}>%</span>
                                        </motion.div>
                                    </div>

                                    {/* Dimension bars */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        {result.dimensions.map((dim, i) => (
                                            <div key={dim.label}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                        <div style={{ width: 28, height: 28, background: `${activeMode.accent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                                                            <dim.icon size={14} color={activeMode.accent} />
                                                        </div>
                                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'rgba(240,235,224,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{dim.label}</span>
                                                    </div>
                                                    <span style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 800, color: scoreColor(dim.value) }}>{dim.value}<span style={{ fontSize: '0.75rem', opacity: 0.5 }}>%</span></span>
                                                </div>
                                                <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${dim.value}%` }}
                                                        transition={{ delay: 0.2 + i * 0.12, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                                                        style={{ height: '100%', background: `linear-gradient(90deg, ${activeMode.accent}60, ${activeMode.accent})`, borderRadius: '4px' }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Academic extras card */}
                                {result.academic && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className="glass"
                                        style={{
                                            padding: '2.2rem',
                                            border: '1px solid rgba(110,203,138,0.2)',
                                            borderRadius: '6px',
                                            background: 'rgba(110,203,138,0.03)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginBottom: '1.8rem' }}>
                                            <FlaskConical size={14} color="#6ECB8A" />
                                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#6ECB8A', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Academic Metrics</span>
                                        </div>

                                        {/* Plagiarism */}
                                        <AcademicMetric
                                            label="Plagiarism Risk"
                                            value={result.academic.plagiarism}
                                            suffix="%"
                                            icon={result.academic.plagiarism < 20 ? ShieldCheck : AlertTriangle}
                                            color={result.academic.plagiarism < 20 ? '#6ECB8A' : result.academic.plagiarism < 35 ? '#D4820A' : '#ef4444'}
                                            hint={result.academic.plagiarism < 20 ? 'Low risk — looks original' : result.academic.plagiarism < 35 ? 'Moderate — review highlighted phrases' : 'High risk — significant overlap detected'}
                                            invert
                                        />

                                        <div style={{ height: '1px', background: 'rgba(110,203,138,0.08)', margin: '1.5rem 0' }} />

                                        {/* Citation */}
                                        <AcademicMetric
                                            label="Citation Score"
                                            value={result.academic.citation}
                                            suffix="/100"
                                            icon={CheckCircle2}
                                            color={result.academic.citation >= 60 ? '#6ECB8A' : result.academic.citation >= 30 ? '#D4820A' : '#ef4444'}
                                            hint={result.academic.citation >= 60 ? 'Well-cited' : 'Add more (Author, Year) citations to improve'}
                                        />

                                        <div style={{ height: '1px', background: 'rgba(110,203,138,0.08)', margin: '1.5rem 0' }} />

                                        {/* Originality */}
                                        <AcademicMetric
                                            label="Originality Index"
                                            value={result.academic.originality}
                                            suffix="%"
                                            icon={Sparkles}
                                            color={result.academic.originality >= 70 ? '#6ECB8A' : '#D4820A'}
                                            hint="Vocabulary diversity relative to essay length"
                                        />

                                        <p style={{ marginTop: '1.5rem', fontSize: '0.6rem', color: 'rgba(240,235,224,0.3)', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
                                            * Plagiarism &amp; citation metrics are heuristic simulations. Use a certified tool for formal checks.
                                        </p>
                                    </motion.div>
                                )}

                                {/* Feedback card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: result.academic ? 0.45 : 0.3, duration: 0.5 }}
                                    className="glass"
                                    style={{
                                        padding: '2.2rem',
                                        border: '1px solid rgba(212,130,10,0.1)',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginBottom: '1.2rem' }}>
                                        <Sparkles size={13} color="var(--amber2)" />
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--amber2)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Critical Feedback</span>
                                    </div>
                                    <p style={{ fontSize: '0.95rem', color: 'rgba(240,235,224,0.7)', lineHeight: 1.9, fontStyle: 'italic', fontFamily: 'var(--serif)', margin: 0 }}>
                                        "{result.feedback}"
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

// ── Academic Metric Row ─────────────────────────────────────────────────────
const AcademicMetric = ({ label, value, suffix, icon: Icon, color, hint, invert }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Icon size={13} color={color} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'rgba(240,235,224,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 800, color }}>{value}{suffix}</span>
        </div>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${invert ? Math.max(0, 100 - value * 2.5) : value}%` }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${color}60, ${color})` }}
            />
        </div>
        <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(240,235,224,0.35)', fontFamily: 'var(--mono)' }}>{hint}</p>
    </div>
);

export default ModernEvaluate;

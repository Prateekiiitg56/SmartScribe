import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, Target, Zap, Layers, Cpu, Loader2 } from 'lucide-react';
import { apiCall } from '../api';

const ModernEvaluate = () => {
    const [essay, setEssay] = useState('');
    const [title, setTitle] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    const handleEvaluate = async () => {
        if (!essay.trim()) return;
        setIsEvaluating(true);
        setError('');

        try {
            const data = await apiCall('/evaluate', {
                method: 'POST',
                body: JSON.stringify({
                    title: title || "Untitled Essay",
                    content: essay
                })
            });

            setResult({
                score: Math.round(data.overall),
                dimensions: [
                    { label: 'Grammar', value: Math.round(data.grammar), icon: Layers },
                    { label: 'Coherence', value: Math.round(data.coherence), icon: Zap },
                    { label: 'Argumentation', value: Math.round(data.argumentation), icon: Target }
                ],
                feedback: data.feedback,
                id: data.id
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleAskAI = async () => {
        if (!aiQuestion.trim() || !essay.trim()) return;
        setIsAsking(true);
        try {
            const data = await apiCall('/ask-ai', {
                method: 'POST',
                body: JSON.stringify({
                    question: aiQuestion,
                    context: essay
                })
            });
            setAiResponse(data.response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <section style={{ padding: '140px 8% 80px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 90% 10%, rgba(212, 130, 10, 0.03) 0%, transparent 50%)' }}>
            <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
                <header style={{ marginBottom: '4rem' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.2rem' }}
                    >
                        <Cpu size={14} color="var(--amber)" />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.4em' }}>ANALYSIS ENGINE</span>
                    </motion.div>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>Craft your <em>Masterpiece.</em></h2>
                    <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: '600px', lineHeight: 1.6 }}>Our neural network analyzes your prose for structural integrity and semantic depth.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 420px' : '1fr', gap: '4rem', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', alignItems: 'start' }}>
                    {/* Editor Area */}
                    <motion.div
                        layout
                        className="glass"
                        style={{ padding: '3.5rem', position: 'relative', border: '1px solid var(--border)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30px 100%, 0 calc(100% - 30px))' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--amber)', opacity: 0.6, alignItems: 'center' }}>
                                <FileText size={18} />
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>MANUSCRIPT</span>
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--paper)', padding: '0.5rem 1rem', background: 'rgba(240,235,224,0.03)', border: '1px solid var(--border)', borderRadius: '2px', letterSpacing: '0.1em' }}>
                                {essay.split(/\s+/).filter(x => x).length} WORDS
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Essay Title"
                                style={{
                                    width: '100%',
                                    padding: '1rem 0',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(212,130,10,0.1)',
                                    color: 'var(--amber2)',
                                    fontFamily: 'var(--serif)',
                                    fontSize: '2.2rem',
                                    fontWeight: 800,
                                    outline: 'none',
                                    marginBottom: '1rem'
                                }}
                            />
                        </div>

                        <textarea
                            value={essay}
                            onChange={(e) => setEssay(e.target.value)}
                            placeholder="Begin your narrative here..."
                            style={{
                                width: '100%',
                                minHeight: '650px',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(240,235,224,0.9)',
                                fontFamily: 'var(--body)',
                                fontSize: '1.2rem',
                                lineHeight: '2',
                                outline: 'none',
                                resize: 'none',
                                opacity: isEvaluating ? 0.3 : 1,
                                transition: 'opacity 0.4s'
                            }}
                        />

                        <AnimatePresence>
                            {aiResponse && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    style={{ margin: '3rem 0', padding: '2rem', background: 'rgba(212,130,10,0.02)', borderLeft: '2px solid var(--amber)', borderTop: '1px solid rgba(212,130,10,0.05)', borderRadius: '2px' }}
                                >
                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--amber2)', marginBottom: '1rem', fontSize: '0.7rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                        <Sparkles size={14} /> AI RESPONSE
                                    </div>
                                    <p style={{ color: 'var(--paper)', lineHeight: '1.8', fontSize: '1.05rem', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>{aiResponse}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    placeholder="Interrogate the AI..."
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem 1.5rem', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.75rem', borderRadius: '2px', outline: 'none' }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                                />
                                <button
                                    onClick={handleAskAI}
                                    disabled={isAsking || !aiQuestion.trim() || !essay.trim()}
                                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--amber)', cursor: 'pointer', opacity: isAsking ? 0.5 : 1 }}
                                >
                                    {isAsking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={18} />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                                {error && <span style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase' }}>{error}</span>}
                                <button
                                    onClick={handleEvaluate}
                                    disabled={isEvaluating || !essay.trim()}
                                    className="btn-premium"
                                    style={{ opacity: isEvaluating || !essay.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.1rem 3.5rem' }}
                                >
                                    {isEvaluating ? 'PROCESSING...' : 'ANALYZE'}
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Result Sidebar */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                className="glass"
                                style={{ padding: '3rem', border: '1px solid var(--border)', alignSelf: 'start', position: 'sticky', top: '120px', clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '2rem' }}>Proficiency Score</div>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <div style={{ fontFamily: 'var(--serif)', fontSize: '6.5rem', fontWeight: 900, color: 'var(--amber)', lineHeight: 0.9, letterSpacing: '-0.05em' }}>{result.score}</div>
                                        <div style={{ position: 'absolute', top: 5, right: -25, fontFamily: 'var(--mono)', fontSize: '1.4rem', color: 'var(--amber)', opacity: 0.4 }}>%</div>
                                    </div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '2rem', letterSpacing: '0.2em' }}>LOG ID: SS-{result.id || 'N/A'}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
                                    {result.dimensions.map((dim, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', alignItems: 'flex-end' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <div style={{ width: 32, height: 32, background: 'rgba(212,130,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                                                        <dim.icon size={16} />
                                                    </div>
                                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'rgba(240,235,224,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{dim.label}</span>
                                                </div>
                                                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--paper)', fontWeight: 800 }}>{dim.value}%</span>
                                            </div>
                                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.03)', width: '100%', position: 'relative', borderRadius: '4px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${dim.value}%` }}
                                                    transition={{ delay: 0.3 + i * 0.1, duration: 2, ease: [0.16, 1, 0.3, 1] }}
                                                    style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'linear-gradient(90deg, var(--amber3), var(--amber))' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '4.5rem', padding: '2.5rem', background: 'rgba(240,235,224,0.02)', border: '1px solid rgba(212,130,10,0.08)', borderRadius: '2px' }}>
                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--amber2)', marginBottom: '1.2rem' }}>
                                        <Sparkles size={14} />
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.2em' }}>CRITICAL FEEDBACK</span>
                                    </div>
                                    <p style={{ fontSize: '1rem', color: 'rgba(240,235,224,0.7)', lineHeight: '1.8', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>"{result.feedback}"</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default ModernEvaluate;

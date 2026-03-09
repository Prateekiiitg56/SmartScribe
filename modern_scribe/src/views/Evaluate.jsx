import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, Target, Zap, Layers, Cpu } from 'lucide-react';
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
                score: data.overall,
                dimensions: [
                    { label: 'Grammar', value: data.grammar, icon: Layers },
                    { label: 'Coherence', value: data.coherence, icon: Zap },
                    { label: 'Strength', value: data.argumentation, icon: Target }
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
        <section style={{ padding: '140px 8% 80px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 90% 10%, rgba(212, 130, 10, 0.02) 0%, transparent 40%)' }}>
            <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
                <header style={{ marginBottom: '4rem' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.2rem' }}
                    >
                        <Cpu size={14} color="var(--amber)" />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.4em' }}>EVALUATE ESSAY</span>
                    </motion.div>
                    <h2 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>New <em>Essay.</em></h2>
                    <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: '600px', lineHeight: 1.6 }}>Get instant feedback on your writing quality and grammar.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 450px' : '1fr', gap: '3.5rem', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {/* Editor Area */}
                    <motion.div
                        layout
                        className="glass"
                        style={{ padding: '3rem', position: 'relative', border: '1px solid var(--border)', borderRadius: '2px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '1rem', color: 'rgba(240,235,224,0.4)', alignItems: 'center' }}>
                                <FileText size={18} />
                                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>CONTENT</span>
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--amber)', padding: '0.4rem 0.8rem', background: 'rgba(212,130,10,0.05)', borderRadius: '20px' }}>
                                {essay.split(/\s+/).filter(x => x).length} WORDS
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Title"
                                style={{
                                    width: '100%',
                                    padding: '1rem 0',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--amber)',
                                    fontFamily: 'var(--serif)',
                                    fontSize: '1.8rem',
                                    fontWeight: 800,
                                    outline: 'none',
                                    marginBottom: '1rem'
                                }}
                            />
                        </div>

                        <textarea
                            value={essay}
                            onChange={(e) => setEssay(e.target.value)}
                            placeholder="Start typing your essay..."
                            style={{
                                width: '100%',
                                minHeight: '600px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--paper)',
                                fontFamily: 'var(--body)',
                                fontSize: '1.15rem',
                                lineHeight: '1.9',
                                outline: 'none',
                                resize: 'none',
                                opacity: isEvaluating ? 0.3 : 1,
                                transition: 'opacity 0.4s'
                            }}
                        />

                        {aiResponse && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(212,130,10,0.05)', borderLeft: '3px solid var(--amber)', fontFamily: 'var(--serif)' }}
                            >
                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--amber)', marginBottom: '0.8rem', fontSize: '0.7rem', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                                    <Sparkles size={14} /> AI Insight
                                </div>
                                <p style={{ color: 'var(--paper)', lineHeight: '1.6' }}>{aiResponse}</p>
                            </motion.div>
                        )}

                        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    placeholder="Ask AI about your essay..."
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.8rem 1.2rem', color: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: '0.75rem', borderRadius: '4px', outline: 'none' }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                                />
                                <button
                                    onClick={handleAskAI}
                                    disabled={isAsking || !aiQuestion.trim() || !essay.trim()}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--amber)', cursor: 'pointer', opacity: isAsking ? 0.5 : 1 }}
                                >
                                    {isAsking ? '...' : <Sparkles size={16} />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                {error && <span style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>ERROR: {error}</span>}
                                <button
                                    onClick={handleEvaluate}
                                    disabled={isEvaluating || !essay.trim()}
                                    className="btn-premium"
                                    style={{ opacity: isEvaluating || !essay.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '1.2rem' }}
                                >
                                    {isEvaluating ? 'PROGRESSING...' : 'EVALUATE'}
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Result Sidebar */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                className="glass"
                                style={{ padding: '3rem', border: '1px solid var(--border)', alignSelf: 'start', position: 'sticky', top: '120px' }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>Total Score</div>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <div style={{ fontFamily: 'var(--serif)', fontSize: '6rem', fontWeight: 900, color: 'var(--amber2)', lineHeight: 1 }}>{result.score}</div>
                                        <div style={{ position: 'absolute', top: -10, right: -25, fontFamily: 'var(--mono)', fontSize: '1.2rem', color: 'var(--amber)', opacity: 0.5 }}>%</div>
                                    </div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--paper)', marginTop: '1.5rem', letterSpacing: '0.1em' }}>ID: #{result.id || '---'}</div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                                    {result.dimensions.map((dim, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                    <dim.icon size={14} color="var(--muted)" />
                                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'rgba(240,235,224,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{dim.label}</span>
                                                </div>
                                                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--amber)', fontWeight: 700 }}>{dim.value}%</span>
                                            </div>
                                            <div style={{ height: '2px', background: 'rgba(212,130,10,0.05)', width: '100%', position: 'relative' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${dim.value}%` }}
                                                    transition={{ delay: 0.5 + i * 0.1, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                                    style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--amber)', boxShadow: '0 0 15px rgba(212,130,10,0.3)' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(212,130,10,0.03)', border: '1px solid rgba(212,130,10,0.1)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: -10, left: 20, background: 'var(--ink)', padding: '0 10px', display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--amber2)' }}>
                                        <Sparkles size={14} />
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>AI FEEDBACK</span>
                                    </div>
                                    <p style={{ fontSize: '1rem', color: 'rgba(240,235,224,0.8)', lineHeight: '1.7', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>"{result.feedback}"</p>
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

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Copy, RefreshCw, Download, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { generateContent, historyAPI } from '../services/api';
import Logo from '../components/ui/Logo';
import { useNavigate } from 'react-router-dom';

// ── Download AI Image ──────────────────────────────────────────────────────────
async function downloadAIImage(imageUrl, title) {
    if (!imageUrl) { toast.error('No AI image to download'); return; }
    const filename = `${title || 'infographic'}.png`;
    try {
        toast.loading('Preparing download...', { id: 'dl' });

        // gpt-image-1 returns base64 data URLs — download directly in browser
        if (imageUrl.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = imageUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Image downloaded!', { id: 'dl' });
            return;
        }

        // dall-e-3 returns CDN URLs — use backend proxy to bypass CORS
        const proxyUrl = `http://localhost:5000/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
        toast.success('Image downloaded!', { id: 'dl' });
    } catch { toast.error('Download failed — try right-clicking the image to save', { id: 'dl' }); }
}


// ── Visual Infographic Renderer ────────────────────────────────────────────────
function InfographicRenderer({ content, title }) {
    const infographic = content?.infographic;
    const categories = infographic?.categories || [];

    if (!categories.length) {
        // Fallback: render hook/body/cta as styled text
        return (
            <div style={{ fontFamily: 'Georgia, serif', lineHeight: 1.8 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{content?.hook}</p>
                <p style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{content?.body}</p>
                <p style={{ fontSize: 14, fontStyle: 'italic', color: '#475569', marginBottom: 12 }}>{content?.cta}</p>
                <p style={{ fontSize: 13, color: '#c54444', fontWeight: 600 }}>{content?.hashtags?.join(' ')}</p>
            </div>
        );
    }

    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || content?.hook;

    return (
        <div style={{
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            background: 'linear-gradient(145deg, #fafafa 0%, #f0f4ff 100%)',
            borderRadius: 20,
            overflow: 'hidden',
            border: '2px solid #f8e6e6',
        }}>
            {/* ── TITLE BANNER ── */}
            <div style={{
                background: 'linear-gradient(135deg, #4d0000, #660000)',
                padding: '24px 28px 20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 30, padding: '4px 16px', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#e5a3a3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>📊 AI Infographic</span>
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px', lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {infTitle}
                    </h1>
                    <p style={{ fontSize: 13, color: '#f0c7c7', margin: 0, lineHeight: 1.5 }}>{infSubtitle}</p>
                </div>
            </div>

            {/* ── CATEGORY GRID ── */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {categories.map((cat, ci) => {
                    const color = cat.color || ['#c54444', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'][ci % 5];
                    const nodes = cat.nodes || [];
                    return (
                        <motion.div
                            key={ci}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.1, duration: 0.35 }}
                            style={{
                                borderRadius: 16,
                                border: `2px solid ${color}30`,
                                overflow: 'hidden',
                                boxShadow: `0 2px 12px ${color}15`,
                            }}
                        >
                            {/* Category Header */}
                            <div style={{
                                background: color,
                                padding: '11px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: 0.5 }}>
                                    {cat.label?.toUpperCase()}
                                </span>
                                <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 900, color: 'white' }}>{ci + 1}</span>
                                </div>
                            </div>

                            {/* Nodes Grid */}
                            <div style={{
                                background: `${color}08`,
                                padding: '14px 16px',
                                display: 'grid',
                                gridTemplateColumns: nodes.length > 2 ? 'repeat(3, 1fr)' : `repeat(${nodes.length}, 1fr)`,
                                gap: 10,
                            }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{
                                        background: 'white',
                                        borderRadius: 12,
                                        padding: '11px 13px',
                                        border: `1.5px solid ${color}25`,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                                            background: color, borderRadius: '2px 0 0 2px',
                                        }} />
                                        <div style={{ paddingLeft: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', lineHeight: 1.4, marginBottom: 3 }}>
                                                {node.label}
                                            </div>
                                            {node.sublabel && (
                                                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                                                    {node.sublabel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── HOOK QUOTE ── */}
            <div style={{ padding: '0 20px 16px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #4d0000, #660000)',
                    borderRadius: 14,
                    padding: '14px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                }}>
                    <span style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}>💡</span>
                    <div>
                        <p style={{ fontSize: 13, color: '#f0c7c7', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>KEY INSIGHT</p>
                        <p style={{ fontSize: 13, color: 'white', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>{content?.hook}</p>
                    </div>
                </div>
            </div>

            {/* ── CTA ── */}
            <div style={{ padding: '0 20px 14px' }}>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', border: '1.5px solid #bbf7d0', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <p style={{ fontSize: 13, color: '#065f46', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{content?.cta}</p>
                </div>
            </div>

            {/* ── HASHTAGS ── */}
            {content?.hashtags?.length > 0 && (
                <div style={{ padding: '0 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {content.hashtags.map((tag, i) => (
                        <span key={i} style={{
                            padding: '5px 12px', borderRadius: 20,
                            background: 'linear-gradient(135deg, #f8e6e6, #ddd6fe)',
                            color: '#4338ca', fontSize: 12, fontWeight: 700,
                        }}>{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Generator Page ────────────────────────────────────────────────────────
export default function GeneratorPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentHistoryId, setCurrentHistoryId] = useState(null);
    const [formData, setFormData] = useState({ title: '', tone: 'Professional', audience: '' });
    const [infographicStyle, setInfographicStyle] = useState('Whiteboard');
    const [showPostDetails, setShowPostDetails] = useState(true);
    const [result, setResult] = useState(null);

    const STYLES = [
        { id: 'Whiteboard', label: 'Whiteboard Sketch', icon: '🎨', desc: 'Hand-drawn marker style' },
        { id: 'Corporate Modern', label: 'Corporate Modern', icon: '🏢', desc: 'Clean, professional digital' },
        { id: 'Executive Guide', label: 'Executive Guide', icon: '📊', desc: 'Stacked vibrant guide' },
        { id: 'Handwritten Notes', label: 'Handwritten Notes', icon: '✍️', desc: 'Pen on notebook paper' },
    ];

    const loadHistoryItem = useCallback(async (id) => {
        setCurrentHistoryId(id);
        try {
            const data = await historyAPI.getById(id);
            const item = data.item;
            setFormData({ title: item.title, tone: item.tone || 'Professional', audience: item.audience || '' });
            setResult({ content: item.result });
        } catch { toast.error('Could not load history item'); }
    }, []);

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (!formData.title.trim()) { toast.error('Please enter a topic'); return; }
        setLoading(true); setResult(null); setCurrentHistoryId(null);
        try {
            const response = await generateContent({ ...formData, style: infographicStyle });
            if (response?.status === 'success') {
                setResult(response.data);
                window.__refreshSidebar?.();
                toast.success('Infographic & content generated!');
            } else { toast.error('Generation failed — check the backend.'); }
        } catch (err) { toast.error(err.message || 'Failed to connect to backend.'); }
        finally { setLoading(false); }
    };

    const copyToClipboard = () => {
        if (!result) return;
        const c = result.content;
        const text = `${c.hook}\n\n${c.body}\n\n${c.cta}\n\n${c.hashtags?.join(' ')}`;
        navigator.clipboard.writeText(text);
        setCopied(true); toast.success('Copied!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleNewPost = () => {
        setFormData({ title: '', tone: 'Professional', audience: '' });
        setResult(null); setCurrentHistoryId(null);
    };

    const c = result?.content;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#eef2f7' }}>
            <Sidebar onNewPost={handleNewPost} onSelectHistory={loadHistoryItem} currentHistoryId={currentHistoryId} />

            <main style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ marginBottom: 26 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <Logo size="small" className="cursor-pointer" onClick={() => navigate('/logo')} />
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>LinkedIn Content Generator</h1>
                        </div>
                        <p style={{ color: '#64748b', fontSize: 13, margin: 0, paddingLeft: 46 }}>
                            Create LinkedIn posts with visual AI infographics
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

                        {/* ── LEFT: FORM ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Collapsible Post Details */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div
                                    onClick={() => setShowPostDetails(!showPostDetails)}
                                    style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: showPostDetails ? '#f8fafc' : 'white', borderBottom: showPostDetails ? '1px solid #e2e8f0' : 'none' }}
                                >
                                    <p style={{ fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>✍️ Post Details</p>
                                    <motion.div animate={{ rotate: showPostDetails ? 180 : 0 }}>
                                        <RefreshCw size={14} color="#94a3b8" />
                                    </motion.div>
                                </div>
                                <AnimatePresence>
                                    {showPostDetails && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ padding: 24 }}
                                        >
                                            <div style={{ marginBottom: 16 }}>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Topic / Title <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input type="text" placeholder="e.g. The Future of AI"
                                                    value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: 16 }}>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Tone</label>
                                                <select value={formData.tone} onChange={e => setFormData(f => ({ ...f, tone: e.target.value }))}
                                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 14, background: 'white' }}>
                                                    {['Professional', 'Inspiring', 'Educational', 'Bold'].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Target Audience</label>
                                                <input type="text" placeholder="e.g. Content Creators"
                                                    value={formData.audience} onChange={e => setFormData(f => ({ ...f, audience: e.target.value }))}
                                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Style Selection Dropdown */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16 }}>🎨 Visual Style</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={infographicStyle}
                                        onChange={e => setInfographicStyle(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '14px 18px',
                                            borderRadius: 16,
                                            border: '2px solid #f1f5f9',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#1e293b',
                                            background: '#f8fafc',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#c54444'}
                                        onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                                    >
                                        {STYLES.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.icon} {s.label} — {s.desc}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <RefreshCw size={14} color="#94a3b8" />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', borderRadius: 18, background: loading ? '#e5a3a3' : 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 10px 25px rgba(197,68,68,0.3)', transition: 'all 0.3s' }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Wand2 size={20} /> Generate Masterpiece</>}
                            </button>
                        </div>

                        {/* Content area */}
                        <div style={{ padding: 24, flex: 1, overflowY: 'auto', backgroundColor: '#fdfcfc' }}>
                            <AnimatePresence mode="wait">
                                {result ? (
                                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                                        {/* 1. TOP: AI IMAGE & DOWNLOAD */}
                                        {c?.infographic_image_url && (
                                            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                                                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '85%' }}>
                                                    <img src={c.infographic_image_url} alt="AI Infographic"
                                                        style={{ width: '100%', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', border: '1px solid #f8e6e6' }}
                                                    />
                                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                                                        <button onClick={() => downloadAIImage(c?.infographic_image_url, formData.title)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(197,68,68,0.35)', transition: 'transform 0.2s' }}
                                                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            <Download size={20} /> Download Infographic Image
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. MIDDLE & BOTTOM: FULL WIDTH VERTICAL STACK */}
                                        {/* 2. MIDDLE & BOTTOM: FULL WIDTH VIBRANT STACK */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 1000, margin: '0 auto' }}>

                                            {/* Post Content Wrapper - More Colorful */}
                                            <div style={{ width: '100%', borderRadius: 24, border: '1px solid #eef2f6', backgroundColor: 'white', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                                                <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 15, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 10 }}>✍️ Dynamic Post Content</span>
                                                    <button onClick={copyToClipboard} style={{ background: 'rgba(255,255,255,0.22)', border: 'none', padding: '10px 20px', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}>
                                                        {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy All'}
                                                    </button>
                                                </div>
                                                <div style={{ padding: '0 32px 32px' }}>
                                                    <div style={{ marginBottom: 32 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 900, color: '#b45309', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.2 }}>⚡ Magnetic Hook</p>
                                                        <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.6 }}>{c?.hook}</p>
                                                    </div>
                                                    <div style={{ marginBottom: 32 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.2 }}>💬 High-Value Body</p>
                                                        <p style={{ fontSize: 16, color: '#334155', margin: 0, lineHeight: 1.9, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{c?.body}</p>
                                                    </div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 900, color: '#047857', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.2 }}>🎯 Conversion CTA</p>
                                                        <p style={{ fontSize: 16, fontStyle: 'italic', color: '#0f172a', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{c?.cta}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hashtags Card - Colorful */}
                                            {c?.hashtags?.length > 0 && (
                                                <div style={{ padding: 28, borderRadius: 24, border: '1px solid #eef2f6', background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                                    <p style={{ fontSize: 13, fontWeight: 900, color: '#6366f1', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 1.5 }}>🏷️ AI-Optimized Hashtags</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                                        {c.hashtags.map((tag, i) => {
                                                            const tagColors = [
                                                                { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
                                                                { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                                                                { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                                                                { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                                                            ];
                                                            const color = tagColors[i % tagColors.length];
                                                            return (
                                                                <span key={i} style={{ padding: '10px 22px', borderRadius: 24, background: color.bg, color: color.text, fontSize: 14, fontWeight: 800, border: `1px solid ${color.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>{tag}</span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                                                <button onClick={handleSubmit} disabled={loading}
                                                    style={{
                                                        minWidth: 280,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 12,
                                                        padding: '20px 40px',
                                                        borderRadius: 22,
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                                        color: 'white',
                                                        fontSize: 16,
                                                        fontWeight: 800,
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: '0 8px 25px rgba(99,102,241,0.4)'
                                                    }}
                                                    onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-3px)', e.currentTarget.style.boxShadow = '0 12px 35px rgba(99,102,241,0.5)')}
                                                    onMouseOut={e => !loading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.4)')}
                                                >
                                                    <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                                                    {loading ? 'Generating...' : 'Craft Another Masterpiece'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* Empty/Loading */
                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
                                        {loading ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ width: 70, height: 70, border: '5px solid #f8e6e6', borderTopColor: '#c54444', borderRadius: '50%', animation: 'spin 1.2s linear infinite', margin: '0 auto 24px' }} />
                                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>🚀 Generating Your Masterpiece...</h2>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>This is usually faster with our latest optimizations (~15-20s)</p>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', opacity: 0.6 }}>
                                                <div style={{ fontSize: 72, marginBottom: 20 }}>✨</div>
                                                <h3 style={{ fontWeight: 800, color: '#1e293b', margin: '0 0 8px', fontSize: 18 }}>Ready to Create?</h3>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: 0, maxWidth: 300 }}>Enter your topic on the left and we'll craft a perfect LinkedIn post & infographic.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } * { box-sizing: border-box; }`}</style>
        </div>
    );
}

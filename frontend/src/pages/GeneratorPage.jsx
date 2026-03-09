import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Copy, RefreshCw, Download, Check, Image, FileText, Palette, Zap, MessageSquare, Target, Hash, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { generateContent, historyAPI, paymentAPI, API_BASE } from '../services/api';
import Logo from '../components/ui/Logo';
import { useNavigate } from 'react-router-dom';

// ── Download AI Image ──────────────────────────────────────────────────────────
async function downloadAIImage(imageUrl, title) {
    if (!imageUrl) { toast.error('No AI image to download'); return; }
    // Sanitize filename for download
    const safeTitle = (title || 'infographic').replace(/[^a-z0-9_\- ]/gi, '_').trim();
    const filename = `${safeTitle}.png`;

    try {
        toast.loading('Preparing download...', { id: 'dl' });

        let blob;
        // 1. If it's a base64 data URL, convert it directly to a Blob
        if (imageUrl.startsWith('data:')) {
            const res = await fetch(imageUrl);
            blob = await res.blob();
        }
        // 2. If it's a server-relative path (/api/images/...), prepend the API base
        else if (imageUrl.startsWith('/')) {
            const fullUrl = `${API_BASE}${imageUrl}`;
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error('Download failed');
            blob = await response.blob();
        }
        // 3. If it's a full CDN URL, use the proxy to avoid CORS
        else {
            const proxyUrl = `${API_BASE}/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Download failed');
            blob = await response.blob();
        }

        // 4. Trigger robust browser download with descriptive PNG filename
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        toast.success(`Downloaded as "${filename}"!`, { id: 'dl' });
    } catch (err) {
        console.error('Download error:', err);
        toast.error('Download failed — try right-clicking the image to save', { id: 'dl' });
    }
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
                        <span style={{ fontSize: 12, color: '#e5a3a3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>AI Infographic</span>
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
    const [showStyles, setShowStyles] = useState(false);
    const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [credits, setCredits] = useState(null);
    const [noCreditsModal, setNoCreditsModal] = useState(false);

    useEffect(() => {
        paymentAPI.getCredits().then(d => setCredits(d?.credits ?? null)).catch(() => {});
    }, []);

    const STYLES = [
        { id: 'Whiteboard', label: 'Whiteboard Sketch', Icon: Palette, desc: 'Hand-drawn marker style' },
        { id: 'Corporate Modern', label: 'Corporate Modern', Icon: FileText, desc: 'Clean, professional digital' },
        { id: 'Executive Guide', label: 'Executive Guide', Icon: Zap, desc: 'Stacked vibrant guide' },
        { id: 'Handwritten Notes', label: 'Handwritten Notes', Icon: MessageSquare, desc: 'Pen on notebook paper' },
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

    const copyToClipboard = () => {
        if (!result) return;
        const c = result.content || result;
        const fullText = `
${c.hook || ''}

${c.body || ''}

${c.cta || ''}

${(c.hashtags || []).map(t => typeof t === 'string' && !t.startsWith('#') ? '#' + t : t).join(' ')}
        `.trim();

        // Modern approach (HTTPS only)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(fullText).then(() => {
                setCopied(true);
                toast.success('Post copied!');
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error('Copy failed', err);
                toast.error('Failed to copy text');
            });
        } else {
            // Fallback for HTTP (like http://makepost.pro)
            const textArea = document.createElement("textarea");
            textArea.value = fullText;
            // Move it off-screen
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                toast.success('Post copied!');
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
                toast.error('Failed to copy text');
            }
            document.body.removeChild(textArea);
        }
    };

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (!formData.title.trim()) { toast.error('Please enter a topic'); return; }

        // Client-side credits check
        if (credits !== null && credits < 1) {
            setNoCreditsModal(true);
            return;
        }

        setLoading(true); setResult(null); setCurrentHistoryId(null);
        try {
            const response = await generateContent({ ...formData, style: infographicStyle });
            if (response?.status === 'success') {
                setResult(response.data);
                // Update credits from response
                if (response.data?.credits_remaining !== undefined) {
                    setCredits(response.data.credits_remaining);
                }
                window.__refreshSidebar?.();
                toast.success('Infographic & content generated!');
            } else { toast.error('Generation failed — check the backend.'); }
        } catch (err) {
            // Handle no credits error from backend
            if (err.message?.includes('no credits') || err.message?.includes('No credits') || err.status === 402) {
                setCredits(0);
                setNoCreditsModal(true);
            } else {
                toast.error(err.message || 'Failed to connect to backend.');
            }
        }
        finally { setLoading(false); }
    };

    const handleNewPost = () => {
        setFormData({ title: '', tone: 'Professional', audience: '' });
        setResult(null); setCurrentHistoryId(null);
    };

    const c = result?.content;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#eef2f7' }}>
            <Sidebar onNewPost={handleNewPost} onSelectHistory={loadHistoryItem} currentHistoryId={currentHistoryId} />

            {/* No Credits Modal */}
            <AnimatePresence>
                {noCreditsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
                        }}
                        onClick={() => setNoCreditsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'white', borderRadius: 28, padding: 40,
                                maxWidth: 420, width: '100%', textAlign: 'center',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
                            }}
                        >
                            <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
                            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>You're out of credits</h2>
                            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
                                Each generation uses 1 credit. Top up to keep creating stunning posts and infographics.
                            </p>
                            <button
                                onClick={() => navigate('/pricing')}
                                style={{
                                    width: '100%', padding: '14px 24px', borderRadius: 18,
                                    background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white',
                                    fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    marginBottom: 12, boxShadow: '0 8px 20px rgba(197,68,68,0.3)'
                                }}
                            >
                                <ShoppingCart size={18} /> Buy Credits
                            </button>
                            <button
                                onClick={() => setNoCreditsModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                            >
                                Maybe later
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>



                    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

                        {/* ── LEFT: FORM ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Collapsible Post Details */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div
                                    onClick={() => setShowPostDetails(!showPostDetails)}
                                    style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: showPostDetails ? '#f8fafc' : 'white', borderBottom: showPostDetails ? '1px solid #e2e8f0' : 'none' }}
                                >
                                    <p style={{ fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>Post Details</p>
                                    <motion.div animate={{ rotate: showPostDetails ? 180 : 0 }}>
                                        {showPostDetails ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
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

                            {/* Style Selection — Custom Dropdown */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Visual Style</label>
                                <div style={{ position: 'relative' }}>
                                    {/* Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setStyleDropdownOpen(o => !o)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderRadius: 14,
                                            border: styleDropdownOpen ? '2px solid #c54444' : '2px solid #e2e8f0',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{STYLES.find(s => s.id === infographicStyle)?.label}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{STYLES.find(s => s.id === infographicStyle)?.desc}</div>
                                        </div>
                                        <ChevronDown size={16} color="#94a3b8" style={{ transform: styleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </button>

                                    {/* Dropdown List */}
                                    {styleDropdownOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 6px)',
                                            left: 0,
                                            right: 0,
                                            background: 'white',
                                            borderRadius: 16,
                                            border: '1.5px solid #e2e8f0',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                            zIndex: 100,
                                            overflow: 'hidden',
                                        }}>
                                            {STYLES.map((s, i) => {
                                                const selected = infographicStyle === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => { setInfographicStyle(s.id); setStyleDropdownOpen(false); }}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-start',
                                                            padding: '11px 16px',
                                                            background: selected ? '#fef2f2' : 'white',
                                                            borderBottom: i < STYLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.15s',
                                                            textAlign: 'left',
                                                            fontFamily: 'inherit',
                                                        }}
                                                        onMouseOver={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                                        onMouseOut={e => { if (!selected) e.currentTarget.style.background = 'white'; }}
                                                    >
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#c54444' : '#1e293b' }}>{s.label}</span>
                                                        <span style={{ fontSize: 11, color: selected ? '#ef4444' : '#94a3b8', marginTop: 1 }}>{s.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', borderRadius: 18, background: loading ? '#e5a3a3' : 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 10px 25px rgba(197,68,68,0.3)', transition: 'all 0.3s' }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Wand2 size={20} /> Generate Masterpiece</>}
                            </button>

                            {/* Credits indicator */}
                            <div style={{ textAlign: 'center' }}>
                                {credits === null ? null : credits < 1 ? (
                                    <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Zap size={13} /> No credits left — Buy more
                                    </button>
                                ) : (
                                    <p style={{ fontSize: 12, color: credits <= 3 ? '#f59e0b' : '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                        <Zap size={12} /> {credits} credit{credits !== 1 ? 's' : ''} remaining
                                        {credits <= 3 && (
                                            <button onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c54444', fontWeight: 700, fontSize: 12, marginLeft: 4 }}>
                                                — Top up
                                            </button>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Content area */}
                        <div style={{ padding: 24, flex: 1, overflowY: 'auto', backgroundColor: '#fdfcfc' }}>
                            <AnimatePresence mode="wait">
                                {result ? (
                                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                                        {/* 1. TOP: AI IMAGE & DOWNLOAD */}
                                        {c?.infographic_image_url && (
                                            <div style={{ marginBottom: 48, textAlign: 'center' }}>
                                                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '90%' }}>
                                                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                                        <Image size={22} color="#c54444" />
                                                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 1.5 }}>AI-Generated Visual</h2>
                                                    </div>
                                                    <img src={c.infographic_image_url} alt="AI Infographic"
                                                        style={{ width: '100%', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.18)', border: '1px solid #f8e6e6' }}
                                                    />
                                                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                                                        <button onClick={() => downloadAIImage(c?.infographic_image_url, formData.title)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 36px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 25px rgba(197,68,68,0.4)', transition: 'all 0.3s' }}
                                                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            <Download size={22} /> Download High-Res Image
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. BOTTOM: CLEAN TEXTUAL FLOW */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 800, margin: '0 auto' }}>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -16 }}>
                                                <button onClick={copyToClipboard} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: 12, color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}>
                                                    {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy Full Post'}
                                                </button>
                                            </div>

                                            <div style={{ padding: '0 0 24px', borderBottom: '1px solid #e2e8f0' }}>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#b45309', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="#b45309" /> The Hook</p>
                                                <p style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>{c?.hook}</p>
                                            </div>

                                            <div style={{ padding: '0 0 24px', borderBottom: '1px solid #e2e8f0' }}>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={14} color="#1d4ed8" /> Post Content</p>
                                                <p style={{ fontSize: 17, color: '#334155', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{c?.body}</p>
                                            </div>

                                            <div style={{ padding: '0 0 24px' }}>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#047857', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={14} color="#047857" /> Call to Action</p>
                                                <p style={{ fontSize: 18, fontStyle: 'italic', color: '#0f172a', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>{c?.cta}</p>
                                            </div>

                                            {c?.hashtags?.length > 0 && (
                                                <div style={{ paddingTop: 8 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 800, color: '#6366f1', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={14} color="#6366f1" /> Hashtags</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                        {c.hashtags.map((tag, i) => (
                                                            <span key={i} style={{ padding: '6px 16px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontSize: 14, fontWeight: 700 }}>
                                                                {typeof tag === 'string' && !tag.startsWith('#') ? '#' + tag : tag}
                                                            </span>
                                                        ))}
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
                                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Generating your content...</h2>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>This is usually faster with our latest optimizations (~15-20s)</p>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', opacity: 0.55 }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c54444', opacity: 0.4 }} />
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c54444', opacity: 0.7 }} />
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c54444', opacity: 0.4 }} />
                                                </div>
                                                <h3 style={{ fontWeight: 800, color: '#1e293b', margin: '0 0 8px', fontSize: 18 }}>Ready to Create?</h3>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: 0, maxWidth: 300 }}>Enter your topic on the left and we'll craft a perfect LinkedIn post &amp; infographic.</p>
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

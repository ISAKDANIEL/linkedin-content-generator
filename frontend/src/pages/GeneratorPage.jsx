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


// ── Visual Infographic Renderer (style-aware) ──────────────────────────────────

// Whiteboard Sketch style
function WhiteboardRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const MARKER_COLORS = ['#e53e3e','#dd6b20','#2b6cb0','#6b46c1','#276749','#0987a0'];
    return (
        <div style={{ fontFamily: "'Arial Black', 'Arial Bold', sans-serif", background: '#ffffff', borderRadius: 16, overflow: 'hidden', border: '3px solid #1a1a2e', boxShadow: '6px 6px 0 #1a1a2e' }}>
            {/* Whiteboard header bar */}
            <div style={{ background: '#1a1a2e', padding: '18px 20px 14px', borderBottom: '3px solid #e53e3e' }}>
                <div style={{ display: 'inline-block', background: '#e53e3e', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: 2, padding: '3px 12px', borderRadius: 4, marginBottom: 8, textTransform: 'uppercase' }}>📋 Whiteboard Sketch</div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1.5 }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#a0aec0', margin: 0 }}>{infSubtitle}</p>}
            </div>
            {/* Sketch grid */}
            <div style={{ padding: '14px 16px 8px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map((cat, ci) => {
                    const color = MARKER_COLORS[ci % MARKER_COLORS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                            style={{ border: `2px dashed ${color}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                            <div style={{ background: color, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, fontWeight: 900, color: color }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', borderBottom: ni < nodes.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: ni < nodes.length - 1 ? 4 : 0 }}>
                                        <span style={{ color: color, fontWeight: 900, fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>→</span>
                                        <div>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ fontSize: 11, color: '#64748b' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '8px 16px', background: '#1a1a2e', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#a0aec0', letterSpacing: 1, fontWeight: 600 }}>makepost.pro • Whiteboard Sketch</span>
            </div>
        </div>
    );
}

// Corporate Modern style
function CorporateRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const CORP_COLORS = ['#1d4ed8','#0891b2','#7c3aed','#059669','#dc2626','#d97706'];
    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f0f7ff', borderRadius: 16, overflow: 'hidden', border: '1px solid #bfdbfe', boxShadow: '0 10px 40px rgba(30,58,138,0.15)' }}>
            {/* Corporate gradient header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)', padding: '22px 24px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 12px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.25)' }}>
                    <span style={{ fontSize: 10, color: '#bfdbfe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>💼 Corporate Modern</span>
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', margin: '0 0 6px', lineHeight: 1.3, position: 'relative' }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#93c5fd', margin: 0, position: 'relative' }}>{infSubtitle}</p>}
            </div>
            {/* Cards */}
            <div style={{ padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map((cat, ci) => {
                    const color = CORP_COLORS[ci % CORP_COLORS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }}
                            style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 12px rgba(30,58,138,0.08)', overflow: 'hidden', borderLeft: `4px solid ${color}` }}>
                            <div style={{ padding: '8px 14px', background: `${color}08`, borderBottom: `1px solid ${color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 8px ${color}40` }}>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: 'white' }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: color }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                                        <div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ fontSize: 11, color: '#64748b' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '8px 16px', background: '#1e3a8a', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#93c5fd', letterSpacing: 1, fontWeight: 600 }}>makepost.pro • Corporate Modern</span>
            </div>
        </div>
    );
}

// Executive Guide (dark mode) style
function ExecutiveRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const EXEC_COLORS = ['#58a6ff','#3fb950','#f78166','#d2a8ff','#ffa657','#79c0ff'];
    return (
        <div style={{ fontFamily: "'Consolas', 'Courier New', monospace", background: '#0d1117', borderRadius: 16, overflow: 'hidden', border: '1px solid #30363d', boxShadow: '0 0 0 1px #21262d, 0 16px 48px rgba(0,0,0,0.5)' }}>
            {/* Dark header */}
            <div style={{ background: 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)', padding: '20px 22px 16px', borderBottom: '1px solid #21262d' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(88,166,255,0.15)', borderRadius: 6, padding: '3px 10px', marginBottom: 10, border: '1px solid rgba(88,166,255,0.3)' }}>
                    <span style={{ fontSize: 10, color: '#58a6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>⚡ Executive Guide</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f6fc', margin: '0 0 6px', lineHeight: 1.3, letterSpacing: 0.5 }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>{infSubtitle}</p>}
            </div>
            {/* Dark sections */}
            <div style={{ padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map((cat, ci) => {
                    const color = EXEC_COLORS[ci % EXEC_COLORS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }}
                            style={{ borderRadius: 8, background: '#161b22', border: `1px solid ${color}30`, overflow: 'hidden' }}>
                            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${color}20`, display: 'flex', alignItems: 'center', gap: 10, background: `${color}08` }}>
                                <div style={{ width: 22, height: 22, borderRadius: 4, background: `${color}20`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: color, textTransform: 'uppercase', letterSpacing: 1 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ color: color, fontSize: 12, lineHeight: '18px', flexShrink: 0, opacity: 0.8 }}>▸</span>
                                        <div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ fontSize: 11, color: '#8b949e' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '8px 16px', background: '#010409', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <span style={{ fontSize: 10, color: '#484f58', letterSpacing: 1, fontWeight: 600 }}>makepost.pro • Executive Guide</span>
            </div>
        </div>
    );
}

// Handwritten Notes style
function HandwrittenRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const INK_COLORS = ['#c05621','#6b46c1','#276749','#2b6cb0','#c53030','#2c7a7b'];
    const linesBg = 'repeating-linear-gradient(transparent, transparent 27px, #d4c5a980 28px)';
    return (
        <div style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive", background: `#fef9ee`, borderRadius: 16, overflow: 'hidden', border: '2px solid #d4c5a9', boxShadow: '3px 3px 0 #d4c5a9, 6px 6px 0 #e8dcc8' }}>
            {/* Spiral notebook top */}
            <div style={{ background: '#2d2d2d', padding: '16px 20px 14px', position: 'relative', borderBottom: '4px solid #D69E2E' }}>
                {/* Spiral holes */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, display: 'flex', gap: 12, padding: '0 14px', alignItems: 'flex-start', paddingTop: 4 }}>
                    {Array.from({length: 12}).map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#555', border: '1px solid #777', flexShrink: 0 }} />)}
                </div>
                <div style={{ paddingTop: 6 }}>
                    <div style={{ display: 'inline-block', background: '#D69E2E', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 3, marginBottom: 6, letterSpacing: 1 }}>✏️ Handwritten Notes</div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f5f0dc', margin: '0 0 4px', lineHeight: 1.3 }}>{infTitle}</h2>
                    {infSubtitle && <p style={{ fontSize: 12, color: '#c8b87a', margin: 0, fontStyle: 'italic' }}>{infSubtitle}</p>}
                </div>
            </div>
            {/* Lined paper sections */}
            <div style={{ padding: '12px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fef9ee' }}>
                {categories.map((cat, ci) => {
                    const ink = INK_COLORS[ci % INK_COLORS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, rotate: -0.5 }} animate={{ opacity: 1, rotate: 0 }} transition={{ delay: ci * 0.06 }}
                            style={{ background: linesBg, backgroundColor: '#fffef5', borderRadius: 4, border: `1.5px solid ${ink}40`, borderLeft: `4px solid ${ink}`, padding: '8px 12px 10px', boxShadow: '1px 2px 6px rgba(0,0,0,0.06)', position: 'relative' }}>
                            {/* Red margin line */}
                            <div style={{ position: 'absolute', left: 36, top: 0, bottom: 0, width: 1, background: '#e5b8b840', pointerEvents: 'none' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 15, lineHeight: 1 }}>{cat.icon || '📌'}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: ink, textDecoration: 'underline', textUnderlineOffset: 3 }}>{cat.label}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 4 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ color: ink, fontSize: 13, flexShrink: 0, lineHeight: '18px' }}>☑</span>
                                        <div>
                                            <span style={{ fontSize: 12, color: '#3d3520' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ fontSize: 11, color: '#7b6a3e', fontStyle: 'italic' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '8px 16px', background: '#2d2d2d', textAlign: 'center', borderTop: '2px solid #D69E2E' }}>
                <span style={{ fontSize: 10, color: '#c8b87a', letterSpacing: 1, fontStyle: 'italic' }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

function InfographicRenderer({ content, title, style = 'Whiteboard' }) {
    const infographic = content?.infographic;
    const categories = infographic?.categories || [];

    // Fallback when no structured infographic data exists
    if (!categories.length) {
        const fallbackBgs = { 'Whiteboard': '#fff', 'Corporate Modern': '#f0f7ff', 'Executive Guide': '#0d1117', 'Handwritten Notes': '#fef9ee' };
        const fallbackColors = { 'Whiteboard': '#1a1a2e', 'Corporate Modern': '#1e3a5f', 'Executive Guide': '#c9d1d9', 'Handwritten Notes': '#3d3520' };
        return (
            <div style={{ fontFamily: style === 'Handwritten Notes' ? 'cursive' : 'system-ui', lineHeight: 1.8, background: fallbackBgs[style] || '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: fallbackColors[style] || '#1a1a2e', marginBottom: 10 }}>{content?.hook}</p>
                <p style={{ fontSize: 13, color: fallbackColors[style] || '#2d3748', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{content?.body}</p>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: fallbackColors[style] || '#2d3748' }}>{content?.cta}</p>
            </div>
        );
    }

    if (style === 'Corporate Modern') return <CorporateRenderer infographic={infographic} title={title} />;
    if (style === 'Executive Guide') return <ExecutiveRenderer infographic={infographic} title={title} />;
    if (style === 'Handwritten Notes') return <HandwrittenRenderer infographic={infographic} title={title} />;
    return <WhiteboardRenderer infographic={infographic} title={title} />;
}

// Keep for STYLES array label lookup
const STYLE_THEMES = { 'Whiteboard': {}, 'Corporate Modern': {}, 'Executive Guide': {}, 'Handwritten Notes': {} };

// ── Main Generator Page ────────────────────────────────────────────────────────
export default function GeneratorPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentHistoryId, setCurrentHistoryId] = useState(null);
    const [formData, setFormData] = useState({ title: '', tone: 'Professional', audience: '' });
    const [infographicStyle, setInfographicStyle] = useState('Whiteboard');
    const [lastGeneratedStyle, setLastGeneratedStyle] = useState(null);
    const [showPostDetails, setShowPostDetails] = useState(true);
    const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
    const [toneDropdownOpen, setToneDropdownOpen] = useState(false);
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

    const TONES = ['Professional', 'Casual', 'Inspirational', 'Educational', 'Humorous', 'Formal', 'Conversational', 'Storytelling', 'Data-Driven', 'Motivational'];

    const loadHistoryItem = useCallback(async (id) => {
        setCurrentHistoryId(id);
        try {
            const data = await historyAPI.getById(id);
            const item = data.item;
            setFormData({ title: item.title, tone: item.tone || 'Professional', audience: item.audience || '' });
            setResult({ content: item.result });
            // Restore the style used to generate this history item
            if (item.result?.style) {
                setInfographicStyle(item.result.style);
                setLastGeneratedStyle(item.result.style);
            }
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
                setLastGeneratedStyle(infographicStyle);
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
        setResult(null); setCurrentHistoryId(null); setLastGeneratedStyle(null);
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
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        type="button"
                                                        onMouseDown={() => setToneDropdownOpen(o => !o)}
                                                        onBlur={() => setTimeout(() => setToneDropdownOpen(false), 150)}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, border: toneDropdownOpen ? '1.5px solid #c54444' : '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#1e293b' }}
                                                    >
                                                        <span>{formData.tone}</span>
                                                        <ChevronDown size={16} color="#94a3b8" style={{ transform: toneDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                                                    </button>
                                                    {toneDropdownOpen && (
                                                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                                                            {TONES.map((t, i) => {
                                                                const selected = formData.tone === t;
                                                                return (
                                                                    <div
                                                                        key={t}
                                                                        onMouseDown={e => { e.preventDefault(); setFormData(f => ({ ...f, tone: t })); setToneDropdownOpen(false); }}
                                                                        style={{ padding: '11px 16px', fontSize: 14, fontWeight: selected ? 700 : 400, color: selected ? '#c54444' : '#1e293b', background: selected ? '#fef2f2' : 'white', borderBottom: i < TONES.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                                                                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                                                        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = selected ? '#fef2f2' : 'white'; }}
                                                                    >
                                                                        {t}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
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

                            {/* Style Selection — Dropdown */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Visual Style</label>
                                <div style={{ position: 'relative' }}>
                                    {/* Trigger */}
                                    <button
                                        type="button"
                                        onMouseDown={() => setStyleDropdownOpen(o => !o)}
                                        onBlur={() => setTimeout(() => setStyleDropdownOpen(false), 150)}
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
                                        <ChevronDown size={16} color="#94a3b8" style={{ transform: styleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                                    </button>

                                    {/* Dropdown List */}
                                    {styleDropdownOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 4px)',
                                            left: 0,
                                            right: 0,
                                            background: 'white',
                                            borderRadius: 14,
                                            border: '1.5px solid #e2e8f0',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                            zIndex: 200,
                                            overflow: 'hidden',
                                        }}>
                                            {STYLES.map((s, i) => {
                                                const selected = infographicStyle === s.id;
                                                return (
                                                    <div
                                                        key={s.id}
                                                        onMouseDown={e => {
                                                            e.preventDefault(); // prevent trigger blur from firing first
                                                            setInfographicStyle(s.id);
                                                            setStyleDropdownOpen(false);
                                                        }}
                                                        style={{
                                                            padding: '11px 16px',
                                                            background: selected ? '#fef2f2' : 'white',
                                                            borderBottom: i < STYLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                                        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'white'; }}
                                                    >
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? '#c54444' : '#1e293b' }}>{s.label}</div>
                                                        <div style={{ fontSize: 11, color: selected ? '#ef4444' : '#94a3b8', marginTop: 2 }}>{s.desc}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', borderRadius: 18, background: loading ? '#e5a3a3' : 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 10px 25px rgba(197,68,68,0.3)', transition: 'all 0.3s' }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : result && lastGeneratedStyle && infographicStyle !== lastGeneratedStyle ? <><RefreshCw size={20} /> Regenerate with New Style</> : <><Wand2 size={20} /> Generate Masterpiece</>}
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

                                        {/* 1. TOP: LIVE INFOGRAPHIC PREVIEW + DOWNLOAD */}
                                        <div style={{ marginBottom: 48 }}>
                                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <Image size={22} color="#c54444" />
                                                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 1.5 }}>AI-Generated Visual</h2>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                    {STYLES.find(s => s.id === infographicStyle)?.label || infographicStyle}
                                                </span>
                                            </div>
                                            <InfographicRenderer content={c} title={formData.title} style={infographicStyle} />
                                            {c?.infographic_image_url && (
                                                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                                                    <button onClick={() => downloadAIImage(c?.infographic_image_url, formData.title)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 36px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 25px rgba(197,68,68,0.4)', transition: 'all 0.3s' }}
                                                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                    >
                                                        <Download size={22} /> Download High-Res Image
                                                    </button>
                                                </div>
                                            )}
                                        </div>

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

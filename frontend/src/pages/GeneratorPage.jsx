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

/* ── WHITEBOARD SKETCH ─────────────────────────────────────────────────────── */
function WhiteboardRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const C = ['#e53e3e','#dd6b20','#2b6cb0','#6b46c1','#276749','#0987a0','#c53030','#b7791f','#2c7a7b','#553c9a'];
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '3px solid #1a1a2e', boxShadow: '5px 5px 0 #1a1a2e' }}>
            <div style={{ background: '#1a1a2e', padding: '16px 20px 12px', borderBottom: '4px solid #e53e3e', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#e53e3e', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 14px', borderRadius: 3, marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>📋 WHITEBOARD SKETCH</div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1.2 }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{infSubtitle}</p>}
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {categories.map((cat, ci) => {
                    const color = C[ci % C.length];
                    const nodes = (cat.nodes || []).slice(0, 5);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ci * 0.04 }}
                            style={{ border: `2px dashed ${color}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                            <div style={{ background: color, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '7px 10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                        <span style={{ color, fontWeight: 900, fontSize: 13, lineHeight: '16px', flexShrink: 0 }}>→</span>
                                        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                                            <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#64748b' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#1a1a2e', padding: '7px', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1 }}>makepost.pro • Whiteboard Sketch</span>
            </div>
        </div>
    );
}

/* ── CORPORATE MODERN ──────────────────────────────────────────────────────── */
function CorporateRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const C = ['#1d4ed8','#0891b2','#7c3aed','#059669','#dc2626','#d97706','#0284c7','#9333ea','#16a34a','#b45309'];
    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#eef4ff', borderRadius: 14, overflow: 'hidden', border: '1px solid #bfdbfe', boxShadow: '0 12px 40px rgba(30,58,138,0.18)' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 100%)', padding: '18px 22px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'absolute', bottom: -35, left: 40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.25)' }}>
                    <span style={{ fontSize: 10, color: '#bfdbfe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>💼 CORPORATE MODERN</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 5px', lineHeight: 1.25, position: 'relative' }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#93c5fd', margin: 0, position: 'relative' }}>{infSubtitle}</p>}
            </div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {categories.map((cat, ci) => {
                    const color = C[ci % C.length];
                    const nodes = (cat.nodes || []).slice(0, 5);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.04 }}
                            style={{ borderRadius: 9, background: '#fff', boxShadow: `0 2px 14px ${color}15`, overflow: 'hidden', borderTop: `3px solid ${color}` }}>
                            <div style={{ padding: '7px 12px', background: `${color}0a`, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${color}18` }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${color}40` }}>
                                    <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.3 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '7px 12px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
                                        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                                            <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#64748b' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#1e3a8a', padding: '7px', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#93c5fd', letterSpacing: 1 }}>makepost.pro • Corporate Modern</span>
            </div>
        </div>
    );
}

/* ── EXECUTIVE GUIDE (DARK) ────────────────────────────────────────────────── */
function ExecutiveRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const C = ['#58a6ff','#3fb950','#f78166','#d2a8ff','#ffa657','#79c0ff','#56d364','#ff7b72','#cae8ff','#ffdcd7'];
    return (
        <div style={{ fontFamily: "'Consolas','Courier New',monospace", background: '#0d1117', borderRadius: 14, overflow: 'hidden', border: '1px solid #30363d', boxShadow: '0 0 0 1px #21262d, 0 16px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ background: 'linear-gradient(180deg,#161b22 0%,#0d1117 100%)', padding: '18px 22px 14px', borderBottom: '1px solid #21262d', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(88,166,255,0.12)', borderRadius: 6, padding: '3px 12px', marginBottom: 8, border: '1px solid rgba(88,166,255,0.3)' }}>
                    <span style={{ fontSize: 10, color: '#58a6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>⚡ EXECUTIVE GUIDE</span>
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: '#f0f6fc', margin: '0 0 5px', lineHeight: 1.25 }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>{infSubtitle}</p>}
            </div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {categories.map((cat, ci) => {
                    const color = C[ci % C.length];
                    const nodes = (cat.nodes || []).slice(0, 5);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.04 }}
                            style={{ borderRadius: 8, background: '#161b22', border: `1px solid ${color}28`, overflow: 'hidden', boxShadow: `0 0 12px ${color}10` }}>
                            <div style={{ padding: '7px 12px', borderBottom: `1px solid ${color}20`, display: 'flex', alignItems: 'center', gap: 8, background: `${color}08` }}>
                                <div style={{ width: 20, height: 20, borderRadius: 4, background: `${color}22`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color }}>{ci + 1}</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 1.3 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                            </div>
                            <div style={{ padding: '7px 12px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                        <span style={{ color, fontSize: 11, lineHeight: '16px', flexShrink: 0 }}>▸</span>
                                        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                                            <span style={{ fontWeight: 600, color: '#c9d1d9' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#6e7681' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#010409', padding: '7px', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <span style={{ fontSize: 10, color: '#484f58', letterSpacing: 1 }}>makepost.pro • Executive Guide</span>
            </div>
        </div>
    );
}

/* ── HANDWRITTEN NOTES ─────────────────────────────────────────────────────── */
function HandwrittenRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const INK = ['#7b341e','#553c9a','#1a4731','#1a365d','#742a2a','#234e52','#744210','#3c1a5b'];
    const PAPER_BG = ['#fffde7','#fff9f0','#f0fff4','#ebf8ff','#fff5f5','#f0ffff','#fffaf0','#faf5ff'];
    // Lined paper pattern
    const lined = 'repeating-linear-gradient(transparent, transparent 24px, #b8a99a55 25px)';
    return (
        <div style={{ fontFamily: "'Comic Sans MS','Chalkboard SE',cursive", background: '#fdf6e3', borderRadius: 14, overflow: 'hidden', border: '2px solid #c8a97e', boxShadow: '4px 4px 0 #c8a97e, 7px 7px 0 #e8d5b7' }}>
            {/* Spiral binding strip */}
            <div style={{ background: '#3d2b1f', height: 18, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', overflow: 'hidden' }}>
                {Array.from({length: 18}).map((_, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 14, height: 14, borderRadius: '50%', border: '2px solid #8b6914', background: '#5c3d11', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }} />
                ))}
            </div>
            {/* Cover header */}
            <div style={{ background: 'linear-gradient(135deg,#3d2b1f 0%,#5c4033 100%)', padding: '14px 20px 12px', borderBottom: '4px solid #D69E2E', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#D69E2E', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 12px', borderRadius: 3, marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' }}>✏️ Handwritten Notes</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fef3c7', margin: '0 0 4px', lineHeight: 1.3, fontStyle: 'italic' }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#d4a96a', margin: 0, fontStyle: 'italic' }}>{infSubtitle}</p>}
            </div>
            {/* Lined paper grid */}
            <div style={{ padding: '10px', background: '#fdf6e3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {categories.map((cat, ci) => {
                    const ink = INK[ci % INK.length];
                    const paperBg = PAPER_BG[ci % PAPER_BG.length];
                    const nodes = (cat.nodes || []).slice(0, 5);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, rotate: ci % 2 === 0 ? -0.8 : 0.8 }} animate={{ opacity: 1, rotate: 0 }} transition={{ delay: ci * 0.05, type: 'spring', stiffness: 200 }}
                            style={{ background: lined, backgroundColor: paperBg, borderRadius: 6, border: `1px solid ${ink}30`, borderLeft: `4px solid ${ink}`, padding: '8px 10px 10px', boxShadow: '2px 3px 8px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                            {/* Red margin line */}
                            <div style={{ position: 'absolute', left: 32, top: 0, bottom: 0, width: 1, background: '#e57373aa', pointerEvents: 'none' }} />
                            {/* Section tab */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, paddingBottom: 5, borderBottom: `2px solid ${ink}40` }}>
                                <span style={{ fontSize: 16 }}>{cat.icon || ['📝','📌','✍️','📖','🖊️','📒','🗒️','📓'][ci % 8]}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: ink, textDecoration: 'underline wavy', textUnderlineOffset: 3, lineHeight: 1.3 }}>{cat.label}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 2 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                        <span style={{ color: ink, fontSize: 14, flexShrink: 0, lineHeight: '16px' }}>✓</span>
                                        <div style={{ fontSize: 11, lineHeight: 1.45 }}>
                                            <span style={{ color: '#3d2008', fontWeight: 600 }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#7b5e3a', fontStyle: 'italic' }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Corner fold */}
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 12px 12px', borderColor: `transparent transparent ${ink}30 transparent` }} />
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#3d2b1f', padding: '7px', textAlign: 'center', borderTop: '3px solid #D69E2E' }}>
                <span style={{ fontSize: 10, color: '#d4a96a', letterSpacing: 1, fontStyle: 'italic' }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

function InfographicRenderer({ content, title, style = 'Whiteboard' }) {
    const infographic = content?.infographic;
    const categories = infographic?.categories || [];

    if (!categories.length) {
        const bgs = { 'Whiteboard': '#fff', 'Corporate Modern': '#eef4ff', 'Executive Guide': '#0d1117', 'Handwritten Notes': '#fdf6e3' };
        const fg = { 'Whiteboard': '#1a1a2e', 'Corporate Modern': '#1e3a5f', 'Executive Guide': '#c9d1d9', 'Handwritten Notes': '#3d2008' };
        const ff = { 'Handwritten Notes': "'Comic Sans MS',cursive" };
        return (
            <div style={{ fontFamily: ff[style] || 'system-ui', lineHeight: 1.8, background: bgs[style] || '#fff', padding: 20, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: fg[style] || '#1a1a2e', marginBottom: 10 }}>{content?.hook}</p>
                <p style={{ fontSize: 13, color: fg[style] || '#2d3748', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{content?.body}</p>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: fg[style] || '#2d3748' }}>{content?.cta}</p>
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

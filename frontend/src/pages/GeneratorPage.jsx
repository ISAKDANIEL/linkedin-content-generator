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

/* ══════════════════════════════════════════════════════════════════════════════
   WHITEBOARD SKETCH
   Layout: Alternating zigzag flow — big circle number LEFT then RIGHT, flowing
   down the page with dashed connector lines between rows.
══════════════════════════════════════════════════════════════════════════════ */
function WhiteboardRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const COLORS = ['#e53e3e','#dd6b20','#2b6cb0','#6b46c1','#276749','#0987a0','#c53030','#b7791f','#2c7a7b','#553c9a'];

    return (
        <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", background: '#ffffff', borderRadius: 16, overflow: 'hidden', border: '3px solid #1a1a1a', boxShadow: '6px 6px 0 #1a1a1a' }}>
            {/* Header */}
            <div style={{ background: '#1a1a1a', padding: '16px 20px 12px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#e53e3e', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 12px', borderRadius: 3, marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>📋 WHITEBOARD SKETCH</div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1.2 }}>{infTitle}</h2>
                <div style={{ width: '60%', height: 2, background: '#e53e3e', margin: '0 auto' }} />
                {infSubtitle && <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontFamily: 'Arial, sans-serif' }}>{infSubtitle}</p>}
            </div>

            {/* Zigzag flow */}
            <div style={{ padding: '12px 16px 8px', background: '#fafafa' }}>
                {categories.map((cat, ci) => {
                    const color = COLORS[ci % COLORS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    const isEven = ci % 2 === 0;
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, x: isEven ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.06, type: 'spring', stiffness: 180 }}>
                            {/* Connector line (not for first) */}
                            {ci > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 4px' }}>
                                    <div style={{ width: 2, height: 10, borderLeft: `2px dashed ${color}`, opacity: 0.5 }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexDirection: isEven ? 'row' : 'row-reverse', marginBottom: 4 }}>
                                {/* Big circle number */}
                                <div style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${color}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `3px 3px 0 ${color}` }}>
                                    <span style={{ fontSize: 15, fontWeight: 900, color, fontFamily: "'Arial Black', sans-serif" }}>{ci + 1}</span>
                                </div>
                                {/* Content card */}
                                <div style={{ flex: 1, border: `2px solid ${color}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                                    <div style={{ background: color, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {cat.icon && <span style={{ fontSize: 13 }}>{cat.icon}</span>}
                                        <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.label}</span>
                                    </div>
                                    <div style={{ padding: '7px 12px 9px', display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                                        {nodes.map((node, ni) => (
                                            <div key={ni} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', minWidth: '45%' }}>
                                                <span style={{ color, fontWeight: 900, fontSize: 12, lineHeight: '16px', flexShrink: 0 }}>→</span>
                                                <div style={{ fontSize: 11, lineHeight: 1.4, fontFamily: 'Arial, sans-serif' }}>
                                                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{node.label}</span>
                                                    {node.sublabel && <span style={{ color: '#555' }}>{' '}{node.sublabel}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#1a1a1a', padding: '7px', textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>makepost.pro • Whiteboard Sketch</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CORPORATE MODERN
   Layout: Two-column table — left = colored number block + category name,
   right = bullet content. Clean horizontal dividers between rows.
══════════════════════════════════════════════════════════════════════════════ */
function CorporateRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const COLS = [
        { dark: '#1e3a8a', mid: '#1d4ed8', light: '#dbeafe' },
        { dark: '#065f46', mid: '#059669', light: '#d1fae5' },
        { dark: '#6b21a8', mid: '#7c3aed', light: '#ede9fe' },
        { dark: '#7c2d12', mid: '#ea580c', light: '#ffedd5' },
        { dark: '#134e4a', mid: '#0891b2', light: '#cffafe' },
        { dark: '#713f12', mid: '#d97706', light: '#fef3c7' },
        { dark: '#4c1d95', mid: '#8b5cf6', light: '#f5f3ff' },
        { dark: '#881337', mid: '#e11d48', light: '#ffe4e6' },
        { dark: '#14532d', mid: '#16a34a', light: '#dcfce7' },
        { dark: '#1e3a5f', mid: '#0284c7', light: '#e0f2fe' },
    ];

    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f8faff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e0e7ff', boxShadow: '0 12px 40px rgba(30,58,138,0.12)' }}>
            {/* Gradient header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#60a5fa 100%)', padding: '18px 22px 14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', bottom: -40, left: 20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, position: 'relative' }}>💼 CORPORATE MODERN</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 5px', lineHeight: 1.25, position: 'relative' }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 12, color: '#93c5fd', margin: 0, position: 'relative', fontStyle: 'italic' }}>{infSubtitle}</p>}
            </div>

            {/* Table-style rows: left number+label | right bullets */}
            <div style={{ background: '#fff' }}>
                {categories.map((cat, ci) => {
                    const col = COLS[ci % COLS.length];
                    const nodes = (cat.nodes || []).slice(0, 4);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                            style={{ display: 'flex', borderBottom: ci < categories.length - 1 ? '1px solid #e0e7ff' : 'none', minHeight: 56 }}>
                            {/* Left: colored number panel */}
                            <div style={{ width: 90, flexShrink: 0, background: col.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', gap: 3 }}>
                                <div style={{ fontSize: 22, fontWeight: 900, color: col.light, lineHeight: 1, fontFamily: 'Georgia, serif' }}>
                                    {String(ci + 1).padStart(2, '0')}
                                </div>
                                <div style={{ fontSize: 9, color: col.light, opacity: 0.7, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.2 }}>{cat.icon || '●'}</div>
                            </div>
                            {/* Middle: category name */}
                            <div style={{ width: 110, flexShrink: 0, background: col.light, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRight: `2px solid ${col.mid}20` }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: col.dark, textAlign: 'center', lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{cat.label}</span>
                            </div>
                            {/* Right: bullets */}
                            <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: '3px 16px', alignContent: 'center' }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', minWidth: '45%' }}>
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.mid, marginTop: 4, flexShrink: 0 }} />
                                        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#64748b', fontSize: 10 }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#1e3a8a', padding: '7px', textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: '#93c5fd', letterSpacing: 1 }}>makepost.pro • Corporate Modern</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE GUIDE
   Layout: Full-width numbered rows. Each row = giant glowing number on left
   + category title + tags across the full width. Dark terminal aesthetic.
══════════════════════════════════════════════════════════════════════════════ */
function ExecutiveRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const GLOWS = ['#58a6ff','#3fb950','#f78166','#d2a8ff','#ffa657','#79c0ff','#56d364','#ff7b72','#cae8ff','#ffdcd7'];

    return (
        <div style={{ fontFamily: "'Consolas','Courier New',monospace", background: '#0d1117', borderRadius: 16, overflow: 'hidden', border: '1px solid #30363d', boxShadow: '0 0 0 1px #21262d, 0 20px 60px rgba(0,0,0,0.7)' }}>
            {/* Header */}
            <div style={{ background: '#161b22', padding: '16px 22px 14px', borderBottom: '2px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 9, color: '#58a6ff', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 5 }}>⚡ EXECUTIVE GUIDE</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f6fc', margin: 0, lineHeight: 1.25 }}>{infTitle}</h2>
                    {infSubtitle && <p style={{ fontSize: 11, color: '#8b949e', margin: '4px 0 0', fontFamily: 'sans-serif' }}>{infSubtitle}</p>}
                </div>
                <div style={{ fontSize: 28, opacity: 0.3 }}>{'</>'}</div>
            </div>

            {/* Full-width numbered rows */}
            <div style={{ padding: '8px 0' }}>
                {categories.map((cat, ci) => {
                    const glow = GLOWS[ci % GLOWS.length];
                    const nodes = (cat.nodes || []).slice(0, 5);
                    return (
                        <motion.div key={ci} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.05 }}
                            style={{ borderBottom: '1px solid #21262d', padding: '10px 16px', background: ci % 2 === 0 ? '#0d1117' : '#111820' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                {/* Giant number */}
                                <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: glow, lineHeight: 1, textShadow: `0 0 12px ${glow}60` }}>
                                        {String(ci + 1).padStart(2, '0')}
                                    </div>
                                </div>
                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: glow, textTransform: 'uppercase', letterSpacing: 1.2 }}>{cat.icon && `${cat.icon} `}{cat.label}</span>
                                        <div style={{ flex: 1, height: 1, background: `${glow}30` }} />
                                    </div>
                                    {/* Tags row for each bullet */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {nodes.map((node, ni) => (
                                            <div key={ni} style={{ background: `${glow}12`, border: `1px solid ${glow}30`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'sans-serif' }}>
                                                <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{node.label}</span>
                                                {node.sublabel && <span style={{ color: '#6e7681', marginLeft: 4 }}>{node.sublabel}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#010409', padding: '7px', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <span style={{ fontSize: 9, color: '#484f58', letterSpacing: 1 }}>makepost.pro • Executive Guide</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HANDWRITTEN NOTES — Whiteboard Sketchnote
   Pure flow layout (no absolute positioning): top spokes / middle row / bottom
   spokes connected by dashed CSS lines. Always renders correctly.
══════════════════════════════════════════════════════════════════════════════ */
function HandwrittenRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle   = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';

    const LC = [
        { bg: '#bbf7d0', bd: '#16a34a' },
        { bg: '#bfdbfe', bd: '#2563eb' },
        { bg: '#ddd6fe', bd: '#7c3aed' },
        { bg: '#fef08a', bd: '#ca8a04' },
        { bg: '#fecaca', bd: '#dc2626' },
        { bg: '#a5f3fc', bd: '#0891b2' },
        { bg: '#fed7aa', bd: '#ea580c' },
        { bg: '#fbcfe8', bd: '#db2777' },
    ];
    const ICONS = ['💡','⚙️','🧠','👁️','🌐','📊','🎯','🔧','⚡','🚀','💎','🔑'];

    // First 6 → hub diagram (2 top, 2 sides, 2 bottom). Rest → bottom panels.
    const hub    = categories.slice(0, 6);
    const botCats = categories.slice(6);
    const top    = hub.slice(0, 2);
    const left   = hub[2] || null;
    const right  = hub[3] || null;
    const bottom = hub.slice(4, 6);
    const botLeft  = botCats.filter((_, i) => i % 2 === 0);
    const botRight = botCats.filter((_, i) => i % 2 === 1);

    // Small card for hub spokes
    const SpokeCard = ({ cat, ci }) => {
        const lc = LC[ci % LC.length];
        const icon = cat?.icon || ICONS[ci % ICONS.length];
        const nodes = (cat?.nodes || []).slice(0, 2);
        return (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ci * 0.06 }}
                style={{ background: lc.bg, border: `2.5px solid ${lc.bd}`, borderRadius: 8, padding: '6px 8px', textAlign: 'center', minWidth: 80, maxWidth: 110, boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>{icon}</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', fontFamily: "'Arial Black',sans-serif", lineHeight: 1.3 }}>{cat?.label}</div>
                {nodes.map((n, ni) => <div key={ni} style={{ fontSize: 8, color: '#333', fontFamily: 'Arial,sans-serif', lineHeight: 1.3, marginTop: 1 }}>{n.label}</div>)}
            </motion.div>
        );
    };

    // Floating-label box for bottom panels
    const FloatBox = ({ cat, ci }) => {
        const lc = LC[ci % LC.length];
        const icon = cat?.icon || ICONS[ci % ICONS.length];
        const nodes = (cat?.nodes || []).slice(0, 4);
        return (
            <div style={{ position: 'relative', border: `2px solid ${lc.bd}`, borderRadius: 7, padding: '18px 10px 10px', marginBottom: 10 }}>
                <div style={{ position: 'absolute', top: -12, left: 8, background: lc.bg, border: `2px solid ${lc.bd}`, borderRadius: 5, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, zIndex: 1 }}>
                    <span style={{ fontSize: 12 }}>{icon}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: "'Arial Black',sans-serif", whiteSpace: 'nowrap' }}>{cat?.label}</span>
                </div>
                {nodes.map((n, ni) => (
                    <div key={ni} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ color: lc.bd, fontWeight: 900, fontSize: 13, lineHeight: '15px', flexShrink: 0 }}>•</span>
                        <div style={{ fontSize: 11, fontFamily: 'Arial,sans-serif', lineHeight: 1.4, color: '#1a1a1a' }}>
                            <b>{n.label}</b>{n.sublabel && <span style={{ color: '#555', fontWeight: 400 }}>{' — '}{n.sublabel}</span>}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Dashed vertical connector bar
    const DashV = ({ count = 1 }) => (
        <div style={{ display: 'flex', justifyContent: count === 2 ? 'space-around' : 'center', padding: '0 20px' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} style={{ width: 2, height: 18, borderLeft: '2.5px dashed #888' }} />
            ))}
        </div>
    );

    return (
        <div style={{ fontFamily: "'Arial Black',Impact,sans-serif", background: '#fff', borderRadius: 14, border: '4px solid #1a1a1a', boxShadow: '6px 6px 0 #bbb', overflow: 'hidden' }}>

            {/* ── TITLE ── */}
            <div style={{ padding: '16px 20px 12px', textAlign: 'center', borderBottom: '3px solid #1a1a1a' }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1.1, margin: '0 0 5px', fontFamily: "'Arial Black',Impact,sans-serif" }}>{infTitle}</h1>
                <div style={{ width: '80%', height: 3, background: '#1a1a1a', margin: '0 auto 10px', borderRadius: 2 }} />
                {infSubtitle && (
                    <div style={{ display: 'inline-block', background: '#bfdbfe', border: '2px solid #1a1a1a', borderRadius: 7, padding: '3px 18px' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Arial,sans-serif' }}>{infSubtitle}</span>
                    </div>
                )}
            </div>

            {/* ── HUB DIAGRAM (flow layout, no absolute positions) ── */}
            <div style={{ margin: '10px', border: '2px solid #555', borderRadius: 8, padding: '12px 8px 14px', background: '#fff' }}>

                {/* TOP ROW: 2 spokes */}
                {top.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 0 }}>
                        {top.map((cat, i) => <SpokeCard key={i} cat={cat} ci={i} />)}
                    </div>
                )}

                {/* Vertical connectors top → hub */}
                {top.length > 0 && <DashV count={top.length} />}

                {/* MIDDLE ROW: left spoke ——— hub ——— right spoke */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {left && <SpokeCard cat={left} ci={2} />}
                    <div style={{ flex: 1, borderTop: '2.5px dashed #888', minWidth: 6 }} />

                    {/* Hub circle */}
                    <div style={{
                        width: 82, height: 82, borderRadius: '50%', flexShrink: 0,
                        border: '3px solid #16a34a', background: '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
                    }}>
                        <div style={{ fontSize: 26 }}>🤖</div>
                        <div style={{ fontSize: 7.5, fontWeight: 900, color: '#14532d', textTransform: 'uppercase', lineHeight: 1.2, maxWidth: 64, fontFamily: "'Arial Black',sans-serif" }}>
                            {(infTitle || '').split(' ').slice(0, 3).join(' ')}
                        </div>
                    </div>

                    <div style={{ flex: 1, borderTop: '2.5px dashed #888', minWidth: 6 }} />
                    {right && <SpokeCard cat={right} ci={3} />}
                </div>

                {/* Vertical connectors hub → bottom */}
                {bottom.length > 0 && <DashV count={bottom.length} />}

                {/* BOTTOM ROW: 2 spokes */}
                {bottom.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 0 }}>
                        {bottom.map((cat, i) => <SpokeCard key={i} cat={cat} ci={4 + i} />)}
                    </div>
                )}
            </div>

            {/* ── BOTTOM PANELS ── */}
            {botCats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', margin: '0 10px 10px', border: '2px solid #555', borderRadius: 8, background: '#fff' }}>
                    <div style={{ padding: '18px 12px 12px', borderRight: '2px solid #555' }}>
                        {botLeft.map((cat, i) => <FloatBox key={i} cat={cat} ci={i * 2} />)}
                    </div>
                    <div style={{ padding: '18px 12px 12px' }}>
                        {botRight.map((cat, i) => <FloatBox key={i} cat={cat} ci={i * 2 + 1} />)}
                    </div>
                </div>
            )}

            {/* ── FOOTER ── */}
            <div style={{ padding: '7px 14px', borderTop: '3px solid #1a1a1a', background: '#fff', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: '#555', letterSpacing: 1, fontFamily: 'Arial,sans-serif', fontWeight: 600 }}>makepost.pro • Handwritten Notes</span>
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

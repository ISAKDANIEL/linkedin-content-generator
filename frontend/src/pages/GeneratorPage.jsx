import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Copy, RefreshCw, Download, Check, Image, FileText, Palette, Zap, MessageSquare, Target, Hash, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { generateContent, historyAPI, paymentAPI, API_BASE } from '../services/api';
import Logo from '../components/ui/Logo';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';

// ── Download infographic — captures the live rendered React component ──────────
async function downloadInfographic(ref, title) {
    if (!ref?.current) { toast.error('Nothing to download'); return; }
    const safeTitle = (title || 'infographic').replace(/[^a-z0-9_\- ]/gi, '_').trim();
    const filename = `${safeTitle}.png`;
    try {
        toast.loading('Capturing infographic…', { id: 'dl' });
        // Wait a tick so fonts finish rendering
        await new Promise(r => setTimeout(r, 200));
        const dataUrl = await toPng(ref.current, {
            cacheBust: true,
            pixelRatio: 2,           // 2× for crisp high-res output
            backgroundColor: '#ffffff',
            style: { borderRadius: '0' },
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Downloaded as "${filename}"!`, { id: 'dl' });
    } catch (err) {
        console.error('Download error:', err);
        toast.error('Download failed — try again', { id: 'dl' });
    }
}


// ── Visual Infographic Renderer (style-aware) ──────────────────────────────────

/* ══════════════════════════════════════════════════════════════════════════════
   WHITEBOARD SKETCH
   Layout: Alternating zigzag flow — big circle number LEFT then RIGHT, flowing
   down the page with dashed connector lines between rows.
══════════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════════
   WHITEBOARD SKETCH — Vertical roadmap with milestone circles on a timeline
   Left: thick colored circles with icons connected by a vertical line
   Right: content cards with colored accent borders and 2-column bullet grids
══════════════════════════════════════════════════════════════════════════════ */
function WhiteboardRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';

    return (
        <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", background: '#fff', border: '4px solid #111', borderRadius: 10, overflow: 'hidden', boxShadow: '7px 7px 0 #111', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ background: '#111', padding: '12px 22px 10px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, background: (categories[0]?.color || '#e53e3e'), borderRadius: '50%', opacity: 0.18 }} />
                <div style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>📋 WHITEBOARD SKETCH</div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 1.2 }}>{infTitle}</h2>
                {infSubtitle && (
                    <div style={{ display: 'inline-block', background: (categories[0]?.color || '#e53e3e') + '33', border: `1px solid ${categories[0]?.color || '#e53e3e'}66`, borderRadius: 4, padding: '2px 10px', marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: '#e2e8f0', fontWeight: 600, letterSpacing: 0.5 }}>{infSubtitle}</span>
                    </div>
                )}
            </div>

            {/* Timeline body — flex:1 fills remaining height */}
            <div style={{ flex: 1, padding: '8px 12px 6px', background: '#fafafa', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 32, top: 20, bottom: 20, width: 3, background: 'linear-gradient(to bottom, #11111120, #11111140, #11111120)', borderRadius: 2 }} />
                {categories.map((cat, ci) => {
                    const color = cat.color || ['#e53e3e','#dd6b20','#2b6cb0','#276749','#6b46c1','#c05621','#2c7a7b','#97266d','#744210','#1a365d'][ci % 10];
                    const nodes = (cat.nodes || []).slice(0, 3);
                    return (
                        <motion.div key={ci}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                            style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, alignItems: 'stretch', position: 'relative', zIndex: 1, marginBottom: ci < categories.length - 1 ? 4 : 0 }}
                        >
                            {/* Circle milestone */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%', background: color, alignSelf: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, border: '2px solid #fff', boxShadow: `0 3px 10px ${color}50`,
                            }}>
                                <div style={{ fontSize: 12 }}>{cat.icon || '●'}</div>
                            </div>
                            {/* Content card */}
                            <div style={{ flex: 1, background: '#fff', border: `1.5px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: '0 6px 6px 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <div style={{ background: `${color}14`, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${color}18`, flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{cat.label}</span>
                                    <div style={{ fontSize: 9, background: color, color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700, marginLeft: 'auto' }}>{ci + 1}</div>
                                </div>
                                <div style={{ padding: '4px 10px 5px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                    {nodes.map((node, ni) => (
                                        <div key={ni} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                                            <span style={{ color, fontWeight: 900, fontSize: 11, lineHeight: '14px', flexShrink: 0 }}>▸</span>
                                            <div style={{ fontSize: 10, lineHeight: 1.3 }}>
                                                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{node.label}</span>
                                                {node.sublabel && <span style={{ color: '#64748b', fontSize: 9 }}>{' — '}{node.sublabel}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#111', padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 1.5 }}>makepost.pro • Whiteboard Sketch</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CORPORATE MODERN — Premium business dashboard with deep gradient header,
   bold icon circles, colored left-accent bars, and 2-column bullet grids.
══════════════════════════════════════════════════════════════════════════════ */
function CorporateRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';

    return (
        <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: '#f8faff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e0e7ff', boxShadow: '0 16px 48px rgba(30,58,138,0.14)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Gradient header */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#1d4ed8 100%)', padding: '14px 20px 12px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ fontSize: 9, color: '#93c5fd', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 5, position: 'relative' }}>💼 CORPORATE MODERN</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 4px', lineHeight: 1.2, position: 'relative' }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 10, color: '#93c5fd', margin: 0, position: 'relative', fontStyle: 'italic' }}>{infSubtitle}</p>}
                <div style={{ display: 'flex', gap: 3, marginTop: 8, position: 'relative' }}>
                    {categories.slice(0, 10).map((_, i) => (
                        <motion.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                            style={{ height: 3, flex: 1, background: i < 3 ? '#60a5fa' : i < 6 ? '#93c5fd' : '#bfdbfe', borderRadius: 2, transformOrigin: 'left' }} />
                    ))}
                </div>
            </div>

            {/* Rows — flex:1 fills remaining height, each row flex:1 */}
            <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {categories.map((cat, ci) => {
                    const color = cat.color || '#1d4ed8';
                    const nodes = (cat.nodes || []).slice(0, 3);
                    return (
                        <motion.div key={ci}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: ci * 0.05 }}
                            style={{ display: 'flex', flex: 1, minHeight: 0, borderBottom: ci < categories.length - 1 ? '1px solid #f0f4ff' : 'none', background: ci % 2 === 0 ? '#fff' : '#fafcff' }}
                        >
                            <div style={{ width: 4, flexShrink: 0, background: `linear-gradient(to bottom, ${color}, ${color}80)` }} />
                            <div style={{ width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}15`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 13 }}>{cat.icon || '●'}</span>
                                </div>
                            </div>
                            <div style={{ width: 90, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '4px 6px 4px 0', borderRight: `1px solid ${color}15` }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 1.3 }}>{cat.label}</div>
                                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>{ci + 1}/{categories.length}</div>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                {nodes.map((node, ni) => (
                                    <div key={ni} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 3, flexShrink: 0 }} />
                                        <div style={{ fontSize: 10, lineHeight: 1.3 }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{node.label}</span>
                                            {node.sublabel && <span style={{ color: '#64748b', fontSize: 9 }}>{' — '}{node.sublabel}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: 'linear-gradient(90deg,#0f172a,#1e3a8a)', padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: '#93c5fd', letterSpacing: 1.5 }}>makepost.pro • Corporate Modern</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE GUIDE — Dark terminal aesthetic with neon glows, giant numbers,
   and syntax-highlight colored section headers on #0d1117 background.
══════════════════════════════════════════════════════════════════════════════ */
function ExecutiveRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const infTitle = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const GLOWS = ['#58a6ff','#3fb950','#f78166','#d2a8ff','#ffa657','#79c0ff','#56d364','#ff7b72','#cae8ff','#ffdcd7'];

    return (
        <div style={{ fontFamily: "'Consolas','Courier New',monospace", background: '#0d1117', borderRadius: 12, overflow: 'hidden', border: '1px solid #30363d', boxShadow: '0 0 0 1px #21262d, 0 24px 64px rgba(0,0,0,0.8)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Terminal title bar */}
            <div style={{ background: '#161b22', padding: '8px 16px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                    {['#ff5f56','#ffbd2e','#27c93f'].map((c, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#8b949e' }}>executive-guide.md — {infTitle}</span>
                </div>
            </div>

            {/* Content header */}
            <div style={{ background: '#0d1117', padding: '12px 20px 10px', borderBottom: '2px solid #21262d', flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: '#58a6ff', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>⚡ EXECUTIVE GUIDE</div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f0f6fc', margin: '0 0 3px', lineHeight: 1.25 }}>{infTitle}</h2>
                {infSubtitle && <p style={{ fontSize: 10, color: '#8b949e', margin: 0, fontFamily: 'sans-serif' }}>{infSubtitle}</p>}
            </div>

            {/* Entries — flex:1, each entry flex:1 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {categories.map((cat, ci) => {
                    const glow = cat.color || GLOWS[ci % GLOWS.length];
                    const nodes = (cat.nodes || []).slice(0, 3);
                    return (
                        <motion.div key={ci}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.05 }}
                            style={{ flex: 1, minHeight: 0, borderBottom: '1px solid #21262d', padding: '5px 14px', background: ci % 2 === 0 ? '#0d1117' : '#0a0f16', display: 'flex', alignItems: 'center' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                                <div style={{ width: 36, flexShrink: 0 }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: glow, lineHeight: 1, textShadow: `0 0 14px ${glow}80` }}>
                                        {String(ci + 1).padStart(2, '0')}
                                    </div>
                                    <div style={{ fontSize: 13, marginTop: 1 }}>{cat.icon || '▸'}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: glow, textTransform: 'uppercase', letterSpacing: 1, textShadow: `0 0 6px ${glow}40` }}>{cat.label}</span>
                                        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${glow}40, transparent)` }} />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        {nodes.map((node, ni) => (
                                            <div key={ni} style={{ background: `${glow}10`, border: `1px solid ${glow}35`, borderRadius: 4, padding: '2px 7px' }}>
                                                <span style={{ color: '#c9d1d9', fontWeight: 600, fontSize: 9, fontFamily: 'sans-serif' }}>{node.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ background: '#010409', padding: '5px', textAlign: 'center', borderTop: '1px solid #21262d', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: '#484f58', letterSpacing: 1.5 }}>makepost.pro • Executive Guide</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HANDWRITTEN NOTES — Reference-exact sketchnote
   Layout mirrors the "What is an AI Agent?" whiteboard image:
   ┌─────────────────────────────────────────────────────┐
   │  TITLE (bold, ALL CAPS, thick underline)            │
   │  ┌─── [SUBTITLE in blue box] ────────────────────┐  │
   │  │   hub-and-spoke, 6 white boxes, dashed arrows  │  │
   │  └────────────────────────────────────────────────┘  │
   │  ┌──[green: TYPES]──┐  ┌──[3 colored rows]──────┐   │
   │  │  bullet list     │  │  ██ Label + icon        │   │
   │  │                  │  │  ██ Label + icon        │   │
   │  └──────────────────┘  │  ██ Label + icon        │   │
   │                        └────────────────────────-┘   │
   └─────────────────────────────────────────────────────┘
══════════════════════════════════════════════════════════════════════════════ */
// ── Notebook Variant 0: Classic Ruled Paper (cream + blue lines + red margin) ─
function HWRuledPaper({ infographic, title, HF }) {
    const categories = infographic?.categories || [];
    const infTitle   = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const left  = categories.slice(0, 5);
    const right = categories.slice(5, 10);
    return (
        <div style={{ fontFamily: HF, height: '100%', display: 'flex', flexDirection: 'column', background: '#fefdf5', backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, #c8d8f0 24px, #c8d8f0 25px)', border: '1px solid #c8bca0', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
            {/* Red margin line */}
            <div style={{ position: 'absolute', left: 42, top: 0, bottom: 0, width: 1.5, background: '#e8a0a0', zIndex: 1, pointerEvents: 'none' }} />
            {/* Title */}
            <div style={{ paddingLeft: 54, paddingRight: 14, paddingTop: 10, paddingBottom: 5, flexShrink: 0, position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 23, fontWeight: 700, color: '#111', fontFamily: HF, letterSpacing: 0.5, lineHeight: 1.2 }}>{infTitle}</div>
                <div style={{ width: '88%', height: 2, background: '#333', margin: '4px 0 2px', borderRadius: 1 }} />
                {infSubtitle && <div style={{ fontSize: 11, color: '#888', fontFamily: HF, fontStyle: 'italic' }}>{infSubtitle}</div>}
            </div>
            {/* 2-column notes */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', paddingLeft: 54, paddingRight: 14, paddingBottom: 4, gap: '0 16px', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
                {[left, right].map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
                        {col.map((cat, i) => {
                            const idx = ci === 0 ? i : i + 5;
                            const color = cat.color || '#333';
                            return (
                                <div key={i} style={{ flex: 1, minHeight: 0, paddingTop: 3 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: HF, textDecoration: 'underline', textDecorationColor: `${color}90`, textUnderlineOffset: 2, marginBottom: 1, lineHeight: 1.3 }}>
                                        {idx + 1}. {cat.icon} {cat.label}
                                    </div>
                                    {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                        <div key={ni} style={{ display: 'flex', gap: 4, paddingLeft: 8, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#aaa', fontSize: 13, lineHeight: '18px', flexShrink: 0 }}>–</span>
                                            <span style={{ fontSize: 10, fontFamily: HF, color: '#2a2a2a', lineHeight: 1.6 }}>
                                                <strong style={{ color }}>{n.label}</strong>
                                                {n.sublabel && <span style={{ color: '#777', fontWeight: 400, fontSize: 9.5 }}>: {n.sublabel}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 4, paddingLeft: 54, position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: 9, color: '#bbb', fontFamily: HF }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

// ── Notebook Variant 1: Graph / Grid Paper ────────────────────────────────────
function HWGraphPaper({ infographic, title, HF }) {
    const categories  = infographic?.categories || [];
    const infTitle    = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const left  = categories.slice(0, 5);
    const right = categories.slice(5, 10);
    return (
        <div style={{ fontFamily: HF, height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f8ff', backgroundImage: 'linear-gradient(#dde8ff 1px, transparent 1px), linear-gradient(90deg, #dde8ff 1px, transparent 1px)', backgroundSize: '20px 20px', border: '1px solid #c0c8e8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 6px', flexShrink: 0, background: 'rgba(255,255,255,0.75)', borderBottom: '2.5px solid #334' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: HF, textAlign: 'center', letterSpacing: 0.5 }}>{infTitle}</div>
                {infSubtitle && <div style={{ fontSize: 11, color: '#888', fontFamily: HF, fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>{infSubtitle}</div>}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 14px 4px', gap: '0 14px', overflow: 'hidden' }}>
                {[left, right].map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
                        {col.map((cat, i) => {
                            const idx = ci === 0 ? i : i + 5;
                            const color = cat.color || '#3344aa';
                            return (
                                <div key={i} style={{ flex: 1, minHeight: 0, paddingTop: 3, borderLeft: `3px solid ${color}`, paddingLeft: 7, marginBottom: 3 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: HF, marginBottom: 1, lineHeight: 1.3 }}>
                                        {cat.icon} {cat.label}
                                    </div>
                                    {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                        <div key={ni} style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                                            <span style={{ color, fontSize: 11, lineHeight: '17px', flexShrink: 0 }}>◦</span>
                                            <span style={{ fontSize: 10, fontFamily: HF, color: '#222', lineHeight: 1.55 }}>
                                                <strong>{n.label}</strong>
                                                {n.sublabel && <span style={{ color: '#666', fontSize: 9 }}>: {n.sublabel}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 5, background: 'rgba(255,255,255,0.6)' }}>
                <span style={{ fontSize: 9, color: '#aab', fontFamily: HF }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

// ── Notebook Variant 2: Yellow Legal Pad ─────────────────────────────────────
function HWLegalPad({ infographic, title, HF }) {
    const categories  = infographic?.categories || [];
    const infTitle    = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const left  = categories.slice(0, 5);
    const right = categories.slice(5, 10);
    return (
        <div style={{ fontFamily: HF, height: '100%', display: 'flex', flexDirection: 'column', background: '#fefce2', backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, #e0d060 23px, #e0d060 24px)', border: '1px solid #c0a830', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            {/* Red top horizontal rule */}
            <div style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 1.5, background: '#e88080', zIndex: 1 }} />
            <div style={{ padding: '10px 14px 6px', flexShrink: 0, position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: HF, letterSpacing: 0.5 }}>{infTitle}</div>
                {infSubtitle && <div style={{ fontSize: 11, color: '#887730', fontFamily: HF, fontStyle: 'italic', marginTop: 1 }}>{infSubtitle}</div>}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px 14px 4px', gap: '0 16px', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
                {[left, right].map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
                        {col.map((cat, i) => {
                            const color = cat.color || '#7a4010';
                            return (
                                <div key={i} style={{ flex: 1, minHeight: 0, paddingTop: 2 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: HF, lineHeight: 1.3, marginBottom: 1 }}>
                                        {cat.icon} {cat.label}
                                    </div>
                                    {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                        <div key={ni} style={{ display: 'flex', gap: 4, paddingLeft: 6, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#888', fontSize: 12, lineHeight: '17px', flexShrink: 0 }}>•</span>
                                            <span style={{ fontSize: 10, fontFamily: HF, color: '#1a1a1a', lineHeight: 1.55 }}>
                                                <strong>{n.label}</strong>
                                                {n.sublabel && <span style={{ color: '#666', fontSize: 9 }}>: {n.sublabel}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 5, position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: 9, color: '#b0a040', fontFamily: HF }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

// ── Notebook Variant 3: Dark Moleskine ───────────────────────────────────────
function HWMoleskine({ infographic, title, HF }) {
    const categories  = infographic?.categories || [];
    const infTitle    = infographic?.title || title;
    const infSubtitle = infographic?.subtitle || '';
    const left  = categories.slice(0, 5);
    const right = categories.slice(5, 10);
    return (
        <div style={{ fontFamily: HF, height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a2e', backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, #22223a 24px, #22223a 25px)', border: '1px solid #333', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px 8px', flexShrink: 0, borderBottom: '1px solid #3a3a5a' }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: '#f0e8d0', fontFamily: HF, textAlign: 'center', letterSpacing: 1 }}>{infTitle}</div>
                <div style={{ width: '80%', height: 1, background: '#c8b870', margin: '5px auto 0', borderRadius: 1 }} />
                {infSubtitle && <div style={{ fontSize: 10, color: '#9090a8', fontFamily: HF, fontStyle: 'italic', textAlign: 'center', marginTop: 3 }}>{infSubtitle}</div>}
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 14px 4px', gap: '0 14px', overflow: 'hidden' }}>
                {[left, right].map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
                        {col.map((cat, i) => {
                            const color = cat.color || '#80a0ff';
                            return (
                                <div key={i} style={{ flex: 1, minHeight: 0, paddingTop: 2 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: HF, lineHeight: 1.3, marginBottom: 1 }}>
                                        {cat.icon} {cat.label}
                                    </div>
                                    {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                        <div key={ni} style={{ display: 'flex', gap: 3, paddingLeft: 6, alignItems: 'flex-start' }}>
                                            <span style={{ color: '#505070', fontSize: 12, lineHeight: '17px', flexShrink: 0 }}>—</span>
                                            <span style={{ fontSize: 10, fontFamily: HF, color: '#c8c8e0', lineHeight: 1.55 }}>
                                                <strong style={{ color: '#e8e0f0' }}>{n.label}</strong>
                                                {n.sublabel && <span style={{ color: '#7070a0', fontSize: 9 }}>: {n.sublabel}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 5 }}>
                <span style={{ fontSize: 9, color: '#505068', fontFamily: HF }}>makepost.pro • Handwritten Notes</span>
            </div>
        </div>
    );
}

// ── HandwrittenRenderer: randomly picks one of the 4 notebook styles ──────────
function HandwrittenRenderer({ infographic, title }) {
    React.useEffect(() => {
        if (!document.getElementById('caveat-gfont')) {
            const l = document.createElement('link');
            l.id = 'caveat-gfont'; l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap';
            document.head.appendChild(l);
        }
    }, []);
    const HF = "'Caveat','Segoe Print','Comic Sans MS',cursive";
    const [variant] = React.useState(() => Math.floor(Math.random() * 4));
    if (variant === 1) return <HWGraphPaper infographic={infographic} title={title} HF={HF} />;
    if (variant === 2) return <HWLegalPad   infographic={infographic} title={title} HF={HF} />;
    if (variant === 3) return <HWMoleskine  infographic={infographic} title={title} HF={HF} />;
    return <HWRuledPaper infographic={infographic} title={title} HF={HF} />;
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


// ── Main Generator Page ────────────────────────────────────────────────────────
export default function GeneratorPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentHistoryId, setCurrentHistoryId] = useState(null);
    const [formData, setFormData] = useState({ title: '', tone: 'Professional', audience: '' });
    const [infographicStyle, setInfographicStyle] = useState('Handwritten Notes');
    const [lastGeneratedStyle, setLastGeneratedStyle] = useState(null);
    const [showPostDetails, setShowPostDetails] = useState(true);
    const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
    const [toneDropdownOpen, setToneDropdownOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [credits, setCredits] = useState(null);
    const [noCreditsModal, setNoCreditsModal] = useState(false);
    const infographicRef = useRef(null);

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
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
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
                                                            e.preventDefault();
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
                        <div style={{ padding: 24, flex: 1, overflowY: 'auto', backgroundColor: '#f3f4f6' }}>
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
                                            {/* Fixed 4:5 LinkedIn portrait ratio */}
                                            <div style={{ maxWidth: 480, margin: '0 auto', aspectRatio: '4/5', overflow: 'hidden', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                                                <div ref={infographicRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                                                    <InfographicRenderer content={c} title={formData.title} style={infographicStyle} />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                                                <button onClick={() => downloadInfographic(infographicRef, formData.title)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 36px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 25px rgba(197,68,68,0.4)', transition: 'all 0.3s' }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    <Download size={22} /> Download Infographic
                                                </button>
                                            </div>
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

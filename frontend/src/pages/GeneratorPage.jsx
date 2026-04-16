import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Copy, RefreshCw, Download, Check, Image, FileText, Palette, Zap, MessageSquare, Target, Hash, ChevronDown, ChevronUp, ShoppingCart, GitBranch, BarChart2, Map, Lightbulb } from 'lucide-react';
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
            skipFonts: true,         // skip cross-origin Google Fonts CSS (prevents SecurityError)
            onClone: (clonedDoc) => {
                clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    if (link.href && link.href.includes('googleapis.com')) link.remove();
                });
            },
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
   SHARED: TieredGuide — Executive's Guide 3-column tiered layout
   Left: use cases + needs  |  Center: colored cylinder  |  Right: risks + insight
══════════════════════════════════════════════════════════════════════════════ */
function TieredGuide({ tiers, title, theme }) {
    const T = theme;
    return (
        <div style={{ background: T.bg, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: T.fontFamily || "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>

            {/* ── HEADER ── */}
            <div style={{ background: T.headerBg, padding: '14px 18px 12px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -25, right: -25, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', bottom: -15, left: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ textAlign: 'center', position: 'relative' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.headerSubColor, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 7 }}>THE COMPLETE GUIDE TO</div>
                    <div style={{ display: 'inline-block', background: T.headerAccent, borderRadius: 8, padding: '5px 22px', marginBottom: 4, boxShadow: `0 4px 16px ${T.headerAccent}60` }}>
                        <span style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.25)' }}>{title}</span>
                    </div>
                </div>
                {/* Bottom accent line */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.headerAccent }} />
            </div>

            {/* ── COLUMN HEADERS ── */}
            <div style={{ background: T.colHdrBg, display: 'flex', alignItems: 'center', padding: '4px 8px', flexShrink: 0 }}>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 7, fontWeight: 800, color: T.colHdrColor, letterSpacing: 1.5, textTransform: 'uppercase' }}>USE CASES &amp; WHAT IT NEEDS</div>
                <div style={{ width: '26%' }} />
                <div style={{ flex: 1, textAlign: 'center', fontSize: 7, fontWeight: 800, color: T.colHdrColor, letterSpacing: 1.5, textTransform: 'uppercase' }}>KEY RISKS &amp; INSIGHTS</div>
            </div>

            {/* ── TIER ROWS ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 8px 4px', minHeight: 0 }}>
                {tiers.map((tier, i) => {
                    const color = tier.color || ['#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE'][i % 5];
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, type: 'spring', stiffness: 180, damping: 22 }}
                            style={{ flex: 1, display: 'flex', gap: 5, minHeight: 0 }}
                        >
                            {/* Left panel */}
                            <div style={{ flex: 1, background: T.panelBg, borderRadius: 6, padding: '5px 8px', border: T.panelBorder, borderTop: `3px solid ${color}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 2, minWidth: 0 }}>
                                {(tier.use_cases || []).length > 0 && <>
                                    <div style={{ fontSize: 6.5, fontWeight: 800, color, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1, flexShrink: 0 }}>Use Cases</div>
                                    {(tier.use_cases || []).slice(0, 2).map((uc, j) => (
                                        <div key={j} style={{ fontSize: 8, color: T.bodyText, lineHeight: 1.3, display: 'flex', gap: 3, flexShrink: 0 }}>
                                            <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: 9, lineHeight: '12px' }}>→</span>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{uc}</span>
                                        </div>
                                    ))}
                                </>}
                                {(tier.what_needs || []).length > 0 && <>
                                    <div style={{ fontSize: 6.5, fontWeight: 800, color, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 3, marginBottom: 1, flexShrink: 0 }}>What It Needs</div>
                                    {(tier.what_needs || []).slice(0, 2).map((wn, j) => (
                                        <div key={j} style={{ fontSize: 8, color: T.bodyText, lineHeight: 1.3, display: 'flex', gap: 3, flexShrink: 0 }}>
                                            <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: 9, lineHeight: '12px' }}>→</span>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{wn}</span>
                                        </div>
                                    ))}
                                </>}
                            </div>

                            {/* Center cylinder */}
                            <div style={{
                                width: '26%', background: color, borderRadius: 12,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '6px 5px', overflow: 'hidden', flexShrink: 0,
                                boxShadow: `0 4px 16px ${color}50, inset 0 -3px 8px rgba(0,0,0,0.18), inset 0 3px 8px rgba(255,255,255,0.18)`,
                                position: 'relative',
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 8, background: 'rgba(255,255,255,0.22)', borderRadius: '0 0 50% 50%' }} />
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2, textShadow: '0 2px 4px rgba(0,0,0,0.3)', position: 'relative', padding: '0 2px' }}>{tier.name}</div>
                                {tier.tagline && (
                                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.88)', textAlign: 'center', marginTop: 3, lineHeight: 1.25, fontStyle: 'italic', position: 'relative', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tier.tagline}</div>
                                )}
                            </div>

                            {/* Right panel */}
                            <div style={{ flex: 1, background: T.panelBg, borderRadius: 6, padding: '5px 8px', border: T.panelBorder, borderTop: `3px solid ${color}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 2, minWidth: 0 }}>
                                {(tier.key_risks || []).length > 0 && <>
                                    <div style={{ fontSize: 6.5, fontWeight: 800, color, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1, flexShrink: 0 }}>Key Risks</div>
                                    {(tier.key_risks || []).slice(0, 2).map((kr, j) => (
                                        <div key={j} style={{ fontSize: 8, color: T.bodyText, lineHeight: 1.3, display: 'flex', gap: 3, flexShrink: 0 }}>
                                            <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: 9, lineHeight: '12px' }}>→</span>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{kr}</span>
                                        </div>
                                    ))}
                                </>}
                                {tier.insight && (
                                    <div style={{ fontSize: 7.5, color: T.insightColor, fontStyle: 'italic', marginTop: 3, lineHeight: 1.3, borderTop: `1px solid ${color}25`, paddingTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tier.insight}</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── FOOTER ── */}
            <div style={{ background: T.footerBg, padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8.5, color: T.footerText, letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SHARED: CategoryGrid — 2-column card grid fallback when no tiers data
══════════════════════════════════════════════════════════════════════════════ */
function CategoryGrid({ categories, title, theme }) {
    const T = theme;
    const pairs = [];
    for (let i = 0; i < Math.min(categories.length, 10); i += 2) {
        pairs.push([categories[i], categories[i + 1]].filter(Boolean));
    }
    return (
        <div style={{ background: T.bg, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: T.fontFamily || "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            <div style={{ background: T.headerBg, padding: '14px 18px 12px', flexShrink: 0, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: T.headerSubColor, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 7 }}>THE COMPLETE GUIDE TO</div>
                <div style={{ display: 'inline-block', background: T.headerAccent, borderRadius: 8, padding: '5px 22px', boxShadow: `0 4px 16px ${T.headerAccent}60` }}>
                    <span style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</span>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.headerAccent }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '5px 10px 4px', minHeight: 0 }}>
                {pairs.map((pair, pi) => (
                    <div key={pi} style={{ flex: 1, display: 'flex', gap: 5, minHeight: 0 }}>
                        {pair.map((cat, ci) => {
                            const color = cat.color || '#E53E3E';
                            return (
                                <motion.div key={ci}
                                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (pi * 2 + ci) * 0.05 }}
                                    style={{ flex: 1, background: T.panelBg, borderRadius: 8, border: T.panelBorder, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    <div style={{ background: color, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: `0 2px 8px ${color}40` }}>
                                        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{resolveIcon(cat.icon, pi * 2 + ci)}</span>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.3, flex: 1, overflow: 'hidden', lineHeight: 1.2 }}>{cat.label}</span>
                                        <span style={{ fontSize: 8, background: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>{pi * 2 + ci + 1}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '5px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, overflow: 'hidden' }}>
                                        {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                            <div key={ni} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', overflow: 'hidden' }}>
                                                <span style={{ color, fontWeight: 900, fontSize: 11, lineHeight: '13px', flexShrink: 0 }}>›</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontSize: 8.5, fontWeight: 700, color: T.bodyText, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{n.label}</span>
                                                    {n.sublabel && <span style={{ fontSize: 7.5, color: T.insightColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{n.sublabel}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ background: T.footerBg, padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8.5, color: T.footerText, letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   WHITEBOARD SKETCH — Grid paper bg, bold marker title, 2-col colored section cards
══════════════════════════════════════════════════════════════════════════════ */
// Fallback emojis for each category index (0-based)
const CAT_ICONS = ['🧱','⚙️','🔄','✅','🚀','🛠️','📊','💡','⚠️','🔮'];
// Detect if a string is actually an emoji (has non-ASCII / emoji codepoint)
const resolveIcon = (raw, idx) => {
    if (!raw) return CAT_ICONS[idx % CAT_ICONS.length];
    // If it's only ASCII letters/spaces (e.g. "emoji", "icon", "symbol"), use default
    if (/^[\x00-\x7F\s]+$/.test(raw.trim())) return CAT_ICONS[idx % CAT_ICONS.length];
    return raw;
};

function WhiteboardRenderer({ infographic, title }) {
    const categories = infographic?.categories || [];
    const tiers = infographic?.tiers || [];
    const items = categories.length > 0 ? categories : tiers.map(t => ({
        label: t.name, icon: '📌', color: t.color,
        nodes: [
            ...(t.use_cases || []).slice(0, 1).map(s => ({ label: s })),
            ...(t.what_needs || []).slice(0, 1).map(s => ({ label: s })),
            ...(t.key_risks || []).slice(0, 1).map(s => ({ label: s })),
        ],
    }));
    const pairs = [];
    for (let i = 0; i < Math.min(items.length, 10); i += 2) pairs.push([items[i], items[i + 1]].filter(Boolean));
    const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1'];
    return (
        <div style={{ background: '#ffffff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
            {/* Grid paper texture */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px),linear-gradient(90deg,#e5e7eb 1px,transparent 1px)', backgroundSize: '22px 22px', opacity: 0.35, pointerEvents: 'none' }} />
            {/* Header — no absolute children, use border-bottom as underline anchor */}
            <div style={{ padding: '12px 18px 14px', flexShrink: 0, position: 'relative', textAlign: 'center' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: '#9ca3af', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>WHITEBOARD SESSION</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.2 }}>
                    {title}
                </div>
                {/* Red marker underline — below the title text, inside header padding */}
                <div style={{ width: '60%', maxWidth: 220, height: 4, background: '#ef4444', borderRadius: 2, margin: '6px auto 0', transform: 'rotate(-0.4deg)' }} />
            </div>
            {/* Hairline separator */}
            <div style={{ height: 2, background: '#111827', flexShrink: 0 }} />
            {/* Card grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px 4px', minHeight: 0, position: 'relative' }}>
                {pairs.map((pair, pi) => (
                    <div key={pi} style={{ flex: 1, display: 'flex', gap: 5, minHeight: 0 }}>
                        {pair.map((cat, ci) => {
                            const color = cat.color || COLORS[(pi * 2 + ci) % COLORS.length];
                            return (
                                <motion.div key={ci}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (pi * 2 + ci) * 0.05 }}
                                    style={{ flex: 1, background: '#fff', borderRadius: 6, border: `2px solid ${color}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, boxShadow: `3px 3px 0 ${color}30` }}
                                >
                                    <div style={{ background: color, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{resolveIcon(cat.icon, pi * 2 + ci)}</span>
                                        <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.3, flex: 1, overflow: 'hidden', lineHeight: 1.2 }}>{cat.label}</span>
                                        <span style={{ fontSize: 7.5, fontWeight: 800, color: 'rgba(255,255,255,0.8)', flexShrink: 0, background: 'rgba(0,0,0,0.18)', borderRadius: 4, padding: '1px 5px' }}>{pi * 2 + ci + 1}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5, overflow: 'hidden' }}>
                                        {(cat.nodes || []).slice(0, 3).map((n, ni) => (
                                            <div key={ni} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                                <span style={{ color, fontWeight: 900, fontSize: 10, lineHeight: '13px', flexShrink: 0 }}>✓</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontSize: 8.5, fontWeight: 700, color: '#1f2937', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{n.label}</span>
                                                    {n.sublabel && <span style={{ fontSize: 7, color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{n.sublabel}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#9ca3af', letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CORPORATE MODERN — Dark tech poster, glowing title, neon tier badges
══════════════════════════════════════════════════════════════════════════════ */
function CorporateRenderer({ infographic, title }) {
    const tiers = infographic?.tiers || [];
    const categories = infographic?.categories || [];
    const items = tiers.length > 0 ? tiers : categories.map(c => ({
        name: c.label, color: c.color, tagline: c.nodes?.[0]?.sublabel || '',
        use_cases: (c.nodes || []).slice(0, 2).map(n => n.label),
        what_needs: [],
        key_risks: (c.nodes || []).slice(2, 4).map(n => n.label),
        insight: '',
    }));
    // Shared horizontal padding and center column width — must match between header and rows
    const SIDE_PAD = 10;
    const CTR_W = 90;
    return (
        <div style={{ background: '#070c14', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', color: '#e2e8f0', boxSizing: 'border-box', position: 'relative' }}>
            {/* Glowing header */}
            <div style={{ padding: '14px 20px 10px', flexShrink: 0, textAlign: 'center', position: 'relative', borderBottom: '1px solid rgba(56,189,248,0.2)' }}>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '70%', height: '100%', background: 'radial-gradient(ellipse,rgba(56,189,248,0.09) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 7.5, fontWeight: 700, color: '#38bdf8', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 5 }}>CORPORATE INTELLIGENCE BRIEF</div>
                <div style={{ fontSize: 21, fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 0 28px rgba(56,189,248,0.55),0 0 55px rgba(56,189,248,0.2)' }}>{title}</div>
                <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg,transparent,#38bdf8,transparent)', margin: '7px auto 0' }} />
            </div>
            {/* Column headers — padding matches tier rows exactly */}
            <div style={{ display: 'grid', gridTemplateColumns: `1fr ${CTR_W}px 1fr`, gap: 4, padding: `4px ${SIDE_PAD}px 2px`, flexShrink: 0 }}>
                <div style={{ textAlign: 'center', fontSize: 7, fontWeight: 800, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase' }}>▶ APPLICATIONS</div>
                <div />
                <div style={{ textAlign: 'center', fontSize: 7, fontWeight: 800, color: '#22d3ee', letterSpacing: 2, textTransform: 'uppercase' }}>CRITICAL RISKS ◀</div>
            </div>
            {/* Tier rows */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: `3px ${SIDE_PAD}px 4px`, minHeight: 0 }}>
                {items.map((tier, i) => {
                    const color = tier.color || ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'][i % 5];
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            style={{ flex: 1, display: 'grid', gridTemplateColumns: `1fr ${CTR_W}px 1fr`, gap: 4, minHeight: 0 }}
                        >
                            {/* Left – Applications */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(249,115,22,0.2)', borderLeft: `2px solid #f97316`, borderRadius: 4, padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, overflow: 'hidden', minWidth: 0 }}>
                                {(tier.use_cases || []).slice(0, 2).map((uc, j) => (
                                    <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                                        <span style={{ color: '#f97316', fontWeight: 700, fontSize: 9, flexShrink: 0, lineHeight: '13px' }}>▸</span>
                                        <span style={{ fontSize: 8, color: '#cbd5e1', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{uc}</span>
                                    </div>
                                ))}
                                {(tier.what_needs || []).slice(0, 1).map((wn, j) => (
                                    <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 1 }}>
                                        <span style={{ color: '#94a3b8', fontSize: 9, flexShrink: 0, lineHeight: '13px' }}>◦</span>
                                        <span style={{ fontSize: 7.5, color: '#94a3b8', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{wn}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Center – Neon badge */}
                            <div style={{ background: `linear-gradient(135deg,${color}20,${color}40)`, border: `1px solid ${color}55`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 3px', boxShadow: `0 0 14px ${color}30,inset 0 0 12px rgba(0,0,0,0.3)` }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, marginBottom: 3 }} />
                                <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2, textShadow: `0 0 8px ${color}` }}>{tier.name}</div>
                                {tier.tagline && <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 2, lineHeight: 1.2 }}>{tier.tagline}</div>}
                            </div>
                            {/* Right – Risks */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,211,238,0.2)', borderRight: `2px solid #22d3ee`, borderRadius: 4, padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, overflow: 'hidden', minWidth: 0 }}>
                                {(tier.key_risks || []).slice(0, 2).map((kr, j) => (
                                    <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                                        <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 9, flexShrink: 0, lineHeight: '13px' }}>▸</span>
                                        <span style={{ fontSize: 8, color: '#cbd5e1', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{kr}</span>
                                    </div>
                                ))}
                                {tier.insight && (
                                    <div style={{ fontSize: 7, color: '#64748b', fontStyle: 'italic', marginTop: 2, lineHeight: 1.3, borderTop: '1px solid rgba(100,116,139,0.3)', paddingTop: 2 }}>{tier.insight}</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '5px', textAlign: 'center', flexShrink: 0, borderTop: '1px solid rgba(56,189,248,0.15)' }}>
                <span style={{ fontSize: 8, color: '#475569', letterSpacing: 1.5 }}>makepost.pro  •  CORPORATE INTELLIGENCE SERIES</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXECUTIVE GUIDE — Dark terminal theme, neon accents (tiered layout)
══════════════════════════════════════════════════════════════════════════════ */
function ExecutiveRenderer({ infographic, title }) {
    const tiers = infographic?.tiers || [];
    const categories = infographic?.categories || [];
    const T = {
        bg: '#0d1117', headerBg: '#010409', headerAccent: '#58a6ff',
        headerSubColor: '#8b949e', colHdrBg: '#0a0f16', colHdrColor: '#8b949e',
        panelBg: '#161b22', panelBorder: '1px solid #30363d',
        bodyText: '#c9d1d9', insightColor: '#8b949e',
        footerBg: '#010409', footerText: '#484f58',
    };
    if (tiers.length > 0) return <TieredGuide tiers={tiers} title={title} theme={T} />;
    return <CategoryGrid categories={categories} title={title} theme={T} />;
}

/* ══════════════════════════════════════════════════════════════════════════════
   HANDWRITTEN NOTES — Graph-paper notebook, sketchy icons, hex% badges,
   mini hand-drawn charts, spiral binding on right edge
══════════════════════════════════════════════════════════════════════════════ */

// Mini chart types rendered as SVG sketches
function SketchChart({ type, color, idx }) {
    const sw = 1.4; // stroke-width
    if (type === 'bars') {
        const heights = [0.55, 0.80, 0.45, 1.0, 0.65, 0.70];
        return (
            <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                {heights.map((h, bi) => (
                    <rect key={bi} x={bi * 8 + 1} y={34 - h * 28} width="6" height={h * 28}
                        stroke={color} strokeWidth={sw} fill={`${color}22`}
                        style={{ transform: `rotate(${(bi % 3) * 0.3 - 0.3}deg)` }} />
                ))}
                {/* x-axis */}
                <line x1="0" y1="33" x2="48" y2="33.5" stroke={color} strokeWidth={sw} />
            </svg>
        );
    }
    if (type === 'pie') {
        const pct = [0.72, 0.81, 0.64, 0.47, 0.57, 0.71][idx % 6];
        const angle = pct * 360;
        const r = 14; const cx = 17; const cy = 17;
        const rad = (a) => a * Math.PI / 180;
        const x1 = cx + r * Math.cos(rad(-90));
        const y1 = cy + r * Math.sin(rad(-90));
        const x2 = cx + r * Math.cos(rad(angle - 90));
        const y2 = cy + r * Math.sin(rad(angle - 90));
        const large = angle > 180 ? 1 : 0;
        return (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={sw} fill={`${color}12`} />
                <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
                    fill={`${color}40`} stroke={color} strokeWidth={sw} />
                {/* Hatching lines in filled sector */}
                {[45,55,65].map((a,i) => {
                    const ax = cx + r * Math.cos(rad(a)); const ay = cy + r * Math.sin(rad(a));
                    return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke={color} strokeWidth="0.8" opacity="0.5" />;
                })}
            </svg>
        );
    }
    if (type === 'dots') {
        // Diamond/dot grid pattern
        return (
            <svg width="44" height="34" viewBox="0 0 44 34" fill="none">
                {[0,1,2,3].map(row => [0,1,2,3,4].map(col => {
                    const filled = (row * 5 + col) < 14;
                    return (
                        <rect key={`${row}-${col}`}
                            x={col * 9 + 2} y={row * 8 + 2} width="6" height="6"
                            rx="1"
                            stroke={color} strokeWidth={sw}
                            fill={filled ? `${color}45` : 'none'}
                            transform={`rotate(45 ${col * 9 + 5} ${row * 8 + 5})`}
                        />
                    );
                }))}
            </svg>
        );
    }
    if (type === 'trend') {
        // Rising line chart with shaded area
        const pts = [[2,28],[10,20],[18,22],[26,12],[34,15],[42,6]];
        const pathD = pts.map((p,i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ');
        const areaD = pathD + ` L42,32 L2,32 Z`;
        return (
            <svg width="46" height="34" viewBox="0 0 46 34" fill="none">
                <path d={areaD} fill={`${color}20`} />
                <path d={pathD} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
                {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.8" fill={color} />)}
                <line x1="0" y1="32" x2="46" y2="32" stroke={color} strokeWidth="0.8" opacity="0.5" />
            </svg>
        );
    }
    if (type === 'hbars') {
        // Horizontal bars
        const ws = [0.75, 0.90, 0.55, 0.80, 0.65];
        return (
            <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
                {ws.map((w, bi) => (
                    <g key={bi}>
                        <rect x="2" y={bi * 6 + 2} width={w * 44} height="4"
                            stroke={color} strokeWidth={sw} fill={`${color}30`} />
                    </g>
                ))}
            </svg>
        );
    }
    // default: scatter
    const pts2 = [[6,26],[14,18],[10,10],[22,22],[30,8],[38,16],[26,28]];
    return (
        <svg width="48" height="34" viewBox="0 0 48 34" fill="none">
            {pts2.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" stroke={color} strokeWidth={sw} fill={`${color}25`} />)}
        </svg>
    );
}

// Sketchy icon box — each index gets a different doodle
function SketchIcon({ idx, color, emoji }) {
    const icons = ['🧠','📚','🔬','🎨','🏆','📜','💡','⚡','🎯','🔧'];
    return (
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            {/* Sketchy square border — slightly rotated */}
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position: 'absolute', inset: 0 }}>
                <rect x="3" y="3" width="38" height="38" rx="3"
                    stroke={color} strokeWidth="1.5"
                    strokeDasharray={idx % 2 === 0 ? '3 2' : '0'}
                    fill={`${color}10`}
                    transform={`rotate(${(idx % 3) - 1} 22 22)`}
                />
                {/* second rect for double-line sketch effect */}
                <rect x="5" y="5" width="34" height="34" rx="2"
                    stroke={color} strokeWidth="0.7" opacity="0.4"
                    transform={`rotate(${(idx % 3) * 0.8} 22 22)`}
                    fill="none"
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}>
                {emoji || icons[idx % icons.length]}
            </div>
        </div>
    );
}

const CHART_TYPES = ['bars', 'pie', 'dots', 'trend', 'hbars', 'bars'];
const INK_COLORS = ['#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22','#16a085'];

function HandwrittenRenderer({ infographic, title }) {
    const tiers = infographic?.tiers || [];
    const categories = infographic?.categories || [];
    const items = tiers.length > 0
        ? tiers.slice(0, 6).map((t, i) => ({
            name: t.name,
            tagline: t.tagline || '',
            desc: (t.use_cases || [])[0] || (t.what_needs || [])[0] || '',
            pct: (() => {
                // Try to extract a number from insight, else derive from position
                const m = (t.insight || '').match(/\d+/);
                return m ? Math.min(99, Math.max(10, parseInt(m[0]))) : [69,81,64,47,57,71][i % 6];
            })(),
            emoji: null,
            color: INK_COLORS[i % INK_COLORS.length],
        }))
        : categories.slice(0, 6).map((c, i) => ({
            name: c.label,
            tagline: (c.nodes || [])[0]?.sublabel || '',
            desc: (c.nodes || [])[1]?.label || '',
            pct: [69,81,64,47,57,71][i % 6],
            emoji: resolveIcon(c.icon, i),
            color: INK_COLORS[i % INK_COLORS.length],
        }));

    const INK = '#2c3020';
    const PAPER = '#f2eddf';
    const GRID = 'rgba(80,80,0,0.09)';

    return (
        <div style={{
            background: PAPER,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'row',
            fontFamily: "'Caveat','Segoe Print','Comic Sans MS',cursive",
            overflow: 'hidden', boxSizing: 'border-box', position: 'relative',
        }}>
            {/* ── Graph paper grid ── */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
                backgroundSize: '18px 18px',
            }} />

            {/* ── Main content column ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

                {/* ── Title ── */}
                <div style={{ padding: '10px 10px 6px 14px', flexShrink: 0, textAlign: 'center', position: 'relative' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: INK, lineHeight: 1.1, letterSpacing: 0.5 }}>{title}</div>
                    {/* wavy underline */}
                    <svg style={{ display: 'block', margin: '3px auto 0' }} width="180" height="7" viewBox="0 0 180 7">
                        <path d="M0,3.5 Q15,0 30,3.5 Q45,7 60,3.5 Q75,0 90,3.5 Q105,7 120,3.5 Q135,0 150,3.5 Q165,7 180,3.5"
                            stroke="#c0392b" strokeWidth="1.8" fill="none" />
                    </svg>
                </div>

                {/* ── Row divider under title ── */}
                <div style={{ height: 1, background: `${INK}20`, marginInline: 10, flexShrink: 0 }} />

                {/* ── Item rows ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '4px 6px 4px 10px' }}>
                    {items.map((item, i) => {
                        const isLast = i === items.length - 1;
                        return (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.07, type: 'spring', stiffness: 180, damping: 20 }}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                                    borderBottom: isLast ? 'none' : `1px dashed ${INK}20`,
                                    padding: '3px 0',
                                    minHeight: 0,
                                }}
                            >
                                {/* Left: sketch icon */}
                                <SketchIcon idx={i} color={item.color} emoji={item.emoji} />

                                {/* Center: title + body text */}
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: INK, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
                                    {(item.tagline || item.desc) && (
                                        <div style={{ fontSize: 8, color: `${INK}90`, lineHeight: 1.35, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'system-ui', fontStyle: 'italic' }}>
                                            {item.tagline || item.desc}
                                        </div>
                                    )}
                                </div>

                                {/* Percentage hexagon badge */}
                                <div style={{ position: 'relative', width: 40, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="40" height="44" viewBox="0 0 40 44" fill="none" style={{ position: 'absolute' }}>
                                        {/* outer hex */}
                                        <polygon points="20,2 37,11.5 37,32.5 20,42 3,32.5 3,11.5"
                                            stroke={item.color} strokeWidth="1.6" fill={`${item.color}12`} />
                                        {/* inner hex for double-line sketch look */}
                                        <polygon points="20,6 33,13.5 33,30.5 20,38 7,30.5 7,13.5"
                                            stroke={item.color} strokeWidth="0.7" fill="none" opacity="0.4" />
                                    </svg>
                                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', lineHeight: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.pct}%</div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ flexShrink: 0 }}>
                                    <line x1="0" y1="5" x2="11" y2="5" stroke={item.color} strokeWidth="1.4" />
                                    <path d="M7 1.5 L11 5 L7 8.5" stroke={item.color} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
                                </svg>

                                {/* Right: mini sketch chart */}
                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <SketchChart type={CHART_TYPES[i % CHART_TYPES.length]} color={item.color} idx={i} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: '3px 10px', flexShrink: 0, textAlign: 'center', borderTop: `1px dashed ${INK}15` }}>
                    <span style={{ fontSize: 7.5, color: `${INK}55`, fontFamily: 'system-ui', letterSpacing: 0.5 }}>makepost.pro  ✏️  study notes</span>
                </div>
            </div>

            {/* ── Spiral binding — right edge ── */}
            <div style={{
                width: 20, flexShrink: 0,
                background: `linear-gradient(90deg, #d6cebd, #c9c0ad)`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'space-around',
                padding: '12px 0', borderLeft: `2px solid ${INK}25`,
            }}>
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{
                        width: 13, height: 13, borderRadius: '50%',
                        border: `1.8px solid ${INK}60`,
                        background: PAPER,
                        boxShadow: `inset 0 1px 2px rgba(0,0,0,0.12)`,
                    }} />
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MINIMALIST — Pure white, bold typography, large icons, breathing room
══════════════════════════════════════════════════════════════════════════════ */
function MinimalistRenderer({ infographic, title }) {
    const items = infographic?.items || [];
    const tagline = infographic?.tagline || '';
    const stat = infographic?.stat || '';
    const footerNote = infographic?.footer_note || '';
    return (
        <div style={{ background: '#fafafa', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: '#111827', padding: '18px 24px 14px', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.1 }}>{title}</div>
                {tagline && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, letterSpacing: 0.5 }}>{tagline}</div>}
                <div style={{ width: 40, height: 3, background: '#fff', margin: '8px auto 0', borderRadius: 2 }} />
            </div>
            {/* Stat bar */}
            {stat && (
                <div style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '8px 24px', textAlign: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: 2, textTransform: 'uppercase' }}>{stat}</span>
                </div>
            )}
            {/* Items grid — 2 columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '12px 16px', minHeight: 0 }}>
                {items.slice(0, 6).map((item, i) => (
                    <motion.div key={i}
                        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', gap: 5, margin: 3 }}
                    >
                        <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon || '•'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.3 }}>{item.phrase}</span>
                    </motion.div>
                ))}
            </div>
            {/* Footer note */}
            <div style={{ background: '#111827', padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: 1 }}>{footerNote || 'makepost.pro  •  AI-Generated'}</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TIMELINE — Vertical spine with colored nodes and step cards
══════════════════════════════════════════════════════════════════════════════ */
function TimelineRenderer({ infographic, title }) {
    const steps = infographic?.steps || [];
    const subtitle = infographic?.subtitle || '';
    return (
        <div style={{ background: '#f8fafc', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '14px 20px 12px', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>TIMELINE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: 1.5 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 4 }}>{subtitle}</div>}
            </div>
            {/* Timeline steps */}
            <div style={{ flex: 1, padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'hidden', minHeight: 0 }}>
                {steps.slice(0, 5).map((step, i) => {
                    const color = step.color || ['#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE'][i % 5];
                    const isLast = i === steps.slice(0, 5).length - 1;
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, type: 'spring', stiffness: 180, damping: 22 }}
                            style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}
                        >
                            {/* Spine column */}
                            <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${color}55`, flexShrink: 0, zIndex: 1 }}>
                                    <span style={{ fontSize: 14, lineHeight: 1 }}>{step.icon || '●'}</span>
                                </div>
                                {!isLast && <div style={{ flex: 1, width: 2, background: `linear-gradient(${color},${steps[i+1]?.color || '#94a3b8'})`, opacity: 0.4, minHeight: 8 }} />}
                            </div>
                            {/* Content card */}
                            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 8, paddingTop: 4, minHeight: 0 }}>
                                <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, padding: '7px 10px', height: 'calc(100% - 8px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: `0 2px 8px rgba(0,0,0,0.05)` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <span style={{ fontSize: 8.5, fontWeight: 800, color, background: `${color}18`, borderRadius: 4, padding: '1px 6px', letterSpacing: 0.5 }}>{step.marker}</span>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b' }}>{step.label}</span>
                                    </div>
                                    <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.4 }}>{step.desc}</div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8.5, color: '#94a3b8', letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CHECKLIST — Colored section blocks with checkbox items
══════════════════════════════════════════════════════════════════════════════ */
function ChecklistRenderer({ infographic, title }) {
    const sections = infographic?.sections || [];
    const subtitle = infographic?.subtitle || `The Essential ${title} Checklist`;
    return (
        <div style={{ background: '#f0fdf4', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#14532d,#166534)', padding: '14px 20px 12px', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#86efac', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>CHECKLIST</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                <div style={{ fontSize: 9.5, color: '#bbf7d0', marginTop: 4 }}>{subtitle}</div>
            </div>
            {/* Sections */}
            <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                {sections.slice(0, 4).map((section, si) => {
                    const color = section.color || ['#E53E3E','#3182CE','#38A169','#D69E2E'][si % 4];
                    return (
                        <motion.div key={si}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: si * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
                            style={{ background: '#fff', borderRadius: 10, border: `1px solid ${color}25`, overflow: 'hidden', flex: 1 }}
                        >
                            <div style={{ background: color, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ fontSize: 13, lineHeight: 1 }}>{section.icon || '✅'}</span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{section.title}</span>
                            </div>
                            <div style={{ padding: '5px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(section.items || []).slice(0, 3).map((item, ii) => (
                                    <motion.div key={ii}
                                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: si * 0.07 + ii * 0.04 }}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}
                                    >
                                        <div style={{ width: 14, height: 14, border: `2px solid ${color}`, borderRadius: 3, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}15` }}>
                                            <Check size={8} color={color} strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: 9.5, color: '#374151', lineHeight: 1.4 }}>{item}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8.5, color: '#6b7280', letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STEP-BY-STEP PROCESS — Numbered flowing steps with tips
══════════════════════════════════════════════════════════════════════════════ */
function StepByStepRenderer({ infographic, title }) {
    const steps = infographic?.steps || [];
    const subtitle = infographic?.subtitle || '';
    return (
        <div style={{ background: '#fefce8', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', padding: '14px 20px 12px', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#fcd34d', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>STEP-BY-STEP</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 9.5, color: '#fde68a', marginTop: 4 }}>{subtitle}</div>}
            </div>
            {/* Steps */}
            <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0 }}>
                {steps.slice(0, 6).map((step, i) => {
                    const color = step.color || ['#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE','#7B2D8B'][i % 6];
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, type: 'spring', stiffness: 180, damping: 20 }}
                            style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'stretch', minHeight: 0 }}
                        >
                            {/* Step number badge */}
                            <div style={{ width: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${color}50`, flexShrink: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{step.num || i+1}</span>
                                </div>
                                {i < steps.slice(0,6).length - 1 && <div style={{ flex: 1, width: 2, background: '#e5e7eb', borderRadius: 1, minHeight: 4 }} />}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: `1px solid ${color}20`, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', minHeight: 0 }}>
                                <span style={{ fontSize: 18, flexShrink: 0 }}>{step.icon || '→'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: color }}>{step.title}</div>
                                    <div style={{ fontSize: 8.5, color: '#374151', lineHeight: 1.3, marginTop: 1 }}>{step.detail}</div>
                                </div>
                                {step.tip && (
                                    <div style={{ background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 5, padding: '3px 6px', flexShrink: 0, maxWidth: 90 }}>
                                        <div style={{ fontSize: 7, fontWeight: 800, color, letterSpacing: 0.3, textTransform: 'uppercase' }}>PRO TIP</div>
                                        <div style={{ fontSize: 7.5, color: '#4b5563', lineHeight: 1.3 }}>{step.tip}</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '5px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8.5, color: '#92400e', opacity: 0.6, letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPARISON TABLE — 3-column table with colored headers + verdict row
══════════════════════════════════════════════════════════════════════════════ */
function ComparisonRenderer({ infographic, title }) {
    const columns = infographic?.columns || [];
    const columnColors = infographic?.column_colors || ['#E53E3E','#3182CE','#38A169'];
    const columnIcons = infographic?.column_icons || ['⚡','🔧','🎯'];
    const rows = infographic?.rows || [];
    const verdict = infographic?.verdict || '';
    return (
        <div style={{ background: '#f8fafc', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', padding: '14px 20px 12px', flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#93c5fd', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>COMPARISON</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                <div style={{ fontSize: 9.5, color: '#bfdbfe', marginTop: 4 }}>{infographic?.subtitle || `Side-by-side breakdown`}</div>
            </div>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', background: '#1e293b', flexShrink: 0 }}>
                <div style={{ padding: '6px 8px', fontSize: 7.5, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', alignSelf: 'center' }}>Criteria</div>
                {columns.slice(0, 3).map((col, ci) => (
                    <div key={ci} style={{ padding: '7px 6px', textAlign: 'center', borderLeft: '1px solid #334155' }}>
                        <div style={{ fontSize: 14 }}>{columnIcons[ci] || '●'}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: columnColors[ci] || '#fff', marginTop: 2, lineHeight: 1.2 }}>{col}</div>
                    </div>
                ))}
            </div>
            {/* Data rows */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {rows.slice(0, 6).map((row, ri) => (
                    <motion.div key={ri}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: ri * 0.055 }}
                        style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', flex: 1, borderBottom: '1px solid #e2e8f0', background: ri % 2 === 0 ? '#fff' : '#f8fafc', minHeight: 0 }}
                    >
                        <div style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, color: '#374151', alignSelf: 'center', lineHeight: 1.3, textAlign: 'center' }}>{row.criterion}</div>
                        {(row.values || []).slice(0, 3).map((val, vi) => (
                            <div key={vi} style={{ padding: '5px 8px', fontSize: 9, color: '#475569', lineHeight: 1.35, alignSelf: 'center', borderLeft: `1px solid #e2e8f0`, borderTop: `2px solid ${columnColors[vi] || '#e2e8f0'}`, textAlign: 'center' }}>
                                {val}
                            </div>
                        ))}
                    </motion.div>
                ))}
            </div>
            {/* Verdict row */}
            {verdict && (
                <div style={{ background: '#1e3a5f', padding: '7px 14px', textAlign: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: '#93c5fd', letterSpacing: 0.5 }}>VERDICT: </span>
                    <span style={{ fontSize: 8.5, color: '#e2e8f0' }}>{verdict}</span>
                </div>
            )}
            <div style={{ padding: '4px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#94a3b8', letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated LinkedIn Infographic</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   FLOWCHART — Vertical decision flow: pill start → process boxes → diamond
   decision → two path cards side-by-side → pill end
══════════════════════════════════════════════════════════════════════════════ */
function FlowchartRenderer({ infographic, title }) {
    const nodes = infographic?.nodes || [];
    const subtitle = infographic?.subtitle || '';

    const start   = nodes.find(n => n.shape === 'start')   || nodes[0];
    const procs   = nodes.filter(n => n.shape === 'process');
    const dec     = nodes.find(n => n.shape === 'decision') || nodes[2];
    const pathA   = procs.find((n, i) => i === procs.length - 2) || procs[procs.length - 2];
    const pathB   = procs.find((n, i) => i === procs.length - 1) || procs[procs.length - 1];
    const end     = nodes.find(n => n.shape === 'end')     || nodes[nodes.length - 1];
    const midProcs = procs.filter(n => n !== pathA && n !== pathB);

    const Connector = ({ color = '#94a3b8' }) => (
        <div style={{ display: 'flex', justifyContent: 'center', height: 20, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="10" y1="0" x2="10" y2="14" stroke={color} strokeWidth="1.8" />
                <path d="M5 10 L10 16 L15 10" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
            </svg>
        </div>
    );

    const NodeBox = ({ node, delay = 0, shape = 'rect' }) => {
        if (!node) return null;
        const c = node.color || '#6366f1';
        if (shape === 'pill') return (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay, type: 'spring', stiffness: 200, damping: 18 }}
                style={{ background: c, borderRadius: 30, padding: '7px 20px', textAlign: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${c}55` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{node.label}</div>
                {node.detail && <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>{node.detail}</div>}
            </motion.div>
        );
        if (shape === 'diamond') return (
            <motion.div initial={{ opacity: 0, rotate: -4, scale: 0.85 }} animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ delay, type: 'spring', stiffness: 180, damping: 16 }}
                style={{ position: 'relative', alignSelf: 'center', flexShrink: 0 }}>
                <div style={{ width: 120, height: 60, background: c, transform: 'perspective(200px) rotateX(8deg)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${c}50`, border: `2px solid ${c}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '0 8px' }}>{node.label}</div>
                    {node.detail && <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginTop: 2, padding: '0 6px' }}>{node.detail}</div>}
                </div>
                {/* YES / NO labels */}
                {node.yes_label && <div style={{ position: 'absolute', right: -38, top: '50%', transform: 'translateY(-50%)', fontSize: 8, fontWeight: 700, color: '#10b981', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{node.yes_label}</div>}
                {node.no_label  && <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, color: '#f97316', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{node.no_label}</div>}
            </motion.div>
        );
        // default: rect
        return (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ background: '#fff', border: `2px solid ${c}`, borderLeft: `5px solid ${c}`, borderRadius: 10, padding: '8px 14px', flexShrink: 0, boxShadow: `0 2px 10px ${c}25` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: c }}>{node.label}</div>
                {node.detail && <div style={{ fontSize: 8.5, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{node.detail}</div>}
            </motion.div>
        );
    };

    return (
        <div style={{ background: 'linear-gradient(160deg,#f5f3ff 0%,#eef2ff 100%)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)', padding: '13px 20px 11px', flexShrink: 0, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ fontSize: 8, fontWeight: 700, color: '#c7d2fe', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>FLOWCHART</div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{subtitle}</div>}
            </div>

            {/* Flow body */}
            <div style={{ flex: 1, padding: '10px 20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', minHeight: 0, overflowY: 'hidden', gap: 0 }}>
                {start && <><NodeBox node={start} shape="pill" delay={0} /><Connector color={start.color} /></>}
                {midProcs.slice(0, 1).map((n, i) => (
                    <React.Fragment key={i}><NodeBox node={n} shape="rect" delay={0.1 + i * 0.08} /><Connector color={n.color} /></React.Fragment>
                ))}
                {dec && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <NodeBox node={dec} shape="diamond" delay={0.22} />
                        </div>
                        {/* Branch arrows */}
                        <div style={{ display: 'flex', gap: 8, height: 22, flexShrink: 0, position: 'relative' }}>
                            <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                                <motion.path d="M50,0 L25,22" stroke="#10b981" strokeWidth="1.6" fill="none"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.32, duration: 0.4 }} />
                                <motion.path d="M50,0 L75,22" stroke="#f97316" strokeWidth="1.6" fill="none"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.32, duration: 0.4 }} />
                            </svg>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <NodeBox node={pathA} shape="rect" delay={0.38} />
                            <NodeBox node={pathB} shape="rect" delay={0.44} />
                        </div>
                        <Connector color="#6366f1" />
                    </>
                )}
                {end && <NodeBox node={end} shape="pill" delay={0.55} />}
            </div>

            <div style={{ padding: '4px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#818cf8', letterSpacing: 1.5 }}>makepost.pro  •  AI-Generated Flowchart</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATISTICS — Dark navy, hero big number, animated progress bars, 2×2 stat grid
══════════════════════════════════════════════════════════════════════════════ */
function StatisticsRenderer({ infographic, title }) {
    const hero = infographic?.hero_stat || {};
    const stats = infographic?.stats || [];
    const insight = infographic?.insight || '';
    const sourceLine = infographic?.source_line || '';

    return (
        <div style={{ background: '#0f172a', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box', color: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ padding: '12px 20px 10px', flexShrink: 0, textAlign: 'center', borderBottom: '1px solid rgba(99,102,241,0.25)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 120%, rgba(99,102,241,0.18), transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 8, fontWeight: 700, color: '#818cf8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>STATISTICS</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
            </div>

            {/* Hero stat */}
            <div style={{ padding: '14px 20px 10px', textAlign: 'center', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12), transparent 65%)', pointerEvents: 'none' }} />
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.05 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -2, textShadow: '0 0 40px rgba(99,102,241,0.8)' }}>{hero.value || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, lineHeight: 1.4 }}>{hero.label}</div>
                    {hero.source && <div style={{ fontSize: 9, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>{hero.source}</div>}
                </motion.div>
            </div>

            {/* 2×2 Stat grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '8px 12px', minHeight: 0 }}>
                {stats.slice(0, 4).map((stat, i) => {
                    const pct = Math.min(95, Math.max(5, parseInt(stat.bar_pct) || 50));
                    const c = stat.color || '#6366f1';
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 + i * 0.09, type: 'spring', stiffness: 200, damping: 20 }}
                            style={{ background: '#1e293b', borderRadius: 10, border: `1px solid ${c}30`, borderTop: `3px solid ${c}`, padding: '9px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{stat.icon || '📊'}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: c, lineHeight: 1 }}>{stat.value}</div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>{stat.label}</div>
                                </div>
                            </div>
                            {stat.detail && <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.35, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stat.detail}</div>}
                            {/* Animated progress bar */}
                            <div style={{ background: '#334155', borderRadius: 4, height: 5, overflow: 'hidden', flexShrink: 0 }}>
                                <motion.div initial={{ width: '0%' }} animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.75, ease: 'easeOut' }}
                                    style={{ height: '100%', background: `linear-gradient(90deg, ${c}, ${c}bb)`, borderRadius: 4 }} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Insight strip */}
            {insight && (
                <div style={{ padding: '7px 16px', background: 'rgba(99,102,241,0.12)', borderTop: '1px solid rgba(99,102,241,0.2)', flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, color: '#c7d2fe', textAlign: 'center', lineHeight: 1.5, fontStyle: 'italic' }}>💡 {insight}</div>
                </div>
            )}
            <div style={{ padding: '4px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 7.5, color: '#334155', letterSpacing: 1 }}>{sourceLine || 'makepost.pro  •  AI-Generated Statistics'}</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROADMAP — 4 phases on a vertical spine, milestone bullets, outcome badges,
   end-goal trophy banner
══════════════════════════════════════════════════════════════════════════════ */
function RoadmapRenderer({ infographic, title }) {
    const phases = infographic?.phases || [];
    const endGoal = infographic?.end_goal || '';
    const subtitle = infographic?.subtitle || '';

    return (
        <div style={{ background: '#fffbeb', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#78350f,#d97706)', padding: '12px 20px 10px', flexShrink: 0, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: -18, right: -18, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ fontSize: 8, fontWeight: 700, color: '#fde68a', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>ROADMAP</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{subtitle}</div>}
            </div>

            {/* Phases */}
            <div style={{ flex: 1, padding: '8px 14px 6px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                {phases.slice(0, 4).map((phase, i) => {
                    const c = phase.color || '#d97706';
                    const isLast = i === phases.slice(0, 4).length - 1;
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.09, type: 'spring', stiffness: 180, damping: 20 }}
                            style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
                            {/* Left spine */}
                            <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    transition={{ delay: 0.05 + i * 0.09, type: 'spring', stiffness: 280, damping: 16 }}
                                    style={{ width: 34, height: 34, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 12px ${c}60`, zIndex: 1 }}>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{phase.phase_num}</span>
                                </motion.div>
                                {!isLast && (
                                    <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                                        transition={{ delay: 0.2 + i * 0.09, duration: 0.35, ease: 'easeOut' }}
                                        style={{ flex: 1, width: 3, background: `linear-gradient(${c}, ${phases[i + 1]?.color || '#94a3b8'})`, borderRadius: 2, originY: 0, opacity: 0.6 }} />
                                )}
                            </div>

                            {/* Phase card */}
                            <div style={{ flex: 1, background: phase.bg_color || '#fff', borderRadius: 10, border: `1px solid ${c}25`, borderLeft: `3px solid ${c}`, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', boxShadow: `0 2px 8px ${c}12` }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{phase.phase_name}</div>
                                    <span style={{ fontSize: 8.5, fontWeight: 700, color: c, background: `${c}18`, borderRadius: 10, padding: '2px 7px', flexShrink: 0 }}>{phase.duration}</span>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5, minHeight: 0 }}>
                                    {(phase.milestones || []).slice(0, 3).map((m, mi) => (
                                        <motion.div key={mi}
                                            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.18 + i * 0.09 + mi * 0.04 }}
                                            style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 4 }} />
                                            <span style={{ fontSize: 9, color: '#374151', lineHeight: 1.35 }}>{m}</span>
                                        </motion.div>
                                    ))}
                                </div>
                                {phase.outcome && (
                                    <div style={{ background: `${c}12`, border: `1px solid ${c}28`, borderRadius: 5, padding: '3px 7px', flexShrink: 0 }}>
                                        <span style={{ fontSize: 8, fontWeight: 700, color: c }}>✓ </span>
                                        <span style={{ fontSize: 8, color: '#374151' }}>{phase.outcome}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* End goal banner */}
            {endGoal && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    style={{ background: 'linear-gradient(135deg,#78350f,#d97706)', padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, color: '#fef3c7', fontWeight: 700 }}>🏆 {endGoal}</div>
                </motion.div>
            )}
            <div style={{ padding: '3px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#92400e', opacity: 0.5, letterSpacing: 1 }}>makepost.pro  •  AI-Generated Roadmap</span>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROBLEM–SOLUTION — Split-card rows: red problem left, green solution right,
   impact chip below, diagonal header, CTA banner footer
══════════════════════════════════════════════════════════════════════════════ */
function ProblemSolutionRenderer({ infographic, title }) {
    const pairs = infographic?.pairs || [];
    const ctaBanner = infographic?.cta_banner || '';
    const subtitle = infographic?.subtitle || '';

    return (
        <div style={{ background: '#f9fafb', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Split diagonal header */}
            <div style={{ display: 'flex', flexShrink: 0, height: 68, position: 'relative', overflow: 'hidden' }}>
                {/* Left (problem) */}
                <div style={{ flex: 1, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(0 0, 105% 0, 92% 100%, 0 100%)', paddingRight: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fca5a5', letterSpacing: 2, textTransform: 'uppercase' }}>PROBLEM</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>😤 Pain Points</div>
                    </div>
                </div>
                {/* Right (solution) */}
                <div style={{ flex: 1, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: 'polygon(8% 0, 100% 0, 100% 100%, -5% 100%)', paddingLeft: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#a7f3d0', letterSpacing: 2, textTransform: 'uppercase' }}>SOLUTION</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>✅ Fixes</div>
                    </div>
                </div>
                {/* Center badge */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 10, border: '2px solid #f3f4f6' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#374151' }}>VS</span>
                </div>
                {/* Title below */}
                <div style={{ position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.25)', display: 'inline-block', padding: '1px 12px', borderRadius: 10 }}>{title}</div>
                </div>
            </div>

            {/* Pair rows */}
            <div style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                {pairs.slice(0, 4).map((pair, i) => (
                    <motion.div key={i}
                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
                        {/* Two-col split */}
                        <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            {/* Problem */}
                            <div style={{ flex: 1, background: '#fef2f2', padding: '6px 8px', borderRight: '2px solid #fecaca', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{pair.problem_icon || '⚠️'}</span>
                                    <span style={{ fontSize: 9, color: '#991b1b', lineHeight: 1.35, fontWeight: 600 }}>{pair.problem}</span>
                                </div>
                            </div>
                            {/* Arrow divider */}
                            <div style={{ width: 26, flexShrink: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 300, damping: 14 }}
                                    style={{ fontSize: 14, color: '#6b7280' }}>→</motion.div>
                            </div>
                            {/* Solution */}
                            <div style={{ flex: 1, background: '#f0fdf4', padding: '6px 8px', borderLeft: '2px solid #a7f3d0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{pair.solution_icon || '✅'}</span>
                                    <span style={{ fontSize: 9, color: '#065f46', lineHeight: 1.35, fontWeight: 600 }}>{pair.solution}</span>
                                </div>
                            </div>
                        </div>
                        {/* Impact chip */}
                        {pair.impact && (
                            <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.18)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '2px 10px', textAlign: 'center' }}>
                                <span style={{ fontSize: 8, color: '#047857', fontWeight: 700 }}>✦ {pair.impact}</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* CTA banner */}
            {ctaBanner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, color: '#f1f5f9', fontWeight: 700 }}>🚀 {ctaBanner}</div>
                </motion.div>
            )}
            <div style={{ padding: '3px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#94a3b8', letterSpacing: 1 }}>makepost.pro  •  AI-Generated Infographic</span>
            </div>
        </div>
    );
}

function InfographicRenderer({ content, title, style = 'Whiteboard' }) {
    const infographic = content?.infographic;
    const infType = infographic?.type;
    const categories = infographic?.categories || [];

    // New structured styles — route by infographic.type
    if (infType === 'minimalist'       || style === 'Minimalist')        return <MinimalistRenderer       infographic={infographic} title={title} />;
    if (infType === 'timeline'         || style === 'Timeline')          return <TimelineRenderer         infographic={infographic} title={title} />;
    if (infType === 'checklist'        || style === 'Checklist')         return <ChecklistRenderer        infographic={infographic} title={title} />;
    if (infType === 'steps'            || style === 'Step-by-Step')      return <StepByStepRenderer       infographic={infographic} title={title} />;
    if (infType === 'comparison'       || style === 'Comparison Table')  return <ComparisonRenderer       infographic={infographic} title={title} />;
    if (infType === 'flowchart'        || style === 'Flowchart')         return <FlowchartRenderer        infographic={infographic} title={title} />;
    if (infType === 'statistics'       || style === 'Statistics')        return <StatisticsRenderer       infographic={infographic} title={title} />;
    if (infType === 'roadmap'          || style === 'Roadmap')           return <RoadmapRenderer          infographic={infographic} title={title} />;
    if (infType === 'problem_solution' || style === 'Problem-Solution')  return <ProblemSolutionRenderer  infographic={infographic} title={title} />;

    if (!categories.length) {
        const bgs = { 'Whiteboard': '#fff', 'Corporate Modern': '#eef4ff', 'Executive Guide': '#0d1117', 'Handwritten Notes': '#fdf6e3' };
        const fg  = { 'Whiteboard': '#1a1a2e', 'Corporate Modern': '#1e3a5f', 'Executive Guide': '#c9d1d9', 'Handwritten Notes': '#3d2008' };
        const ff  = { 'Handwritten Notes': "'Comic Sans MS',cursive" };
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
    const [infographicStyle, setInfographicStyle] = useState('Whiteboard');
    const [lastGeneratedStyle, setLastGeneratedStyle] = useState(null);
    const [showPostDetails, setShowPostDetails] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
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
        { id: 'Whiteboard',       label: 'Whiteboard Sketch',  Icon: Palette,      desc: 'Hand-drawn marker style',       color: '#2563eb', bg: '#eff6ff' },
        { id: 'Corporate Modern', label: 'Corporate Modern',   Icon: FileText,     desc: 'Clean, professional digital',   color: '#0f766e', bg: '#f0fdfa' },
        { id: 'Executive Guide',  label: 'Executive Guide',    Icon: Zap,          desc: 'Stacked vibrant guide',         color: '#7c3aed', bg: '#f5f3ff' },
        { id: 'Handwritten Notes',label: 'Handwritten Notes',  Icon: MessageSquare,desc: 'Pen on notebook paper',         color: '#c54444', bg: '#fef2f2' },
        { id: 'Minimalist',       label: 'Minimalist',         Icon: Target,       desc: 'Bold, breathing white space',   color: '#111827', bg: '#f3f4f6' },
        { id: 'Timeline',         label: 'Timeline',           Icon: Hash,         desc: 'Progression & milestones',      color: '#1e293b', bg: '#f1f5f9' },
        { id: 'Checklist',        label: 'Checklist',          Icon: Check,        desc: 'Action-item checkboxes',        color: '#166534', bg: '#f0fdf4' },
        { id: 'Step-by-Step',     label: 'Step-by-Step',       Icon: ChevronDown,  desc: 'Sequential numbered process',   color: '#92400e', bg: '#fefce8' },
        { id: 'Comparison Table', label: 'Comparison Table',   Icon: Copy,         desc: 'Side-by-side breakdown',        color: '#1e3a5f', bg: '#eff6ff' },
        { id: 'Flowchart',        label: 'Flowchart',          Icon: GitBranch,    desc: 'Decision flow & logic paths',   color: '#4f46e5', bg: '#eef2ff' },
        { id: 'Statistics',       label: 'Statistics',         Icon: BarChart2,    desc: 'Bold numbers & data story',     color: '#059669', bg: '#ecfdf5' },
        { id: 'Roadmap',          label: 'Roadmap',            Icon: Map,          desc: 'Phased milestones & goals',     color: '#d97706', bg: '#fffbeb' },
        { id: 'Problem-Solution', label: 'Problem–Solution',   Icon: Lightbulb,    desc: 'Pain points vs. fixes',         color: '#dc2626', bg: '#fef2f2' },
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
            {/* Desktop sidebar — hidden on mobile */}
            {!isMobile && (
                <Sidebar
                    onNewPost={handleNewPost}
                    onSelectHistory={loadHistoryItem}
                    currentHistoryId={currentHistoryId}
                />
            )}
            {/* Mobile drawer sidebar */}
            {isMobile && (
                <Sidebar
                    onNewPost={handleNewPost}
                    onSelectHistory={loadHistoryItem}
                    currentHistoryId={currentHistoryId}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
            )}

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
                                background: 'white', borderRadius: 24, padding: isMobile ? 24 : 40,
                                maxWidth: 420, width: '100%', textAlign: 'center',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                                margin: isMobile ? '0 12px' : 0,
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

            <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* ── Mobile top bar ── */}
                {isMobile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: '#fff',
                        borderBottom: '1px solid #e2e8f0', flexShrink: 0,
                        position: 'sticky', top: 0, zIndex: 100,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                        {/* Hamburger */}
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: 4 }}
                        >
                            <span style={{ width: 20, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
                            <span style={{ width: 20, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
                            <span style={{ width: 14, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
                        </button>

                        {/* Logo text */}
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#c54444', letterSpacing: 0.5 }}>makepost<span style={{ color: '#374151' }}>.pro</span></span>

                        {/* Credits chip */}
                        <button
                            onClick={() => navigate('/pricing')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}
                        >
                            <Zap size={12} color="#c54444" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#c54444' }}>{credits ?? '…'}</span>
                        </button>
                    </div>
                )}

                <div style={{ padding: isMobile ? '16px 12px' : '28px 32px', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1 }}>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
                        gap: isMobile ? 16 : 24,
                        alignItems: 'start',
                    }}>

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

                            {/* Style Selection — Animated Dropdown */}
                            <div style={{ backgroundColor: 'white', borderRadius: 24, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#c54444', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Visual Style</label>
                                <div style={{ position: 'relative' }}>
                                    {/* Trigger button */}
                                    <motion.button
                                        type="button"
                                        onMouseDown={() => setStyleDropdownOpen(o => !o)}
                                        onBlur={() => setTimeout(() => setStyleDropdownOpen(false), 150)}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderRadius: 14,
                                            border: `2px solid ${styleDropdownOpen ? STYLES.find(s => s.id === infographicStyle)?.color || '#c54444' : '#e2e8f0'}`,
                                            background: styleDropdownOpen ? (STYLES.find(s => s.id === infographicStyle)?.bg || '#fef2f2') : '#f8fafc',
                                            cursor: 'pointer',
                                            transition: 'all 0.22s ease',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {(() => { const s = STYLES.find(x => x.id === infographicStyle); const IconC = s?.Icon; return IconC ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:8, background: s.bg, flexShrink:0 }}><IconC size={15} color={s.color} /></span> : null; })()}
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{STYLES.find(s => s.id === infographicStyle)?.label}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{STYLES.find(s => s.id === infographicStyle)?.desc}</div>
                                            </div>
                                        </div>
                                        <motion.span animate={{ rotate: styleDropdownOpen ? 180 : 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} style={{ display:'flex', flexShrink:0 }}>
                                            <ChevronDown size={16} color="#94a3b8" />
                                        </motion.span>
                                    </motion.button>

                                    {/* Animated dropdown list */}
                                    <AnimatePresence>
                                        {styleDropdownOpen && (
                                            <motion.div
                                                key="style-dropdown"
                                                initial={{ opacity: 0, y: -8, scaleY: 0.92 }}
                                                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                                exit={{ opacity: 0, y: -6, scaleY: 0.94 }}
                                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 6px)',
                                                    left: 0,
                                                    right: 0,
                                                    background: 'white',
                                                    borderRadius: 16,
                                                    border: '1.5px solid #e2e8f0',
                                                    boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
                                                    zIndex: 200,
                                                    overflow: 'hidden',
                                                    transformOrigin: 'top center',
                                                }}
                                            >
                                                {STYLES.map((s, i) => {
                                                    const selected = infographicStyle === s.id;
                                                    const IconC = s.Icon;
                                                    return (
                                                        <motion.div
                                                            key={s.id}
                                                            initial={{ opacity: 0, x: -6 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.045, duration: 0.18, ease: 'easeOut' }}
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                setInfographicStyle(s.id);
                                                                setStyleDropdownOpen(false);
                                                            }}
                                                            style={{
                                                                padding: '11px 16px',
                                                                background: selected ? s.bg : 'white',
                                                                borderBottom: i < STYLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                                borderLeft: selected ? `4px solid ${s.color}` : '4px solid transparent',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 10,
                                                                transition: 'background 0.14s, border-left 0.14s',
                                                            }}
                                                            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                                                            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'white'; }}
                                                        >
                                                            <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background: selected ? s.bg : '#f1f5f9', flexShrink:0, transition:'background 0.14s' }}>
                                                                <IconC size={15} color={selected ? s.color : '#94a3b8'} />
                                                            </span>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 13, fontWeight: 700, color: selected ? s.color : '#1e293b' }}>{s.label}</div>
                                                                <div style={{ fontSize: 11, color: selected ? s.color + 'aa' : '#94a3b8', marginTop: 2 }}>{s.desc}</div>
                                                            </div>
                                                            {selected && (
                                                                <motion.span
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                                                    style={{ width:18, height:18, borderRadius:'50%', background: s.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                                                                >
                                                                    <Check size={11} color="white" strokeWidth={3} />
                                                                </motion.span>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                        <div style={{ padding: isMobile ? '4px 0' : 24, flex: 1, overflowY: 'auto', backgroundColor: '#f3f4f6' }}>
                            <AnimatePresence mode="wait">
                                {result ? (
                                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                                        {/* 1. TOP: LIVE INFOGRAPHIC PREVIEW + DOWNLOAD */}
                                        <div style={{ marginBottom: isMobile ? 24 : 48 }}>
                                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <Image size={isMobile ? 18 : 22} color="#c54444" />
                                                <h2 style={{ fontSize: isMobile ? 15 : 20, fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 1.5 }}>AI-Generated Visual</h2>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                    {STYLES.find(s => s.id === infographicStyle)?.label || infographicStyle}
                                                </span>
                                            </div>
                                            {/* Fixed 4:5 LinkedIn portrait ratio */}
                                            <div style={{ maxWidth: isMobile ? '100%' : 480, margin: '0 auto', aspectRatio: '4/5', overflow: 'hidden', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', position: 'relative' }}>
                                                <div ref={infographicRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                                                    <InfographicRenderer content={c} title={formData.title} style={infographicStyle} />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: isMobile ? 16 : 24, display: 'flex', justifyContent: 'center' }}>
                                                <button onClick={() => downloadInfographic(infographicRef, formData.title)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '13px 24px' : '16px 36px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#c54444,#a82c2c)', color: 'white', fontSize: isMobile ? 14 : 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 25px rgba(197,68,68,0.4)', transition: 'all 0.3s', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                                    onMouseOver={e => !isMobile && (e.currentTarget.style.transform = 'translateY(-3px)')}
                                                    onMouseOut={e => !isMobile && (e.currentTarget.style.transform = 'translateY(0)')}
                                                >
                                                    <Download size={isMobile ? 18 : 22} /> Download Infographic
                                                </button>
                                            </div>
                                        </div>

                                        {/* 3. BOTTOM: CLEAN TEXTUAL FLOW */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32, maxWidth: 800, margin: '0 auto' }}>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
                                                <button onClick={copyToClipboard} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: isMobile ? '9px 14px' : '10px 20px', borderRadius: 12, color: '#475569', fontSize: isMobile ? 13 : 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a' }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}>
                                                    {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy Post'}
                                                </button>
                                            </div>

                                            <div style={{ padding: '0 0 20px', borderBottom: '1px solid #e2e8f0' }}>
                                                <p style={{ fontSize: 12, fontWeight: 800, color: '#b45309', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={13} color="#b45309" /> The Hook</p>
                                                <p style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.01em' }}>{c?.hook}</p>
                                            </div>

                                            <div style={{ padding: '0 0 24px', borderBottom: '1px solid #e2e8f0' }}>
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={14} color="#1d4ed8" /> Post Content</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                    {(c?.body || '').split('\n').filter(l => l.trim()).map((line, i) => {
                                                        const bs = c?.bullet_style || 'numbered';

                                                        // Parse prefix and text
                                                        const numM    = line.match(/^(\d+)\.\s+(.+)/);
                                                        const letterM = line.match(/^([A-G])\.\s+(.+)/);
                                                        const arrowM  = line.match(/^→\s+(.+)/);
                                                        const diamondM= line.match(/^◆\s+(.+)/);
                                                        const dashM   = line.match(/^—\s+(.+)/);
                                                        const text    = (numM?.[2]) || (letterM?.[2]) || (arrowM?.[1]) || (diamondM?.[1]) || (dashM?.[1]) || line;
                                                        const prefix  = numM?.[1] || letterM?.[1] || null;

                                                        const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '11px 0', borderBottom: '1px solid #f1f5f9' };
                                                        const textStyle = { fontSize: isMobile ? 14 : 16, color: '#1e293b', lineHeight: 1.65, fontWeight: 450 };

                                                        if (bs === 'numbered' && numM) return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ minWidth: 28, height: 28, borderRadius: '50%', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{prefix}</span>
                                                                <span style={textStyle}>{text}</span>
                                                            </div>
                                                        );
                                                        if (bs === 'letter' && letterM) return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ minWidth: 28, height: 28, borderRadius: 6, background: '#1d4ed8', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{prefix}</span>
                                                                <span style={textStyle}>{text}</span>
                                                            </div>
                                                        );
                                                        if (bs === 'arrow' && arrowM) return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ color: '#c54444', fontWeight: 900, fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>→</span>
                                                                <span style={textStyle}>{text}</span>
                                                            </div>
                                                        );
                                                        if (bs === 'diamond' && diamondM) return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 3 }}>◆</span>
                                                                <span style={textStyle}>{text}</span>
                                                            </div>
                                                        );
                                                        if (bs === 'dash' && dashM) return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ color: '#047857', fontWeight: 900, fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 0 }}>—</span>
                                                                <span style={textStyle}>{text}</span>
                                                            </div>
                                                        );
                                                        // fallback
                                                        return (
                                                            <div key={i} style={rowStyle}>
                                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', flexShrink: 0, marginTop: 9 }} />
                                                                <span style={textStyle}>{line}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div style={{ padding: '0 0 20px' }}>
                                                <p style={{ fontSize: 12, fontWeight: 800, color: '#047857', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={13} color="#047857" /> Call to Action</p>
                                                <p style={{ fontSize: isMobile ? 15 : 18, fontStyle: 'italic', color: '#0f172a', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>{c?.cta}</p>
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

                                            <div style={{ display: 'flex', justifyContent: 'center', padding: isMobile ? '16px 0' : '30px 0' }}>
                                                <button onClick={handleSubmit} disabled={loading}
                                                    style={{
                                                        width: isMobile ? '100%' : 'auto',
                                                        minWidth: isMobile ? 'unset' : 280,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 10,
                                                        padding: isMobile ? '15px 20px' : '20px 40px',
                                                        borderRadius: 18,
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                                        color: 'white',
                                                        fontSize: isMobile ? 14 : 16,
                                                        fontWeight: 800,
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: '0 8px 25px rgba(99,102,241,0.4)'
                                                    }}
                                                    onMouseOver={e => !loading && !isMobile && (e.currentTarget.style.transform = 'translateY(-3px)', e.currentTarget.style.boxShadow = '0 12px 35px rgba(99,102,241,0.5)')}
                                                    onMouseOut={e => !loading && !isMobile && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.4)')}
                                                >
                                                    <RefreshCw size={isMobile ? 18 : 22} className={loading ? 'animate-spin' : ''} />
                                                    {loading ? 'Generating...' : 'Craft Another Masterpiece'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* Empty/Loading */
                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? 300 : 500 }}>
                                        {loading ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ width: 70, height: 70, border: '5px solid #f8e6e6', borderTopColor: '#c54444', borderRadius: '50%', animation: 'spin 1.2s linear infinite', margin: '0 auto 24px' }} />
                                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Generating your content...</h2>
                                                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>This is usually faster with our latest optimizations (~5-8s)</p>
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

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                * { box-sizing: border-box; }
                input, textarea, select, button { box-sizing: border-box; }
                @media (max-width: 767px) {
                    input[type="text"], textarea { font-size: 16px !important; }
                }
            `}</style>
        </div>
    );
}

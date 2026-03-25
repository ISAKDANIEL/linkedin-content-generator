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
   HANDWRITTEN NOTES — Lined paper, numbered study cards, margin notes
══════════════════════════════════════════════════════════════════════════════ */
function HandwrittenRenderer({ infographic, title }) {
    const tiers = infographic?.tiers || [];
    const categories = infographic?.categories || [];
    const items = tiers.length > 0 ? tiers : categories.slice(0, 5).map(c => ({
        name: c.label, color: c.color, tagline: c.nodes?.[0]?.sublabel || '',
        use_cases: (c.nodes || []).slice(0, 2).map(n => n.label),
        what_needs: [],
        key_risks: (c.nodes || []).slice(2, 3).map(n => n.label),
        insight: c.nodes?.[3]?.label || '',
    }));
    const TABS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db'];
    return (
        <div style={{ background: '#fdf6e3', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Caveat','Segoe Print','Comic Sans MS',cursive", overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
            {/* Lined paper */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,#d4c5a945 27px,#d4c5a945 28px)', pointerEvents: 'none' }} />
            {/* Red margin line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 50, width: 1, background: '#e8a5a560', pointerEvents: 'none' }} />
            {/* Header */}
            <div style={{ padding: '12px 16px 8px 60px', flexShrink: 0, position: 'relative' }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: '#999', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: 2 }}>MY NOTES ON</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', lineHeight: 1.1 }}>{title}</div>
                <svg style={{ display: 'block', marginTop: 3 }} height="6" width="200" viewBox="0 0 200 6">
                    <path d="M0,3 Q10,0 20,3 Q30,6 40,3 Q50,0 60,3 Q70,6 80,3 Q90,0 100,3 Q110,6 120,3 Q130,0 140,3 Q150,6 160,3 Q170,0 180,3 Q190,6 200,3" stroke="#e74c3c" strokeWidth="1.5" fill="none" />
                </svg>
                <div style={{ fontSize: 7.5, color: '#b0896a', marginTop: 3, fontFamily: 'system-ui' }}>makepost.pro study notes ✏️</div>
            </div>
            {/* Study cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 10px 4px 60px', minHeight: 0 }}>
                {items.slice(0, 5).map((tier, i) => {
                    const tabColor = tier.color || TABS[i % 5];
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
                            style={{ flex: 1, background: '#fffef5', border: '1px solid #d4c5a9', borderLeft: `4px solid ${tabColor}`, borderRadius: '0 6px 6px 0', padding: '5px 8px', display: 'flex', gap: 6, alignItems: 'stretch', minHeight: 0, overflow: 'hidden', boxSizing: 'border-box', boxShadow: '1px 2px 5px rgba(0,0,0,0.06)' }}
                        >
                            {/* Number circle + tier name */}
                            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: tabColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 2px 6px ${tabColor}50` }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{i + 1}</span>
                                </div>
                                <div style={{ fontSize: 7.5, fontWeight: 700, color: tabColor, marginTop: 2, lineHeight: 1.1, maxWidth: 44, wordBreak: 'break-word' }}>{tier.name}</div>
                            </div>
                            {/* Divider */}
                            <div style={{ width: 1, background: '#d4c5a9', flexShrink: 0, alignSelf: 'stretch' }} />
                            {/* Middle content */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, overflow: 'hidden', minWidth: 0 }}>
                                {tier.tagline && (
                                    <div><span style={{ fontSize: 6.5, fontWeight: 800, color: '#b0896a', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: 0.5 }}>What it is: </span><span style={{ fontSize: 8, color: '#3d2810' }}>{tier.tagline}</span></div>
                                )}
                                {(tier.use_cases || []).slice(0, 1).map((uc, j) => (
                                    <div key={j}><span style={{ fontSize: 6.5, fontWeight: 800, color: '#2e7d32', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: 0.5 }}>Best for: </span><span style={{ fontSize: 8, color: '#3d2810' }}>{uc}</span></div>
                                ))}
                                {(tier.what_needs || []).slice(0, 1).map((wn, j) => (
                                    <div key={j}><span style={{ fontSize: 6.5, fontWeight: 800, color: '#1565c0', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: 0.5 }}>Needs: </span><span style={{ fontSize: 8, color: '#3d2810' }}>{wn}</span></div>
                                ))}
                            </div>
                            {/* Right badges */}
                            <div style={{ width: 88, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                                {(tier.key_risks || []).slice(0, 1).map((kr, j) => (
                                    <div key={j} style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 4, padding: '3px 6px' }}>
                                        <span style={{ fontSize: 6.5, fontWeight: 800, color: '#e65100', fontFamily: 'system-ui', textTransform: 'uppercase', display: 'block' }}>⚠ Risk</span>
                                        <span style={{ fontSize: 7.5, color: '#5d4037', lineHeight: 1.3, display: 'block' }}>{kr}</span>
                                    </div>
                                ))}
                                {tier.insight && (
                                    <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 4, padding: '3px 6px' }}>
                                        <span style={{ fontSize: 6.5, fontWeight: 800, color: '#2e7d32', fontFamily: 'system-ui', textTransform: 'uppercase', display: 'block' }}>✓ Tip</span>
                                        <span style={{ fontSize: 7.5, color: '#1b5e20', lineHeight: 1.3, display: 'block' }}>{tier.insight}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <div style={{ padding: '5px 60px', textAlign: 'right', flexShrink: 0, position: 'relative' }}>
                <span style={{ fontSize: 7.5, color: '#b0896a', letterSpacing: 1 }}>makepost.pro  •  study notes series</span>
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
                                                <p style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={14} color="#1d4ed8" /> Post Content</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                    {(c?.body || '').split('\n').filter(l => l.trim()).map((line, i) => {
                                                        // Numbered: "1. text"
                                                        const numMatch = line.match(/^(\d+)\.\s+(.+)/);
                                                        // Dash: "— text"
                                                        const dashMatch = line.match(/^—\s*(.+)/);
                                                        // Bullet: "• text" or "* text"
                                                        const bulletMatch = line.match(/^[•\*]\s*(.+)/);

                                                        if (numMatch) {
                                                            return (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                                    <span style={{ minWidth: 28, height: 28, borderRadius: '50%', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{numMatch[1]}</span>
                                                                    <span style={{ fontSize: 16, color: '#1e293b', lineHeight: 1.65, fontWeight: 450 }}>{numMatch[2]}</span>
                                                                </div>
                                                            );
                                                        } else if (dashMatch || bulletMatch) {
                                                            const text = (dashMatch || bulletMatch)[1];
                                                            return (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '11px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c54444', flexShrink: 0, marginTop: 8 }} />
                                                                    <span style={{ fontSize: 16, color: '#1e293b', lineHeight: 1.65, fontWeight: 450 }}>{text}</span>
                                                                </div>
                                                            );
                                                        } else {
                                                            return <p key={i} style={{ fontSize: 16, color: '#334155', margin: '8px 0', lineHeight: 1.7 }}>{line}</p>;
                                                        }
                                                    })}
                                                </div>
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

            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } * { box-sizing: border-box; }`}</style>
        </div>
    );
}

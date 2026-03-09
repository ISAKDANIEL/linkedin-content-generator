import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, Check, ArrowLeft, Loader2, CreditCard, X, Smartphone, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

const PLANS = [
    {
        product_id: 'pdt_0Na7FjdXD1pQPf21Coma5',
        name: 'Starter Pack',
        credits: 30,
        price: 59,
        per_credit: '~₹1.97',
        color: '#c54444',
        highlight: false,
        icon: <Zap size={28} />,
        features: [
            '30 AI-generated posts',
            'AI infographic per post',
            'All visual styles',
            'Full post copy (hook + body + CTA)',
            'Hashtag generation',
        ],
    },
    {
        product_id: 'pdt_0Na7IIoUe4whzt1vb7sbT',
        name: 'Pro Pack',
        credits: 90,
        price: 149,
        per_credit: '~₹1.66',
        color: '#6366f1',
        highlight: true,
        badge: 'Best Value',
        icon: <Star size={28} />,
        features: [
            '90 AI-generated posts',
            'AI infographic per post',
            'All visual styles',
            'Full post copy (hook + body + CTA)',
            'Hashtag generation',
            'Save 15% vs Starter',
        ],
    },
];

// ── UPI QR Modal ──────────────────────────────────────────────────────────────
function UpiModal({ plan, upiId, merchantName, onClose, onSuccess }) {
    const [utr, setUtr] = useState('');
    const [step, setStep] = useState('qr'); // qr | confirm | done
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${plan.price}&cu=INR&tn=${encodeURIComponent(`MakePost ${plan.credits} Credits`)}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}&color=000000&bgcolor=ffffff&margin=8`;

    const copyUpi = () => {
        navigator.clipboard?.writeText(upiId).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('UPI ID copied!');
    };

    const handleSubmitUtr = async () => {
        if (!utr.trim() || utr.trim().length < 6) {
            toast.error('Enter a valid Transaction ID / UTR');
            return;
        }
        if (!isAuthenticated) {
            navigate('/login?redirect=/pricing');
            return;
        }
        setSubmitting(true);
        try {
            const res = await paymentAPI.upiSubmit(plan.product_id, utr.trim());
            setStep('done');
            onSuccess(res.credits_remaining);
        } catch (err) {
            toast.error(err.message || 'Verification failed. Check your UTR and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, backdropFilter: 'blur(4px)',
            }}
        >
            <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: 28, padding: 0,
                    maxWidth: 420, width: '100%',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                            {plan.name}
                        </p>
                        <p style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>
                            Pay ₹{plan.price} — Get {plan.credits} Credits
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: 28 }}>

                    {step === 'qr' && (
                        <>
                            {/* Step indicators */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                                {['Scan & Pay', 'Enter UTR', 'Done'].map((s, i) => (
                                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{
                                            height: 4, borderRadius: 4, marginBottom: 6,
                                            background: i === 0 ? plan.color : '#e2e8f0',
                                        }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? plan.color : '#94a3b8' }}>{s}</span>
                                    </div>
                                ))}
                            </div>

                            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 18 }}>
                                Scan with <strong>PhonePe · GPay · Paytm · BHIM</strong> or any UPI app
                            </p>

                            {/* QR Code */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                <div style={{
                                    border: `3px solid ${plan.color}30`,
                                    borderRadius: 20, padding: 12,
                                    boxShadow: `0 8px 24px ${plan.color}20`,
                                    background: 'white',
                                }}>
                                    <img
                                        src={qrUrl}
                                        alt="UPI QR Code"
                                        width={220} height={220}
                                        style={{ borderRadius: 12, display: 'block' }}
                                    />
                                </div>
                            </div>

                            {/* Amount badge */}
                            <div style={{
                                display: 'flex', justifyContent: 'center', marginBottom: 16,
                            }}>
                                <div style={{
                                    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                    borderRadius: 12, padding: '8px 20px',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Amount:</span>
                                    <span style={{ fontSize: 20, fontWeight: 900, color: '#166534' }}>₹{plan.price}</span>
                                </div>
                            </div>

                            {/* UPI ID copy */}
                            <div style={{
                                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                                borderRadius: 14, padding: '12px 16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 22,
                            }}>
                                <div>
                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>UPI ID</p>
                                    <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{upiId}</p>
                                </div>
                                <button onClick={copyUpi} style={{
                                    background: copied ? '#dcfce7' : '#f1f5f9',
                                    border: 'none', borderRadius: 10, padding: '8px 14px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 12, fontWeight: 700,
                                    color: copied ? '#166534' : '#475569',
                                    transition: 'all 0.2s',
                                }}>
                                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            {/* Open UPI app button */}
                            <a
                                href={upiLink}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 10, width: '100%', padding: '14px', borderRadius: 16,
                                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                                    color: 'white', fontWeight: 800, fontSize: 15,
                                    textDecoration: 'none', marginBottom: 12,
                                    boxShadow: `0 6px 18px ${plan.color}40`,
                                }}
                            >
                                <Smartphone size={18} /> Open UPI App
                            </a>

                            <button
                                onClick={() => setStep('confirm')}
                                style={{
                                    width: '100%', padding: '13px', borderRadius: 16,
                                    background: 'white', border: `2px solid ${plan.color}`,
                                    color: plan.color, fontWeight: 800, fontSize: 14,
                                    cursor: 'pointer',
                                }}
                            >
                                I've Paid → Enter Transaction ID
                            </button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            {/* Step indicators */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                                {['Scan & Pay', 'Enter UTR', 'Done'].map((s, i) => (
                                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{
                                            height: 4, borderRadius: 4, marginBottom: 6,
                                            background: i <= 1 ? plan.color : '#e2e8f0',
                                        }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: i <= 1 ? plan.color : '#94a3b8' }}>{s}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 48, marginBottom: 10 }}>🧾</div>
                                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Enter Transaction ID</p>
                                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                                    Open your UPI app → Tap the payment → Copy the <strong>UTR / Transaction Reference No.</strong>
                                </p>
                            </div>

                            {/* Where to find UTR */}
                            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
                                <p style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>📍 Where to find UTR?</p>
                                <ul style={{ fontSize: 12, color: '#78350f', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                                    <li><strong>PhonePe</strong> → History → Tap payment → UTR No.</li>
                                    <li><strong>GPay</strong> → Activity → Tap payment → UPI Ref ID</li>
                                    <li><strong>Paytm</strong> → Passbook → Tap payment → Reference</li>
                                </ul>
                            </div>

                            <input
                                type="text"
                                placeholder="e.g. 412345678901"
                                value={utr}
                                onChange={e => setUtr(e.target.value)}
                                style={{
                                    width: '100%', padding: '14px 16px', borderRadius: 14,
                                    border: `1.5px solid ${utr.length > 5 ? plan.color : '#e2e8f0'}`,
                                    fontSize: 15, fontWeight: 700, fontFamily: 'monospace',
                                    outline: 'none', marginBottom: 16, boxSizing: 'border-box',
                                    background: '#fafafa', letterSpacing: 1,
                                    transition: 'border-color 0.2s',
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleSubmitUtr()}
                            />

                            <button
                                onClick={handleSubmitUtr}
                                disabled={submitting || utr.trim().length < 6}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 16,
                                    background: submitting || utr.trim().length < 6
                                        ? '#e2e8f0'
                                        : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                                    color: submitting || utr.trim().length < 6 ? '#94a3b8' : 'white',
                                    fontWeight: 800, fontSize: 15, border: 'none',
                                    cursor: submitting || utr.trim().length < 6 ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    boxShadow: utr.trim().length > 5 ? `0 6px 18px ${plan.color}40` : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {submitting ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Confirm Payment'}
                            </button>

                            <button
                                onClick={() => setStep('qr')}
                                style={{ background: 'none', border: 'none', width: '100%', marginTop: 12, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                            >
                                ← Back to QR
                            </button>
                        </>
                    )}

                    {step === 'done' && (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            {/* Step indicators */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                                {['Scan & Pay', 'Enter UTR', 'Done'].map((s, i) => (
                                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ height: 4, borderRadius: 4, marginBottom: 6, background: plan.color }} />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: plan.color }}>{s}</span>
                                    </div>
                                ))}
                            </div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                            >
                                <CheckCircle size={72} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
                            </motion.div>
                            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                                {plan.credits} Credits Added! 🎉
                            </h2>
                            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
                                Your account has been credited. Start creating amazing posts now!
                            </p>
                            <button
                                onClick={() => { onClose(); }}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 16,
                                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                                    color: 'white', fontWeight: 800, fontSize: 15,
                                    border: 'none', cursor: 'pointer',
                                    boxShadow: `0 6px 18px ${plan.color}40`,
                                }}
                            >
                                Start Creating →
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main Pricing Page ─────────────────────────────────────────────────────────
export default function PricingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [upiConfig, setUpiConfig] = useState({ upi_id: '', merchant_name: 'MakePost', configured: false });
    const [loadingPlanId, setLoadingPlanId] = useState(null);

    useEffect(() => {
        paymentAPI.upiConfig().then(d => setUpiConfig(d)).catch(() => {});
    }, []);

    const handleBuy = async (plan) => {
        if (!isAuthenticated) {
            navigate('/login?redirect=/pricing');
            return;
        }

        setLoadingPlanId(plan.product_id);
        try {
            const res = await paymentAPI.createCheckout(plan.product_id);
            if (res.payment_link) {
                // Redirect to Dodo hosted checkout (has UPI QR + cards built-in)
                window.location.href = res.payment_link;
            } else {
                toast.error('Could not create payment session. Try again.');
            }
        } catch (err) {
            // Fallback to manual UPI QR if Dodo checkout fails
            if (upiConfig.configured) {
                setSelectedPlan(plan);
            } else {
                toast.error(err.message || 'Payment setup failed. Please try again.');
            }
        } finally {
            setLoadingPlanId(null);
        }
    };

    const handleSuccess = (newBalance) => {
        toast.success(`Credits added! Balance: ${newBalance}`);
        setTimeout(() => navigate('/generate'), 1800);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-white text-slate-900">

            {/* UPI Modal */}
            <AnimatePresence>
                {selectedPlan && upiConfig.configured && (
                    <UpiModal
                        plan={selectedPlan}
                        upiId={upiConfig.upi_id}
                        merchantName={upiConfig.merchant_name}
                        onClose={() => setSelectedPlan(null)}
                        onSuccess={handleSuccess}
                    />
                )}
                {selectedPlan && !upiConfig.configured && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSelectedPlan(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'white', borderRadius: 24, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
                            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Payment not configured</h3>
                            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                                Set <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>MERCHANT_UPI_ID</code> in your <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>backend.env</code> file to enable UPI payments.
                            </p>
                            <button onClick={() => setSelectedPlan(null)} style={{ padding: '10px 24px', borderRadius: 14, background: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
                <Logo size="medium" />
                <button
                    onClick={() => navigate(isAuthenticated ? '/generate' : '/')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </nav>

            {/* Header */}
            <section className="text-center px-6 pt-12 pb-4 max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <h1 className="text-5xl font-extrabold leading-tight text-slate-900 mb-4">
                        Simple, honest pricing
                    </h1>
                    <p className="text-slate-600 text-lg max-w-xl mx-auto">
                        Each generation costs <strong>1 credit</strong>. Buy a pack and use it at your own pace — no subscriptions, no surprises.
                    </p>
                </motion.div>
            </section>

            {/* Plans */}
            <section className="px-6 py-16 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {PLANS.map((plan, i) => (
                        <motion.div
                            key={plan.product_id}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            style={{
                                position: 'relative', borderRadius: 28,
                                border: `2px solid ${plan.highlight ? plan.color : '#e2e8f0'}`,
                                padding: 32, display: 'flex', flexDirection: 'column', gap: 24,
                                background: 'white',
                                boxShadow: plan.highlight ? `0 8px 30px ${plan.color}30` : '0 4px 20px rgba(0,0,0,0.06)',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = `0 20px 50px ${plan.color}45`;
                                e.currentTarget.style.borderColor = plan.color;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = plan.highlight ? `0 8px 30px ${plan.color}30` : '0 4px 20px rgba(0,0,0,0.06)';
                                e.currentTarget.style.borderColor = plan.highlight ? plan.color : '#e2e8f0';
                            }}
                        >
                            {plan.badge && (
                                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)' }}>
                                    <span style={{ background: plan.color, color: 'white', fontSize: 12, fontWeight: 800, padding: '6px 18px', borderRadius: 999, boxShadow: `0 4px 14px ${plan.color}50`, whiteSpace: 'nowrap' }}>
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow" style={{ background: plan.color }}>
                                    {plan.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.name}</p>
                                    <p className="text-2xl font-black text-slate-900">{plan.credits} Credits</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-5xl font-black text-slate-900">₹{plan.price}</span>
                                <span className="text-slate-400 text-sm ml-2">one-time</span>
                                <p className="text-slate-400 text-sm mt-1">{plan.per_credit} per generation</p>
                            </div>

                            <ul className="flex flex-col gap-3">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-slate-700">
                                        <Check size={16} className="text-green-500 flex-shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleBuy(plan)}
                                disabled={loadingPlanId === plan.product_id}
                                className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{ background: plan.color }}
                            >
                                {loadingPlanId === plan.product_id
                                    ? <><Loader2 size={18} className="animate-spin" /> Creating checkout...</>
                                    : <><CreditCard size={18} /> Get {plan.credits} Credits — ₹{plan.price}</>
                                }
                            </button>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="px-6 pb-20 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">FAQ</h2>
                <div className="flex flex-col gap-5">
                    {[
                        { q: 'What counts as 1 credit?', a: 'Every time you click "Generate Masterpiece" and get a post + infographic, it uses 1 credit.' },
                        { q: 'Do credits expire?', a: 'No. Credits are yours forever — use them whenever you want.' },
                        { q: 'Can I get a refund?', a: 'Unused credits can be refunded within 14 days. Contact support.' },
                        { q: 'Do I get free credits?', a: 'Yes! Every new account starts with 3 free credits so you can try before you buy.' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
                            <p className="font-bold text-slate-900 mb-2">{item.q}</p>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

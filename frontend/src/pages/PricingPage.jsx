import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Star, Check, ArrowLeft, Loader2, CreditCard } from 'lucide-react';
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

// ── Main Pricing Page ─────────────────────────────────────────────────────────
export default function PricingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [loadingPlanId, setLoadingPlanId] = useState(null);

    const handleBuy = async (plan) => {
        if (!isAuthenticated) {
            navigate('/login?redirect=/pricing');
            return;
        }
        setLoadingPlanId(plan.product_id);
        try {
            const res = await paymentAPI.createCheckout(plan.product_id);
            if (res.payment_link) {
                window.location.href = res.payment_link;
            } else {
                toast.error('Could not create payment session. Try again.');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to create payment session. Please try again.');
        } finally {
            setLoadingPlanId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-white text-slate-900">

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

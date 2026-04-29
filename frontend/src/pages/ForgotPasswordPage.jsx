import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { toast.error('Enter your email'); return; }
        setLoading(true);
        try {
            await authAPI.forgotPassword(email.trim().toLowerCase());
            setSent(true);
        } catch (err) {
            toast.error(err.message || 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #fff1f1 0%, #fdf4ff 40%, #f0f4ff 100%)' }}>

            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(197,68,68,0.15) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4 justify-center w-full">
                        <Logo size="medium" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Forgot password?</h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        No worries, we'll send you a reset link.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    {!sent ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Email address
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        autoFocus
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md"
                                style={{ background: '#c54444' }}
                            >
                                {loading
                                    ? <Loader2 size={18} className="animate-spin" />
                                    : 'Send Reset Link'
                                }
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 font-semibold hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={15} /> Back to Sign In
                            </button>
                        </form>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4 space-y-4"
                        >
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle size={36} className="text-green-500" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                If <strong>{email}</strong> has an account, a password reset link was sent.<br />
                                Check your inbox (and spam folder).
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                                <p className="text-xs text-amber-800 font-semibold mb-1">No email service configured?</p>
                                <p className="text-xs text-amber-700">Check your backend terminal. The reset link is printed there.</p>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                            >
                                <ArrowLeft size={15} /> Back to Sign In
                            </button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

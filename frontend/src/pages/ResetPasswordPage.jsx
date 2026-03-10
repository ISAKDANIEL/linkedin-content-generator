import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import Logo from '../components/ui/Logo';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [token, setToken] = useState('');
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [tokenMissing, setTokenMissing] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('token');
        if (!t) {
            setTokenMissing(true);
        } else {
            setToken(t);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (form.password !== form.confirm) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await authAPI.resetPassword(token, form.password);
            setDone(true);
        } catch (err) {
            toast.error(err.message || 'Reset failed. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    const strength = (() => {
        const p = form.password;
        if (!p) return null;
        if (p.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
        if (p.length < 8) return { label: 'Weak', color: '#f59e0b', width: '40%' };
        if (p.length < 12 && /[A-Z]/.test(p) && /\d/.test(p)) return { label: 'Good', color: '#3b82f6', width: '70%' };
        if (p.length >= 12 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)) return { label: 'Strong', color: '#22c55e', width: '100%' };
        return { label: 'Medium', color: '#6366f1', width: '55%' };
    })();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #fff1f1 0%, #fdf4ff 40%, #f0f4ff 100%)' }}>

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
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4 justify-center w-full">
                        <Logo size="medium" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        {tokenMissing ? 'Invalid link' : done ? 'Password updated!' : 'Set new password'}
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        {tokenMissing ? 'This reset link is invalid or missing.' : done ? 'You can now sign in with your new password.' : 'Must be at least 6 characters.'}
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">

                    {/* Token missing */}
                    {tokenMissing && (
                        <div className="text-center space-y-4 py-2">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertCircle size={36} className="text-red-500" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm">
                                The reset link is invalid or has already been used. Please request a new one.
                            </p>
                            <button
                                onClick={() => navigate('/forgot-password')}
                                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all shadow-md"
                                style={{ background: '#c54444' }}
                            >
                                Request New Link
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 font-semibold hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={15} /> Back to Sign In
                            </button>
                        </div>
                    )}

                    {/* Success */}
                    {done && !tokenMissing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4 py-2"
                        >
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle size={36} className="text-green-500" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm">Your password has been updated successfully.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all"
                                style={{ background: '#c54444' }}
                            >
                                Sign In Now
                            </button>
                        </motion.div>
                    )}

                    {/* Form */}
                    {!done && !tokenMissing && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* New password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        required
                                        autoFocus
                                        placeholder="At least 6 characters"
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {/* Strength bar */}
                                {strength && (
                                    <div className="mt-2">
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div style={{ width: strength.width, background: strength.color, height: '100%', borderRadius: '999px', transition: 'width 0.3s, background 0.3s' }} />
                                        </div>
                                        <p className="text-xs mt-1 font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        required
                                        placeholder="Repeat password"
                                        value={form.confirm}
                                        onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                        className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm ${
                                            form.confirm && form.password !== form.confirm
                                                ? 'border-red-300 bg-red-50'
                                                : form.confirm && form.password === form.confirm
                                                ? 'border-green-300 bg-green-50'
                                                : 'border-slate-300'
                                        }`}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {form.confirm && form.password !== form.confirm && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>
                                )}
                                {form.confirm && form.password === form.confirm && (
                                    <p className="text-xs text-green-600 mt-1 font-medium">Passwords match</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || form.password !== form.confirm || form.password.length < 6}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#c54444' }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 font-semibold hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={15} /> Back to Sign In
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

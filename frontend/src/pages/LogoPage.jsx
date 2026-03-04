import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../components/ui/Logo';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LogoPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate(-1)}
                className="fixed top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold"
            >
                <ArrowLeft size={20} /> Back
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
            >
                <h1 className="text-4xl font-black text-slate-900 mb-4">Branding Identity</h1>
                <p className="text-slate-500 text-lg">LinkedIn Content Generator (LCG)</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-end">
                <div className="flex flex-col items-center gap-4">
                    <Logo size="small" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Small (32px)</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <Logo size="medium" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Medium (40px)</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <Logo size="large" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Large (64px)</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <Logo size="xl" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extra Large (96px)</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
            >
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
                    <Logo size="medium" />
                    <div>
                        <h3 className="font-bold text-slate-900">Sidebar / UI Icon</h3>
                        <p className="text-sm text-slate-500">Standard icon for navigation and UI elements.</p>
                    </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-3xl shadow-xl flex items-center gap-6">
                    <Logo size="medium" />
                    <div>
                        <h3 className="font-bold text-white">Dark Mode Context</h3>
                        <p className="text-sm text-slate-400">High contrast visibility on dark backgrounds.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

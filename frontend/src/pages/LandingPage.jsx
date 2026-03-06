import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, BarChart2, Hash, Zap, ChevronDown, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const goToApp = () => navigate(isAuthenticated ? '/generate' : '/login');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
            {/* ── Navbar ── */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto bg-white/80 backdrop-blur-md sticky top-0 z-50 rounded-b-2xl border-b border-slate-200 shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <Logo size="small" />
                    <span className="font-bold text-xl tracking-tight text-slate-900">LinkedIn Content Generator</span>
                </div>

                <div className="flex items-center gap-3">
                    {!isAuthenticated && (
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            <LogIn size={15} /> Sign In
                        </button>
                    )}
                    <button
                        onClick={goToApp}
                        className="text-sm font-semibold px-5 py-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                        {isAuthenticated ? 'Open App' : 'Get Started'} <ArrowRight size={15} />
                    </button>
                </div>
            </motion.nav>

            {/* ── HERO ── */}
            <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full mb-8 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-sm"
                >
                    <Zap size={14} className="text-indigo-600" />
                    Powered by GPT-4o — Built for Professionals
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-slate-900"
                >
                    Create Viral LinkedIn
                    <br />
                    Content in <span className="text-indigo-600">Seconds</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-6 text-xl text-slate-600 max-w-2xl leading-relaxed"
                >
                    Stop staring at a blank screen. Get the hook, the post, the infographic,
                    and the hashtags — all AI-generated, all in one click.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full"
                >
                    <button
                        onClick={goToApp}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {isAuthenticated ? 'Open App' : 'Start Creating Free'} <ArrowRight size={20} />
                    </button>
                    <button
                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        See How It Works <ChevronDown size={18} />
                    </button>
                </motion.div>

                {/* stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mt-16 pt-8 border-t border-slate-200 w-full max-w-3xl"
                >
                    {[
                        { value: '10×', label: 'Faster content creation' },
                        { value: '5+', label: 'Content types generated' },
                        { value: '98%', label: 'Satisfaction rate' },
                    ].map((s, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl font-black text-slate-900">{s.value}</div>
                            <div className="text-slate-500 text-sm font-medium mt-1">{s.label}</div>
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-24 max-w-5xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-4xl font-extrabold text-slate-900 mb-4">3 Steps. That's it.</h2>
                    <p className="text-slate-600 text-lg">Seriously, it cannot be simpler.</p>
                </motion.div>

                <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative">
                    <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-1 bg-slate-200 -z-10 rounded-full" />
                    {[
                        { step: '01', title: 'Sign Up Free', desc: 'Create an account with email or Google — no credit card needed.' },
                        { step: '02', title: 'Enter a Topic', desc: 'Type your post idea and choose your tone and target audience.' },
                        { step: '03', title: 'Get Magic ✨', desc: 'AI crafts your post, infographic & hashtags — ready to copy & paste.' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.15 }}
                            className="flex-1 flex flex-col items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto relative"
                        >
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black mb-6 bg-indigo-600 text-white shadow-lg border-4 border-white md:-mt-14">
                                {item.step}
                            </div>
                            <h3 className="text-slate-900 font-bold text-xl mb-3">{item.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── BOTTOM CTA ── */}
            <section className="pb-24 px-6 max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="rounded-3xl p-12 bg-indigo-600 text-white shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500 rounded-full opacity-50" />
                    <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-indigo-700 rounded-full opacity-50" />
                    <div className="relative z-10">
                        <h2 className="text-4xl font-extrabold mb-6">Ready to go viral?</h2>
                        <p className="text-indigo-100 mb-10 text-lg max-w-xl mx-auto">
                            Join creators who use LinkedIn Content Generator to build their LinkedIn presence with high-quality, professional posts.
                        </p>
                        <button
                            onClick={goToApp}
                            className="px-10 py-4 rounded-full bg-white text-indigo-700 font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {isAuthenticated ? 'Open App →' : 'Create My First Post — Free'}
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* ── Footer ── */}
            <footer className="bg-slate-900 text-slate-400 py-10 text-center text-sm border-t border-slate-800">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Logo size="small" />
                    <span className="font-bold text-white tracking-tight">LinkedIn Content Generator</span>
                </div>
                <p>© 2026 LinkedIn Content Generator · Built with GPT-4o · React · Flask</p>
            </footer>
        </div>
    );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, BarChart2, Hash, Zap, ChevronDown, LogIn, Linkedin, Twitter, Facebook, Instagram, MessageSquare, Mail, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const goToApp = () => navigate(isAuthenticated ? '/generate' : '/login');

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-white text-slate-900 font-sans overflow-x-hidden">
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 35s linear infinite;
                }
                .hover-pause:hover .animate-marquee {
                    animation-play-state: paused;
                }
            `}</style>

            {/* ── Navbar ── */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto bg-white/80 backdrop-blur-md sticky top-0 z-50 rounded-b-2xl border-b border-slate-200 shadow-sm"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Logo size="medium" />
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {!isAuthenticated && (
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-full text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            <LogIn size={15} /> <span className="hidden sm:inline">Sign In</span>
                        </button>
                    )}
                    <button
                        onClick={goToApp}
                        className="text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-rose-800 text-white hover:bg-rose-900 transition-colors shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                        {isAuthenticated ? 'Open App' : 'Get Started'} <ArrowRight size={15} />
                    </button>
                </div>
            </motion.nav>

            {/* ── HERO ── */}
            <section className="relative flex flex-col items-center text-center px-4 sm:px-6 pt-12 sm:pt-24 pb-12 sm:pb-20 max-w-5xl mx-auto">


                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-slate-900"
                >
                    Create Viral LinkedIn
                    <br />
                    Content in <span className="text-rose-800">Seconds</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl leading-relaxed"
                >
                    Stop staring at a blank screen. Get the hook, the post, the infographic,
                    and the hashtags, all AI-generated, all in one click.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full"
                >
                    <button
                        onClick={goToApp}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-rose-800 text-white font-bold text-lg hover:bg-rose-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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

                {/* ── PLATFORM MARQUEE ── */}
                <div className="mt-16 sm:mt-24 w-full overflow-hidden relative max-w-6xl mx-auto hover-pause">
                    {/* Gradient Fades for edges */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

                    <div className="flex w-max animate-marquee items-center gap-6 py-4">
                        {/* Duplicate the array twice for seamless infinite scroll */}
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-6 items-center pr-6">
                                {[
                                    { name: 'LinkedIn', icon: <Linkedin size={26} color="#0077B5" /> },
                                    { name: 'Twitter / X', icon: <Twitter size={26} color="#0f1419" /> },
                                    { name: 'Facebook', icon: <Facebook size={26} color="#1877F2" /> },
                                    { name: 'Instagram', icon: <Instagram size={26} color="#E4405F" /> },
                                    { name: 'YouTube', icon: <Youtube size={26} color="#FF0000" /> },
                                    { name: 'Medium', icon: <FileText size={26} color="#000000" /> },
                                    { name: 'Reddit', icon: <MessageSquare size={26} color="#FF4500" /> },
                                    { name: 'Substack', icon: <Mail size={26} color="#FF6719" /> },
                                ].map((platform, j) => (
                                    <div key={j} className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 cursor-default transition-transform hover:scale-105 hover:shadow-md">
                                        {platform.icon}
                                        <span className="font-extrabold text-slate-700 text-lg tracking-tight">{platform.name}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-12 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">3 Steps. That's it.</h2>
                    <p className="text-slate-600 text-base sm:text-lg">Seriously, it cannot be simpler.</p>
                </motion.div>

                <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative">
                    <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-1 bg-slate-200 -z-10 rounded-full" />
                    {[
                        { step: '01', title: 'Sign Up Free', desc: 'Create an account with email or Google. No credit card needed.' },
                        { step: '02', title: 'Enter a Topic', desc: 'Type your post idea and choose your tone and target audience.' },
                        { step: '03', title: 'Get Magic ✨', desc: 'AI crafts your post, infographic & hashtags, ready to copy & paste.' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.15 }}
                            className="flex-1 flex flex-col items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto relative"
                        >
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black mb-6 bg-rose-800 text-white shadow-lg border-4 border-white md:-mt-14">
                                {item.step}
                            </div>
                            <h3 className="text-slate-900 font-bold text-xl mb-3">{item.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── BOTTOM CTA ── */}
            <section className="pb-16 sm:pb-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="rounded-3xl p-6 sm:p-12 bg-rose-800 text-white shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-rose-700 rounded-full opacity-50" />
                    <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-rose-900 rounded-full opacity-50" />
                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 sm:mb-6">Ready to go viral?</h2>
                        <p className="text-rose-100 mb-8 sm:mb-10 text-base sm:text-lg max-w-xl mx-auto">
                            Join creators who use Make Post to build their LinkedIn presence with high-quality, professional posts.
                        </p>
                        <button
                            onClick={goToApp}
                            className="w-full sm:w-auto px-8 sm:px-10 py-4 rounded-full bg-white text-rose-900 font-bold text-base sm:text-lg hover:bg-rose-50 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {isAuthenticated ? 'Open App' : 'Create My First Post Free'}
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* ── Footer ── */}
            <footer className="bg-slate-900 text-slate-400 py-10 text-center text-sm border-t border-slate-800">
                <div className="flex items-center justify-center gap-2">
                    <Logo size="medium" />
                </div>
            </footer>
        </div>
    );
}

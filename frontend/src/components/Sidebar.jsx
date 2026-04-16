import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Trash2, Clock, LogOut, ChevronLeft, ChevronRight, Zap, ShoppingCart, Shield, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { historyAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';
import Logo from './ui/Logo';
import { useNavigate } from 'react-router-dom';

function TimeAgo({ dateStr }) {
    const date = new Date(dateStr);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return <span>just now</span>;
    if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>;
    if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>;
    return <span>{date.toLocaleDateString()}</span>;
}

export default function Sidebar({ onNewPost, onSelectHistory, currentHistoryId, mobileOpen, onMobileClose }) {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [collapsed, setCollapsed] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [credits, setCredits] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const fetchHistory = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoadingHistory(true);
        try {
            const data = await historyAPI.getAll();
            setHistory(data.history || []);
        } catch {
            // Silent fail
        } finally {
            setLoadingHistory(false);
        }
    }, [isAuthenticated]);

    const fetchCredits = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await paymentAPI.getCredits();
            setCredits(data.credits ?? 0);
        } catch {}
    }, [isAuthenticated]);

    useEffect(() => {
        fetchHistory();
        fetchCredits();
    }, [fetchHistory, fetchCredits]);

    useEffect(() => {
        window.__refreshSidebar = () => { fetchHistory(); fetchCredits(); };
        return () => { delete window.__refreshSidebar; };
    }, [fetchHistory, fetchCredits]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setDeletingId(id);
        try {
            await historyAPI.delete(id);
            setHistory(h => h.filter(item => item.id !== id));
            toast.success('Deleted');
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : user?.email?.[0]?.toUpperCase() || '?';

    const handleNavAction = (fn) => {
        fn();
        if (isMobile && onMobileClose) onMobileClose();
    };

    const sidebarContent = (isDrawer = false) => (
        <div className="relative flex flex-col h-full bg-white">
            {/* Mobile close button */}
            {isDrawer && (
                <button
                    onClick={onMobileClose}
                    className="absolute right-3 top-4 z-20 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <X size={16} className="text-slate-600" />
                </button>
            )}

            {/* Collapse toggle — desktop only */}
            {!isDrawer && (
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute right-3 top-6 z-20 w-8 h-8 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}

            {/* Logo */}
            <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-center gap-3 overflow-hidden">
                <Logo size="medium" className="flex-shrink-0" />
            </div>

            {/* New Post button */}
            <div className="px-3 py-3">
                <button
                    onClick={() => handleNavAction(onNewPost)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm justify-center"
                >
                    <PlusCircle size={18} className="flex-shrink-0" />
                    <AnimatePresence>
                        {(!collapsed || isDrawer) && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-nowrap"
                            >
                                New Post
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                {(!collapsed || isDrawer) && (
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2 pb-1.5">
                        Recent
                    </p>
                )}
                {loadingHistory && (!collapsed || isDrawer) && (
                    <div className="space-y-2 px-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                )}
                {!loadingHistory && history.length === 0 && (!collapsed || isDrawer) && (
                    <div className="text-center py-8 px-4">
                        <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No history yet.<br />Generate your first post!</p>
                    </div>
                )}
                <div className="space-y-0.5">
                    {history.map(item => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            onClick={() => handleNavAction(() => onSelectHistory(item.id))}
                            className={`group relative flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors ${currentHistoryId === item.id
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'hover:bg-slate-100 text-slate-700'
                                }`}
                        >
                            <Clock size={14} className="flex-shrink-0 text-slate-400" />
                            {(!collapsed || isDrawer) && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
                                </div>
                            )}
                            {(!collapsed || isDrawer) && (
                                <button
                                    onClick={e => handleDelete(e, item.id)}
                                    disabled={deletingId === item.id}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 hover:text-red-600 text-slate-400 transition-all flex-shrink-0"
                                >
                                    {deletingId === item.id
                                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                        : <Trash2 size={13} />}
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Admin link */}
            {(!collapsed || isDrawer) && user?.email === 'admin@gmail.com' && (
                <div className="px-3 pb-1">
                    <button
                        onClick={() => handleNavAction(() => navigate('/admin'))}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-xs hover:bg-violet-100 transition-colors"
                    >
                        <Shield size={14} className="flex-shrink-0" />
                        Admin Panel
                    </button>
                </div>
            )}

            {/* Credits badge */}
            {(!collapsed || isDrawer) && (
                <div className="px-3 pb-2">
                    <div
                        className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleNavAction(() => navigate('/pricing'))}
                        title="Buy more credits"
                    >
                        <div className="flex items-center gap-2">
                            <Zap size={15} className={credits === 0 ? 'text-red-500' : 'text-amber-500'} />
                            <span className="text-xs font-semibold text-slate-700">
                                {credits === null ? '…' : `${credits} credit${credits !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                            <ShoppingCart size={12} /> Buy
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed icon */}
            {collapsed && !isDrawer && (
                <div className="px-3 pb-2 flex justify-center">
                    <button
                        onClick={() => navigate('/pricing')}
                        title="Buy credits"
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <Zap size={16} className={credits === 0 ? 'text-red-500' : 'text-amber-500'} />
                    </button>
                </div>
            )}

            {/* User profile + logout */}
            <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {initials}
                    </div>
                    {(!collapsed || isDrawer) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                    )}
                    <button
                        onClick={() => { logout(); }}
                        title="Logout"
                        className="ml-auto flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={onMobileClose}
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'rgba(0,0,0,0.45)',
                                zIndex: 400,
                            }}
                        />
                        {/* Drawer */}
                        <motion.aside
                            key="drawer"
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            style={{
                                position: 'fixed', left: 0, top: 0, bottom: 0,
                                width: 280, zIndex: 500,
                                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
                            }}
                        >
                            {sidebarContent(true)}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        );
    }

    // Desktop sidebar
    return (
        <motion.aside
            animate={{ width: collapsed ? 64 : 280 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative flex flex-col h-screen bg-white border-r border-slate-200 shadow-sm flex-shrink-0"
        >
            {sidebarContent(false)}
        </motion.aside>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    Users, CreditCard, Zap, BarChart2, Trash2, Plus, RefreshCw,
    LogOut, Shield, ChevronDown, ChevronUp, Search
} from 'lucide-react';

const ADMIN_EMAIL = 'admin@gmail.com';

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div style={{
            background: 'white', borderRadius: 16, padding: '20px 24px',
            border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 12, background: color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={22} style={{ color }} />
            </div>
            <div>
                <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {label}
                </p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                    {value ?? '—'}
                </p>
            </div>
        </div>
    );
}

function CreditsModal({ user, onClose, onSave }) {
    const [action, setAction] = useState('add');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const n = parseInt(amount);
        if (isNaN(n) || n < 0) { toast.error('Enter a valid number'); return; }
        setSaving(true);
        try {
            await onSave(user.id, action, n);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
            }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                    Update Credits
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                    {user.email} — current: <strong>{user.credits}</strong>
                </p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['add', 'set'].map(a => (
                        <button key={a} onClick={() => setAction(a)} style={{
                            flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid',
                            borderColor: action === a ? '#6366f1' : '#e2e8f0',
                            background: action === a ? '#6366f1' : 'white',
                            color: action === a ? 'white' : '#64748b',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}>
                            {a === 'add' ? 'Add Credits' : 'Set to Exact'}
                        </button>
                    ))}
                </div>

                <input
                    type="number" min="0" placeholder="Amount"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    style={{
                        width: '100%', padding: '11px 14px', borderRadius: 10,
                        border: '1.5px solid #e2e8f0', fontSize: 15, fontWeight: 700,
                        outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                    }}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                        background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{
                        flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                        background: '#6366f1', color: 'white', fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const navigate = useNavigate();
    const { user, isAuthenticated, loading, logout } = useAuth();

    const [tab, setTab] = useState('users');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [history, setHistory] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [creditModal, setCreditModal] = useState(null); // user object
    const [search, setSearch] = useState('');
    const [sortDir, setSortDir] = useState('desc');

    // Guard: redirect non-admin
    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) { navigate('/login'); return; }
            if (user?.email !== ADMIN_EMAIL) { navigate('/'); return; }
        }
    }, [loading, isAuthenticated, user, navigate]);

    const fetchAll = useCallback(async () => {
        setFetching(true);
        try {
            const [s, u, p, h] = await Promise.all([
                adminAPI.getStats(),
                adminAPI.getUsers(),
                adminAPI.getPayments(),
                adminAPI.getHistory(),
            ]);
            setStats(s);
            setUsers(u.users || []);
            setPayments(p.payments || []);
            setHistory(h.history || []);
        } catch (err) {
            toast.error(err.message || 'Failed to load admin data');
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && isAuthenticated && user?.email === ADMIN_EMAIL) {
            fetchAll();
        }
    }, [loading, isAuthenticated, user, fetchAll]);

    const handleDeleteUser = async (u) => {
        if (!window.confirm(`Delete user ${u.email} and all their data? This cannot be undone.`)) return;
        try {
            await adminAPI.deleteUser(u.id);
            toast.success('User deleted');
            setUsers(prev => prev.filter(x => x.id !== u.id));
            setStats(prev => prev ? { ...prev, total_users: prev.total_users - 1 } : prev);
        } catch (err) {
            toast.error(err.message || 'Delete failed');
        }
    };

    const handleCreditSave = async (userId, action, amount) => {
        try {
            const res = await adminAPI.updateCredits(userId, action, amount);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: res.new_balance } : u));
            toast.success(`Credits updated → ${res.new_balance}`);
        } catch (err) {
            toast.error(err.message || 'Update failed');
        }
    };

    const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

    const filteredUsers = users.filter(u =>
        !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const d = new Date(a.created_at) - new Date(b.created_at);
        return sortDir === 'desc' ? -d : d;
    });

    const filteredPayments = payments.filter(p =>
        !search || p.email?.toLowerCase().includes(search.toLowerCase()) || p.payment_id?.includes(search)
    );

    const filteredHistory = history.filter(h =>
        !search || h.email?.toLowerCase().includes(search.toLowerCase()) || h.title?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
    );

    const TABS = [
        { id: 'users', label: 'Users', count: users.length },
        { id: 'payments', label: 'Payments', count: payments.length },
        { id: 'history', label: 'Generations', count: history.length },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1.5px solid #e2e8f0', padding: '0 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    {/* Logo + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, background: '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Shield size={18} style={{ color: 'white' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>Admin Panel</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>makepost.pro</p>
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Refresh */}
                        <button onClick={fetchAll} disabled={fetching} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                            borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white',
                            color: '#475569', fontWeight: 600, cursor: fetching ? 'not-allowed' : 'pointer',
                            fontSize: 13, opacity: fetching ? 0.6 : 1,
                        }}>
                            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
                            Refresh
                        </button>

                        {/* Logout */}
                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                                borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff5f5',
                                color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; }}
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                    <StatCard icon={Users} label="Total Users" value={stats?.total_users} color="#6366f1" />
                    <StatCard icon={Zap} label="Total Generations" value={stats?.total_generations} color="#f59e0b" />
                    <StatCard icon={CreditCard} label="Total Payments" value={stats?.total_payments} color="#10b981" />
                    <StatCard icon={BarChart2} label="Credits Sold" value={stats?.total_credits_sold} color="#c54444" />
                </div>

                {/* Search + Tabs */}
                <div style={{
                    background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden',
                }}>
                    {/* Tab bar + Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9', gap: 16, flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: tab === t.id ? '#6366f1' : 'transparent',
                                    color: tab === t.id ? 'white' : '#64748b',
                                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    {t.label}
                                    <span style={{
                                        background: tab === t.id ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                                        color: tab === t.id ? 'white' : '#64748b',
                                        borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                                    }}>
                                        {t.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e2e8f0' }}>
                            <Search size={14} style={{ color: '#94a3b8' }} />
                            <input
                                placeholder="Search…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a', width: 180 }}
                            />
                        </div>
                    </div>

                    {/* Table content */}
                    <div style={{ overflowX: 'auto' }}>

                        {/* ── USERS TAB ── */}
                        {tab === 'users' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Email', 'Name', 'Provider', 'Credits', 'Joined', 'Actions'].map(h => (
                                            <th key={h} style={{
                                                padding: '12px 16px', textAlign: 'left', fontSize: 11,
                                                fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8,
                                                borderBottom: '1.5px solid #f1f5f9',
                                                ...(h === 'Joined' ? { cursor: 'pointer', userSelect: 'none' } : {}),
                                            }}
                                                onClick={h === 'Joined' ? () => setSortDir(d => d === 'desc' ? 'asc' : 'desc') : undefined}
                                            >
                                                {h === 'Joined' ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        Joined {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                                    </span>
                                                ) : h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
                                    ) : filteredUsers.map((u, i) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                                                {u.email}
                                                {u.email === ADMIN_EMAIL && (
                                                    <span style={{ marginLeft: 6, background: '#6366f1', color: 'white', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>ADMIN</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{u.name || '—'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                                                    background: u.provider === 'google' ? '#dbeafe' : '#f0fdf4',
                                                    color: u.provider === 'google' ? '#1d4ed8' : '#166534',
                                                }}>
                                                    {u.provider || 'email'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: 14, fontWeight: 800, color: (u.credits || 0) > 0 ? '#059669' : '#dc2626',
                                                }}>
                                                    {u.credits ?? 0}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtDate(u.created_at)}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        onClick={() => setCreditModal(u)}
                                                        title="Update credits"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                                            background: 'white', color: '#6366f1', fontWeight: 700,
                                                            fontSize: 12, cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Plus size={13} /> Credits
                                                    </button>
                                                    {u.email !== ADMIN_EMAIL && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u)}
                                                            title="Delete user"
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                width: 32, height: 32, borderRadius: 8,
                                                                border: '1.5px solid #fecaca', background: '#fff5f5',
                                                                color: '#dc2626', cursor: 'pointer',
                                                            }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* ── PAYMENTS TAB ── */}
                        {tab === 'payments' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['User', 'Product', 'Credits', 'Payment ID', 'Status', 'Date'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1.5px solid #f1f5f9' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No payments found</td></tr>
                                    ) : filteredPayments.map((p, i) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                                                {p.email || p.user_id}
                                                {p.name && <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{p.name}</span>}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                                                {p.product_id?.slice(-8)}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>+{p.credits_added}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 11, color: '#64748b', fontFamily: 'monospace', maxWidth: 160 }}>
                                                <span title={p.payment_id} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.payment_id}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                                                    background: '#dcfce7', color: '#166534',
                                                }}>
                                                    {p.status || 'succeeded'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtDate(p.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* ── HISTORY TAB ── */}
                        {tab === 'history' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['User', 'Title', 'Tone', 'Audience', 'Date'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1.5px solid #f1f5f9' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No generations found</td></tr>
                                    ) : filteredHistory.map((h, i) => (
                                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{h.email || h.user_id}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 280 }}>
                                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {h.title}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#f0f9ff', color: '#0369a1' }}>
                                                    {h.tone || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{h.audience || '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtDate(h.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Credits Modal */}
            {creditModal && (
                <CreditsModal
                    user={creditModal}
                    onClose={() => setCreditModal(null)}
                    onSave={handleCreditSave}
                />
            )}
        </div>
    );
}

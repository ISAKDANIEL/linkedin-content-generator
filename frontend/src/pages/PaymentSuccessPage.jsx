import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import Logo from '../components/ui/Logo';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | failed
    const [credits, setCredits] = useState(null);

    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status') || '';
    const paymentId = searchParams.get('payment_id') || searchParams.get('id') || '';

    useEffect(() => {
        // Give webhook a couple seconds to process, then fetch balance
        const timer = setTimeout(async () => {
            const failed =
                paymentStatus === 'failed' ||
                paymentStatus === 'cancelled' ||
                paymentStatus === 'canceled';

            if (failed) {
                setStatus('failed');
                return;
            }

            // Fetch updated credit balance
            try {
                const data = await paymentAPI.getCredits();
                setCredits(data.credits);
                setStatus('success');
            } catch {
                // If credits fetch fails, still show success (webhook will process)
                setStatus('success');
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [paymentStatus]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-white flex flex-col">
            <nav className="px-6 py-4 max-w-6xl mx-auto w-full">
                <Logo size="medium" />
            </nav>

            <div className="flex-1 flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xl p-12 max-w-md w-full text-center"
                >
                    {status === 'loading' && (
                        <>
                            <Loader2 size={56} className="animate-spin text-indigo-500 mx-auto mb-6" />
                            <h1 className="text-2xl font-bold text-slate-900 mb-3">Confirming your payment…</h1>
                            <p className="text-slate-500">Hang tight while we add your credits.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <CheckCircle size={72} className="text-green-500 mx-auto mb-6" />
                            </motion.div>
                            <h1 className="text-3xl font-black text-slate-900 mb-3">Payment successful!</h1>
                            {credits !== null ? (
                                <p className="text-slate-600 mb-2">
                                    Your credits have been added. You now have{' '}
                                    <strong className="text-indigo-600">{credits} credits</strong>.
                                </p>
                            ) : (
                                <p className="text-slate-600 mb-2">
                                    Your credits will appear in your account shortly.
                                </p>
                            )}
                            <p className="text-slate-400 text-sm mb-8">
                                {paymentId && `Payment ID: ${paymentId}`}
                            </p>
                            <button
                                onClick={() => navigate('/generate')}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-800 text-white font-bold text-base hover:bg-rose-900 transition-colors shadow-md"
                            >
                                Start Creating <ArrowRight size={18} />
                            </button>
                        </>
                    )}

                    {status === 'failed' && (
                        <>
                            <XCircle size={72} className="text-red-500 mx-auto mb-6" />
                            <h1 className="text-3xl font-black text-slate-900 mb-3">Payment failed</h1>
                            <p className="text-slate-600 mb-8">
                                Your payment was not completed. No charge was made. You can try again below.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-800 text-white font-bold text-base hover:bg-rose-900 transition-colors shadow-md"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => navigate('/generate')}
                                    className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Back to App
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

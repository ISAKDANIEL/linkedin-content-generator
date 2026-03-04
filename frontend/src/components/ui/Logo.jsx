import React from 'react';

export default function Logo({ size = 'medium', className = '' }) {
    const sizes = {
        small: { container: 'w-8 h-8', font: 'text-xs', radius: 'rounded-lg' },
        medium: { container: 'w-10 h-10', font: 'text-sm', radius: 'rounded-xl' },
        large: { container: 'w-16 h-16', font: 'text-xl', radius: 'rounded-2xl' },
        xl: { container: 'w-24 h-24', font: 'text-2xl', radius: 'rounded-3xl' }
    };

    const s = sizes[size] || sizes.medium;

    return (
        <div className={`${s.container} ${s.radius} bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 active:scale-95 ${className}`}>
            <span className={`${s.font} font-black text-white tracking-widest leading-none`}>
                LCG
            </span>
        </div>
    );
}

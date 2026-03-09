import React from 'react';

export default function Logo({ size = 'medium', className = '' }) {
    const sizes = {
        small: 'h-8',
        medium: 'h-10',
        large: 'h-16',
        xl: 'h-24'
    };

    const heightClass = sizes[size] || sizes.medium;

    return (
        <img
            src="/logo.svg"
            alt="Make Post Logo"
            className={`${heightClass} w-auto object-contain transform transition-transform hover:scale-105 active:scale-95 ${className}`}
        />
    );
}

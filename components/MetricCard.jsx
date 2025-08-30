'use client';

import { useState, useEffect } from 'react';
import { MoveUpRight, MoveDownLeft } from "lucide-react";

export default function MetricCard({ icon, title, value, subtitle, trend, isLoading, error, trendDirection }) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animate number counting up
  useEffect(() => {
    if (isLoading || error || !value) return;
    
    let start = 0;
    const end = parseInt(value) || 0;
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value, isLoading, error]);

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <div className="text-red-400 text-sm">Error</div>
        </div>
        <div className="text-red-400 text-sm">Failed to load</div>
        <div className="text-gray-500 text-xs mt-1">{subtitle}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl opacity-50">{icon}</span>
          <div className="w-12 h-4 bg-gray-700 rounded"></div>
        </div>
        <div className="w-16 h-8 bg-gray-700 rounded mb-1"></div>
        <div className="w-20 h-3 bg-gray-700 rounded"></div>
      </div>
    );
  }

  const getTrendColor = () => {
    if (trendDirection === 'up') return 'text-[#22C55E]';
    if (trendDirection === 'down') return 'text-[#EF4444]';
    return 'text-[#06B6D4]';
  };

  const TrendIcon = trendDirection === 'down' ? MoveDownLeft : MoveUpRight;

  return (
    <div 
      className="flex flex-col justify-between border rounded-xl transition-all duration-200 hover:shadow-xl cursor-pointer"
      style={{ 
        backgroundColor: '#111827', 
        borderColor: '#1F2937',
        padding: 'clamp(20px, 3vw, 32px)',
        minHeight: '160px',
        gap: 'clamp(16px, 2vw, 24px)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#06B6D4'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1F2937'}
    >
      <TrendIcon 
        className={getTrendColor()} 
        style={{ 
          width: 'clamp(16px, 2vw, 20px)', 
          height: 'clamp(16px, 2vw, 20px)'
        }} 
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-3" style={{ 
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: '700',
          letterSpacing: '-0.03em',
          lineHeight: '0.9',
          color: '#F9FAFB'
        }}>
          {displayValue.toLocaleString()}
          {trend && (
            <span style={{ 
              fontSize: 'clamp(12px, 1.2vw, 14px)',
              fontWeight: '500',
              color: '#9CA3AF',
              letterSpacing: '-0.01em'
            }}>
              {trend.value}
            </span>
          )}
        </div>
        <p style={{ 
          fontSize: 'clamp(14px, 1.1vw, 16px)',
          lineHeight: '1.4',
          letterSpacing: '-0.01em',
          color: '#9CA3AF',
          fontWeight: '400'
        }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

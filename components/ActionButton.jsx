'use client';

export default function ActionButton({ color, icon, label, onClick, disabled = false }) {
  const getColorStyles = () => {
    const baseStyles = {
      backgroundColor: '#3B82F6', // Primary Accent (electric blue)
      borderColor: '#06B6D4', // Secondary Accent (cyan/teal glow)
      color: '#F9FAFB' // Pure white text
    };

    switch (color) {
      case 'green':
        return { ...baseStyles, backgroundColor: '#22C55E' }; // Success green
      case 'blue':
        return baseStyles;
      case 'purple':
        return { ...baseStyles, backgroundColor: '#8B5CF6' }; // Custom purple
      case 'red':
        return { ...baseStyles, backgroundColor: '#EF4444' }; // Danger red
      default:
        return baseStyles;
    }
  };

  const colorStyles = getColorStyles();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 rounded-xl border transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
      `}
      style={{
        backgroundColor: colorStyles.backgroundColor,
        borderColor: colorStyles.borderColor,
        color: colorStyles.color,
        padding: 'clamp(14px, 1.8vw, 18px) clamp(20px, 2.5vw, 28px)',
        minHeight: '48px',
        fontSize: 'clamp(14px, 1.2vw, 16px)',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = color === 'green' ? '#16A34A' : 
                                         color === 'red' ? '#DC2626' :
                                         color === 'purple' ? '#7C3AED' : '#2563EB';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.backgroundColor = colorStyles.backgroundColor;
        }
      }}
    >
      <span style={{ fontSize: 'clamp(16px, 1.5vw, 20px)' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

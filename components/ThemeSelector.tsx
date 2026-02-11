import React from 'react';

export type Theme = 'space' | 'snow' | 'fire' | 'wind';

interface ThemeSelectorProps {
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const themes: { id: Theme; icon: string; label: string; color: string }[] = [
    { id: 'space', icon: '🌌', label: 'Space', color: 'from-indigo-500 to-purple-500' },
    { id: 'snow', icon: '❄️', label: 'Snow', color: 'from-cyan-400 to-blue-400' },
    { id: 'fire', icon: '🔥', label: 'Fire', color: 'from-orange-500 to-red-600' },
    { id: 'wind', icon: '💨', label: 'Wind', color: 'from-teal-400 to-emerald-400' }
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
    return (
        <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            {themes.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
            ${currentTheme === theme.id
                            ? `bg-gradient-to-br ${theme.color} text-white shadow-lg scale-110`
                            : 'text-white/60 hover:text-white hover:bg-white/10'}
          `}
                    title={theme.label}
                >
                    {theme.icon}
                </button>
            ))}
        </div>
    );
};

export default ThemeSelector;

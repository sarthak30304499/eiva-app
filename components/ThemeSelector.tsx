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
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/5"
                title="Change Theme"
            >
                <span className="text-xs filter grayscale hover:grayscale-0 transition-all">
                    {themes.find(t => t.id === currentTheme)?.icon}
                </span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-10 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col space-y-2 animate-fade-in origin-top-right min-w-[120px]">
                        <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                            Select Theme
                        </div>
                        {themes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    onThemeChange(theme.id);
                                    setIsOpen(false);
                                }}
                                className={`
                                flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-all w-full text-left
                                ${currentTheme === theme.id
                                        ? `bg-gradient-to-r ${theme.color} text-white shadow-lg`
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
                            `}
                            >
                                <span className="text-lg">{theme.icon}</span>
                                <span className="font-medium text-xs">{theme.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ThemeSelector;

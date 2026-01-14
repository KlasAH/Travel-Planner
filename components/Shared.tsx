import React, { useEffect, useState, useRef, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings, Map, Calendar as CalendarIcon, Plane, Car, Hotel, Activity, Home, Sun, Moon, Plus, Check, Trash2, Clock, DollarSign, MapPin, ChevronDown, X, ChevronLeft, Monitor, CalendarDays } from 'lucide-react';
import DatePicker from 'react-datepicker';

// --- UI Primitives ---

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost', size?: 'sm' | 'md' | 'lg' | 'xl' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    // Updated 3D styles - More "Juicy"
    const baseStyles = "relative inline-flex items-center justify-center rounded-[1.2rem] font-black uppercase tracking-wider transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.96] active:translate-y-[4px] border-b-[6px] active:border-b-0 active:mt-[6px] overflow-hidden group";
    
    const variants = {
      primary: "bg-[#0ea5e9] border-[#0369a1] text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] hover:brightness-110",
      secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700",
      danger: "bg-[#ef4444] border-[#991b1b] text-white shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:brightness-110",
      ghost: "bg-transparent text-slate-500 dark:text-slate-400 border-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800 !border-b-0 !translate-y-0 !mt-0 active:scale-95"
    };
    
    const sizeStyles = {
      sm: "px-4 py-2 text-xs",
      md: "px-6 py-3 text-sm",
      lg: "px-8 py-4 text-base",
      xl: "px-10 py-5 text-lg w-full"
    };

    return (
      <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizeStyles[size]} ${className || ''}`} {...props}>
         {/* Top shine */}
         <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
         <span className="relative z-10 flex items-center justify-center gap-2">{props.children}</span>
      </button>
    );
  }
);
Button.displayName = "Button";

export const NavButton = ({ icon: Icon, onClick, label, color }: { icon: any, onClick: () => void, label: string, color: string }) => {
  // Simplified for cleaner look
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95 bg-white dark:bg-slate-800 shadow-md border-b-[4px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 active:border-b-0 active:translate-y-1`}
      title={label}
    >
      <Icon className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
};

export const Fab = ({ onClick, icon: Icon, label }: { onClick: () => void, icon: any, label?: string }) => (
  <button
    onClick={onClick}
    className="fixed bottom-8 right-6 z-40 flex items-center gap-3 px-5 h-16 bg-brand-500 text-white rounded-[1.5rem] shadow-[0_15px_30px_rgba(14,165,233,0.4)] border-b-[6px] border-brand-700 active:border-b-0 active:translate-y-[6px] transition-all hover:brightness-110"
  >
    <Icon className="w-8 h-8" strokeWidth={3} />
    {label && <span className="font-black text-lg uppercase tracking-wide">{label}</span>}
  </button>
);

// --- 3D Icon Block Wrapper ---
const ThreeDIcon = ({ icon: Icon, color, onClick }: { icon: any, color: string, onClick?: () => void }) => {
  const colors: Record<string, string> = {
    blue: "from-cyan-400 to-blue-500 shadow-blue-500/50 border-blue-600",
    purple: "from-violet-400 to-purple-500 shadow-purple-500/50 border-purple-600",
    orange: "from-amber-400 to-orange-500 shadow-orange-500/50 border-orange-600",
    green: "from-emerald-400 to-green-500 shadow-green-500/50 border-green-600",
    red: "from-rose-400 to-red-500 shadow-red-500/50 border-red-600",
    slate: "from-slate-400 to-slate-500 shadow-slate-500/50 border-slate-600",
    pink: "from-pink-400 to-pink-500 shadow-pink-500/50 border-pink-600",
    yellow: "from-yellow-400 to-yellow-500 shadow-yellow-500/50 border-yellow-600",
  };
  
  const selectedColor = colors[color] || colors.blue;

  return (
    <div 
      onClick={onClick}
      className={`w-[4.5rem] h-[4.5rem] shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br ${selectedColor} border-b-[6px] text-white cursor-pointer transition-transform active:scale-95 active:border-b-2 active:translate-y-[4px] relative z-10`}
    >
      <Icon className="w-8 h-8 drop-shadow-md" strokeWidth={3} />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-white/20 pointer-events-none" />
    </div>
  );
};

// --- 3D Input ---
export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string, icon?: any, iconColor?: string, multiline?: boolean, onIconClick?: () => void }>(
  ({ className, label, icon: Icon, iconColor = 'blue', multiline, onIconClick, ...props }, ref) => {
    
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => inputRef.current as any);
    
    const handleIconClick = () => {
      if (onIconClick) {
        onIconClick();
      } else {
        inputRef.current?.focus();
      }
    };

    return (
      <div className="w-full">
        {label && <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest pl-2">{label}</label>}
        
        <div className="flex items-center gap-3">
           {Icon && (
             <ThreeDIcon icon={Icon} color={iconColor} onClick={handleIconClick} />
           )}
           
           <div className="flex-1 relative">
             <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-[3px] border-slate-300 dark:border-slate-700 shadow-inner pointer-events-none" />
             {multiline ? (
                <textarea
                   ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                   className={`relative z-10 w-full bg-transparent text-slate-800 dark:text-slate-100 text-lg font-bold placeholder-slate-400 px-5 py-4 outline-none resize-none h-[4.5rem] pt-5 leading-tight ${className}`}
                   {...props as React.TextareaHTMLAttributes<HTMLTextAreaElement>}
                />
             ) : (
                <input
                   ref={inputRef as React.RefObject<HTMLInputElement>}
                   className={`relative z-10 w-full bg-transparent text-slate-800 dark:text-slate-100 text-xl font-bold placeholder-slate-400 px-5 outline-none h-[4.5rem] ${className}`}
                   {...props as React.InputHTMLAttributes<HTMLInputElement>}
                />
             )}
           </div>
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";

// --- Improved Digital Clock Time Picker ---

interface TimeInputProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  label?: string;
  icon?: any;
  iconColor?: string;
  className?: string;
}

export const TimeInput: React.FC<TimeInputProps> = ({ 
  value, onChange, label, icon: Icon = Clock, iconColor = 'purple', className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'HOUR' | 'MINUTE'>('HOUR');
  
  // Parse current value
  const [selectedHour, selectedMinute] = (value || '09:00').split(':');

  const handleHourSelect = (h: string) => {
    onChange(`${h}:${selectedMinute}`);
    setView('MINUTE'); // Auto advance to minute
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${selectedHour}:${m}`);
    setIsOpen(false);
    setView('HOUR'); // Reset for next time
  };

  return (
    <div className="w-full">
        {label && <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest pl-2">{label}</label>}
        
        <div className="flex items-center gap-3">
           <ThreeDIcon icon={Icon} color={iconColor} onClick={() => setIsOpen(true)} />
           
           <div onClick={() => setIsOpen(true)} className="flex-1 relative cursor-pointer group">
             <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-[3px] border-slate-300 dark:border-slate-700 shadow-inner pointer-events-none group-hover:border-brand-300 transition-colors" />
             <div className={`relative z-10 w-full bg-transparent text-slate-800 dark:text-slate-100 text-xl font-bold px-5 h-[4.5rem] flex items-center ${className || ''}`}>
                {value || '--:--'}
             </div>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <ChevronDown className="w-6 h-6" strokeWidth={3} />
            </div>
           </div>
        </div>

        {/* Picker Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
            <div 
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-0 shadow-2xl border-[6px] border-slate-200 dark:border-slate-700 transform transition-all overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
               {/* Digital Clock Header */}
               <div className="bg-slate-100 dark:bg-slate-800 p-8 flex flex-col items-center justify-center border-b-2 border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {view === 'HOUR' ? 'Set Hour' : 'Set Minute'}
                  </div>
                  <div className="flex items-center gap-1">
                     <button 
                       onClick={() => setView('HOUR')} 
                       className={`text-6xl font-black tracking-tight rounded-xl px-2 py-1 transition-all ${
                         view === 'HOUR' 
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                       }`}
                     >
                       {selectedHour}
                     </button>
                     <span className="text-6xl font-black text-slate-300 dark:text-slate-600 pb-2">:</span>
                     <button 
                       onClick={() => setView('MINUTE')} 
                       className={`text-6xl font-black tracking-tight rounded-xl px-2 py-1 transition-all ${
                         view === 'MINUTE' 
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                       }`}
                     >
                       {selectedMinute}
                     </button>
                  </div>
               </div>

               {/* Grid Selection Body */}
               <div className="p-6 bg-white dark:bg-slate-900">
                  {view === 'HOUR' && (
                    <div className="grid grid-cols-6 gap-2 animate-in slide-in-from-right-4 duration-200">
                        {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => (
                             <button
                                key={h}
                                onClick={() => handleHourSelect(h)}
                                className={`h-10 w-full rounded-lg font-bold text-sm transition-all ${
                                    h === selectedHour 
                                    ? 'bg-brand-500 text-white shadow-md' 
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                             >
                                {h}
                             </button>
                        ))}
                    </div>
                  )}

                  {view === 'MINUTE' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-4 gap-3">
                            {/* Main 5-min intervals */}
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => handleMinuteSelect(m)}
                                    className={`h-12 rounded-xl font-bold text-lg transition-all ${
                                        m === selectedMinute 
                                        ? 'bg-brand-500 text-white shadow-md' 
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setView('HOUR')} className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center justify-center">
                             <ChevronLeft className="w-4 h-4 mr-1" /> Back to Hours
                        </button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
    </div>
  );
};

// --- Custom 3D DatePicker (using react-datepicker) ---

interface DateInputProps {
    value: string;
    onChange: (date: string) => void;
    label?: string;
    icon?: any;
    iconColor?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ 
    value, onChange, label, icon: Icon = CalendarIcon, iconColor = 'blue', placeholder = "Select date", className 
}) => {
    
    // Convert YYYY-MM-DD string to Date object
    // Append T12:00:00 to prevent timezone issues shifting the day
    const dateValue = value ? new Date(value + 'T12:00:00') : null;

    const handleDateChange = (date: Date | null) => {
        if (!date) {
            onChange('');
            return;
        }
        // Format back to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
    };

    // Custom Input component for react-datepicker to match our 3D design
    const CustomInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
        <div className="flex-1 relative cursor-pointer group" onClick={onClick}>
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-[3px] border-slate-300 dark:border-slate-700 shadow-inner pointer-events-none group-hover:border-brand-300 transition-colors" />
            <input
                ref={ref}
                readOnly
                placeholder={placeholder}
                value={value}
                className={`relative z-10 w-full bg-transparent text-slate-800 dark:text-slate-100 text-xl font-bold placeholder-slate-400 px-5 outline-none h-[4.5rem] cursor-pointer ${className || ''}`}
            />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <ChevronDown className="w-6 h-6" strokeWidth={3} />
            </div>
        </div>
    ));
    CustomInput.displayName = "CustomDateInput";

    return (
        <div className="w-full">
            {label && <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest pl-2">{label}</label>}
            <div className="flex items-center gap-3">
                 <ThreeDIcon icon={Icon} color={iconColor} />
                 <div className="flex-1">
                    <DatePicker
                        selected={dateValue}
                        onChange={handleDateChange}
                        customInput={<CustomInput />}
                        dateFormat="MMM d, yyyy"
                        wrapperClassName="w-full"
                        popperClassName="z-[2000]"
                        portalId="root"
                        enableTabLoop={false}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                    />
                 </div>
            </div>
        </div>
    );
};

// --- 3D Select Component ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: any;
  iconColor?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, icon: Icon, iconColor = 'blue', options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest pl-2">{label}</label>}
        <div className="flex items-center gap-3">
          {Icon && <ThreeDIcon icon={Icon} color={iconColor} />}
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-[3px] border-slate-300 dark:border-slate-700 shadow-inner pointer-events-none" />
            <select
              ref={ref}
              className={`relative z-10 w-full bg-transparent text-slate-800 dark:text-slate-100 text-xl font-bold px-5 h-[4.5rem] outline-none appearance-none cursor-pointer ${className}`}
              {...props}
            >
              <option value="" disabled>Select...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <ChevronDown className="w-6 h-6" strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

// --- Chip/Tag Selector ---
interface ChipGroupProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const ChipGroup = ({ label, options, selected, onChange }: ChipGroupProps) => {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="w-full">
       {label && <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-widest pl-2">{label}</label>}
       <div className="flex flex-wrap gap-3">
         {options.map(opt => {
           const isSelected = selected.includes(opt);
           return (
             <button
               key={opt}
               type="button"
               onClick={() => toggle(opt)}
               className={`px-5 py-3 rounded-xl font-bold text-sm transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${
                 isSelected 
                  ? 'bg-brand-500 border-brand-700 text-white shadow-brand-500/30 shadow-lg translate-y-[-2px]' 
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
               }`}
             >
               {opt}
             </button>
           );
         })}
       </div>
    </div>
  );
};

export const Card: React.FC<{ children?: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <div onClick={onClick} className={`relative bg-white dark:bg-slate-800 rounded-[2rem] border-[3px] border-slate-300 dark:border-slate-600 border-b-[6px] shadow-lg overflow-hidden ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-brand-400 dark:hover:border-brand-600 transition-all duration-300 active:border-b-[3px] active:translate-y-1' : ''} ${className || ''}`}>
    {children}
  </div>
);

// --- Icons Helper ---
export const CategoryIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case 'flight': return <Plane className={className} />;
    case 'car': return <Car className={className} />;
    case 'stay': return <Hotel className={className} />;
    case 'activity': return <Activity className={className} />;
    default: return <Map className={className} />;
  }
};

// --- Layout ---

export type ThemeMode = 'light' | 'dark' | 'system' | 'seasonal';

interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme_preference') as ThemeMode) || 'system';
    }
    return 'system';
  });

  // Apply Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    let isDark = false;

    if (themeMode === 'dark') {
      isDark = true;
    } else if (themeMode === 'light') {
      isDark = false;
    } else if (themeMode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else if (themeMode === 'seasonal') {
      // Calendar Based Logic (Swedish/European Seasons)
      // Winter (Dec, Jan, Feb) -> Dark
      // Spring (Mar, Apr, May) -> Light
      // Summer (Jun, Jul, Aug) -> Light
      // Autumn (Sep, Oct, Nov) -> Dark
      const month = new Date().getMonth(); // 0-11
      const winterMonths = [11, 0, 1]; // Dec, Jan, Feb
      const autumnMonths = [8, 9, 10]; // Sep, Oct, Nov
      
      // We set Dark for Winter and Autumn evenings (Generalizing 'Cozy' as Dark for now)
      // Or strictly Winter = Dark. Let's do Winter + Autumn = Dark for cozy vibes.
      isDark = [...winterMonths, ...autumnMonths].includes(month);
    }

    if (isDark) {
      root.classList.add('dark');
      // Store 'theme' key for legacy/simple checks if needed, but 'theme_preference' is source of truth
      localStorage.setItem('theme', 'dark'); 
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Save preference
    localStorage.setItem('theme_preference', themeMode);

    // Listen for system changes if in system mode
    if (themeMode === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
             if (e.matches) root.classList.add('dark');
             else root.classList.remove('dark');
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  // Cycle Theme: Light -> Dark -> System -> Seasonal
  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system', 'seasonal'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
  };

  const getThemeIcon = () => {
    switch(themeMode) {
      case 'light': return Sun;
      case 'dark': return Moon;
      case 'system': return Monitor;
      case 'seasonal': return CalendarDays;
      default: return Sun;
    }
  };

  const getThemeLabel = () => {
     switch(themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'Auto';
      case 'seasonal': return 'Season';
      default: return 'Theme';
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 transition-colors duration-300 pb-10 font-sans">
      {/* Sticky Top Nav */}
      <header className="sticky top-4 z-50 mx-auto w-[96%] max-w-6xl">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border-[3px] border-slate-300 dark:border-slate-800 shadow-xl p-3 pl-6 pr-3 flex items-center justify-between">
          
          {/* Title on Left */}
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl shadow-lg flex items-center justify-center text-white border-b-[4px] border-brand-800 transform -rotate-2">
               <Map className="w-7 h-7 drop-shadow-md" strokeWidth={3} />
             </div>
             <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
               {title || 'Wanderlust'}
             </h1>
          </div>

          {/* Navigation Dock */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <NavButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" color="rose" />
            )}
            <NavButton icon={Home} onClick={() => navigate('/')} label="Home" color="cyan" />
            <NavButton icon={getThemeIcon()} onClick={cycleTheme} label={getThemeLabel()} color="amber" />
            <NavButton icon={Settings} onClick={() => navigate('/settings')} label="Settings" color="slate" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-2">
        {children}
      </main>
    </div>
  );
};
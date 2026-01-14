import React, { useState, useEffect } from 'react';
import { Layout, Button, Card, Input, ThemeMode } from '../components/Shared';
import { db } from '../db';
import { Download, Upload, Trash2, CheckCircle, AlertCircle, ShieldAlert, KeyRound, AlertTriangle, Sun, Moon, Monitor, CalendarDays } from 'lucide-react';
import { BackupData } from '../types';

export const SettingsPage = () => {
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Theme State (synced with localStorage)
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');

  useEffect(() => {
      const saved = localStorage.getItem('theme_preference') as ThemeMode;
      if (saved) setCurrentTheme(saved);
  }, []);

  const changeTheme = (mode: ThemeMode) => {
      setCurrentTheme(mode);
      localStorage.setItem('theme_preference', mode);
      // Trigger a storage event or force update if needed, but the Layout component listens to the same key on mount/update logic.
      // Since Layout wraps this page, we need to manually trigger the update or reload.
      // Easiest way in this architecture without a global Context is to reload or rely on Layout's cycle.
      // However, Layout listens to local state. We need to dispatch a custom event or simply reload to apply cleanly if context isn't available.
      // Optimization: Layout effect depends on state. We can force a re-render of Layout if we lifted state, 
      // but simpler here: The Header button works because it sets State. 
      // We will reload window for settings change to take global effect immediately if we are not using React Context.
      // Actually, let's just update the localStorage and dispatch a storage event, though React state won't catch it across components easily without Context.
      // A simple window.location.reload() is a crude but effective way to ensure the whole app syncs.
      // BETTER: Dispatch a custom event that Layout listens to? 
      // Current implementation in Shared.tsx Layout reads localstorage on Mount. 
      // Let's just reload for now to be safe, or accept that the user might need to navigate to see change.
      // ACTUALLY: Let's assume the user accepts a quick flash.
      window.location.reload(); 
  };
  
  // Wizard State
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [password, setPassword] = useState('');
  const [wizardError, setWizardError] = useState('');

  const handleExport = async () => {
    try {
      const trips = await db.trips.toArray();
      const items = await db.items.toArray();
      const backup: BackupData = {
        trips,
        items,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wanderlust-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data.' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup: BackupData = JSON.parse(text);

        if (!Array.isArray(backup.trips) || !Array.isArray(backup.items)) {
          throw new Error("Invalid file format");
        }

        await (db as any).transaction('rw', db.trips, db.items, async () => {
          await db.trips.clear();
          await db.items.clear();
          await db.trips.bulkAdd(backup.trips);
          await db.items.bulkAdd(backup.items);
        });

        setMessage({ type: 'success', text: 'Data imported successfully. Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to import data. Invalid format.' });
      }
    };
    reader.readAsText(file);
  };

  const startClearProcess = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setPassword('');
    setWizardError('');
  };

  const closeWizard = () => {
    setWizardOpen(false);
  };

  const handleWizardNext = () => {
    setWizardStep(prev => prev + 1);
  };

  const handleFinalClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      try {
        await db.trips.clear();
        await db.items.clear();
        setMessage({ type: 'success', text: 'System reset complete. All data cleared.' });
        closeWizard();
      } catch (e) {
        setMessage({ type: 'error', text: 'Database error.' });
      }
    } else {
      setWizardError('Incorrect Password. Access Denied.');
    }
  };

  return (
    <Layout title="Settings">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border-2 shadow-sm animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        {/* Theme Section */}
        <section>
            <h2 className="text-xl font-black mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                <Sun className="w-6 h-6 text-amber-500" />
                Appearance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { mode: 'light', label: 'Light', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-100' },
                    { mode: 'dark', label: 'Dark', icon: Moon, color: 'text-purple-500', bg: 'bg-purple-100' },
                    { mode: 'system', label: 'Auto', icon: Monitor, color: 'text-slate-500', bg: 'bg-slate-200' },
                    { mode: 'seasonal', label: 'Calendar', icon: CalendarDays, color: 'text-green-600', bg: 'bg-green-100' },
                ].map((t) => (
                    <button
                        key={t.mode}
                        onClick={() => changeTheme(t.mode as ThemeMode)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-[3px] transition-all duration-200 ${
                            currentTheme === t.mode 
                            ? 'border-brand-500 bg-white dark:bg-slate-800 shadow-xl scale-105' 
                            : 'border-transparent bg-white dark:bg-slate-800 shadow-sm hover:scale-105 opacity-70 hover:opacity-100'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${t.bg} dark:bg-opacity-20`}>
                            <t.icon className={`w-6 h-6 ${t.color}`} strokeWidth={3} />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">{t.label}</span>
                    </button>
                ))}
            </div>
            {currentTheme === 'seasonal' && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
                    <CalendarDays className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">Calendar Mode Active</p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                            Theme changes automatically based on the season (Winter/Autumn = Dark, Spring/Summer = Light).
                        </p>
                    </div>
                </div>
            )}
        </section>

        {/* Export / Import Section */}
        <section className="pt-8 border-t-2 border-slate-200 dark:border-slate-800">
           <h2 className="text-xl font-black mb-4 text-slate-800 dark:text-white flex items-center gap-2">
             <Download className="w-6 h-6 text-brand-500" /> 
             Data Sync
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card onClick={handleExport} className="p-6 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800/80">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Download className="w-8 h-8" strokeWidth={3} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Export Backup</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Save your trips to a .json file</p>
                </div>
             </Card>

             <Card className="p-6 flex flex-col items-center justify-center gap-4 group relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8" strokeWidth={3} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Import Backup</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Restore from a .json file</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
             </Card>
           </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 border-t-2 border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-black mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" /> 
            Danger Zone
          </h2>
          <Card className="p-8 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Factory Reset</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium max-w-md">
                  Permanently delete all trips, items, and local settings. This action cannot be undone.
                </p>
              </div>
              <Button variant="danger" onClick={startClearProcess} className="w-full md:w-auto shrink-0">
                <Trash2 className="w-5 h-5 mr-2" />
                Clear Database
              </Button>
            </div>
          </Card>
        </section>

        <div className="text-center text-xs font-bold text-slate-400 dark:text-slate-600 mt-12 uppercase tracking-widest">
          Wanderlust AI Planner v1.3
        </div>
      </div>

      {/* Security Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border-[6px] border-red-500 dark:border-red-800 relative overflow-hidden">
            
            {/* Warning Tape Effect */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

            <div className="mb-8 text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-200 dark:border-red-800">
                 {wizardStep < 4 ? <AlertTriangle className="w-10 h-10" /> : <KeyRound className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {wizardStep < 4 ? `Security Check ${wizardStep}/3` : 'Final Authorization'}
              </h3>
            </div>

            <div className="min-h-[100px] flex items-center justify-center text-center mb-8">
              {wizardStep === 1 && (
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Are you sure you want to delete <span className="text-red-600 underline decoration-4 decoration-red-200">everything</span>?
                </p>
              )}
              {wizardStep === 2 && (
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  This action is <span className="text-red-600 uppercase">irreversible</span>. All your planned trips will be lost forever.
                </p>
              )}
              {wizardStep === 3 && (
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Are you absolutely certain you want to proceed with a factory reset?
                </p>
              )}
              {wizardStep === 4 && (
                <div className="w-full">
                  <p className="text-base font-bold text-slate-600 dark:text-slate-400 mb-4">
                    Enter Administrator Password to confirm deletion:
                  </p>
                  <form onSubmit={handleFinalClear}>
                    <Input 
                      type="password" 
                      placeholder="••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="text-center text-2xl tracking-widest font-black"
                      autoFocus
                    />
                    {wizardError && <p className="text-red-500 font-bold mt-2 text-sm animate-pulse">{wizardError}</p>}
                  </form>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="secondary" onClick={closeWizard}>
                Cancel
              </Button>
              {wizardStep < 4 ? (
                <Button variant="danger" onClick={handleWizardNext}>
                  Yes, Continue
                </Button>
              ) : (
                <Button variant="danger" onClick={handleFinalClear}>
                  ERASE DATA
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
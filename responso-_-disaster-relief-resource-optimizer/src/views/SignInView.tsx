import React, { useState } from 'react';
import { UserAccount } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import * as api from '../services/api';
import { DoodleLogo, DoodleCheck } from '../components/DoodleIcons';
import { Eye, EyeOff, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

interface SignInViewProps {
  onSignIn: (user: UserAccount) => void;
  sessionExpired?: boolean;
}

export const SignInView: React.FC<SignInViewProps> = ({ onSignIn, sessionExpired = false }) => {
  const [email, setEmail] = useState('tariq.mansoor@responso.pk');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Operational email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required for secure relief operations dispatch.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await api.loginUser(cleanEmail, password);
      onSignIn(user);
    } catch (err: any) {
      if (err.status === 401) {
        setError('Invalid operational email or password. Please verify your credentials or select a demo role.');
      } else if (err.status === 403) {
        setError('User account is deactivated or inactive. Please contact the System Administrator.');
      } else if (
        !err.status ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network')
      ) {
        setError('ReliefRoute API backend is unreachable. Please ensure the backend server is running on port 8000.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials and server status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (user: UserAccount) => {
    setEmail(user.email);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen doodle-paper flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-xl bg-white doodle-card-sm mb-3">
            <DoodleLogo className="w-12 h-12" />
          </div>
          <h1 className="font-doodle text-3xl font-bold tracking-tight text-stone-900">
            RESPONSO
          </h1>
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-widest mt-0.5">
            Disaster Relief Resource Optimizer
          </p>
          <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
            Emergency matching platform for flood relief distribution, inventory management, and route optimization.
          </p>
        </div>

        {/* Sign In Card */}
        <div className="doodle-card p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-stone-800 mb-4">
            <span className="font-doodle text-lg font-bold text-stone-900">Operator Sign In</span>
            <span className="text-[11px] font-mono-nums bg-amber-100 border border-stone-800 px-2 py-0.5 rounded text-amber-900 font-semibold">
              SECURE ACCESS
            </span>
          </div>

          {sessionExpired && !error && (
            <div className="mb-4 p-2.5 bg-amber-50 border-2 border-amber-600 rounded-md flex items-start gap-2 text-xs text-amber-900">
              <Clock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>Your operations session has expired. Please authenticate with your credentials to resume.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border-2 border-red-700 rounded-md flex items-start gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signin-email" className="block text-xs font-bold text-stone-800 mb-1">
                Official Email Address <span className="text-red-600">*</span>
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@responso.pk"
                className="w-full px-3 py-2 text-xs border-2 border-stone-800 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label htmlFor="signin-password" className="block text-xs font-bold text-stone-800 mb-1">
                Security Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pr-10 text-xs border-2 border-stone-800 rounded bg-[#FAF7F2] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-stone-900 text-white font-bold text-xs doodle-button flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
            >
              {isSubmitting ? (
                <span>Authenticating with ReliefRoute Backend...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Authenticate & Enter Operations Console</span>
                </>
              )}
            </button>
          </form>

          {/* Role Presets / Demo Credentials Switcher */}
          <div className="mt-6 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-doodle text-xs font-bold text-stone-700">Quick Demo Role Credentials:</span>
              <span className="text-[10px] text-stone-500 font-mono-nums">Password: Password123!</span>
            </div>

            <div className="space-y-1.5">
              {INITIAL_USERS.map(user => {
                const isSelected = user.email.toLowerCase() === email.toLowerCase();
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(user)}
                    className={`w-full p-2 text-left text-xs rounded border transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50 border-stone-900 text-stone-900 font-semibold'
                        : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-800 leading-snug">{user.name}</div>
                      <div className="text-[10px] text-stone-500">{user.roleTitle} ({user.email})</div>
                    </div>
                    {isSelected && <DoodleCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-stone-500 mt-4">
          RESPONSO Humanitarian Logistics Engine · Build Revision 2026.10
        </p>
      </div>
    </div>
  );
};

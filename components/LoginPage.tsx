
import React, { useState } from 'react';
import { signUpWithEmail, loginWithEmail, loginWithGoogle } from '../services/storageService';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGuestLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    console.log("LoginPage: handleSubmit called", { email, isSignUp });
    setLoading(true);
    setError(null);

    // Timeout safety - Force stop loading after 15 seconds if nothing happens
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Request timed out. Please check your internet connection or try again.");
        console.error("LoginPage: Login timed out after 15s");
      }
    }, 15000);

    try {
      if (isSignUp) {
        console.log("LoginPage: Attempting sign up with", email);
        await signUpWithEmail(email, password);
        console.log("LoginPage: Sign up successful for", email);
        // Optionally, you might want to automatically log in or prompt for email verification here
        // For now, we'll assume successful signup means the user is ready to log in.
        // If Supabase auto-logs in, onLogin() would be called. If not, user needs to log in.
        // For this example, let's assume a successful signup means they are now logged in.
        // If not, you might want to set isSignUp to false and let them log in.
        // For now, we'll just call onLogin if signup is successful.
        // A more robust solution might involve checking the session after signup.
        // For now, let's just switch to login mode after signup for clarity.
        setIsSignUp(false); // After successful signup, switch to login view
        setError("Sign up successful! Please log in with your new credentials.");
      } else {
        console.log("LoginPage: Attempting login with", email);
        await loginWithEmail(email, password);
        console.log("LoginPage: Login successful for", email);

        // Explicitly trigger navigation on success
        console.log("LoginPage: Auth successful, triggering navigation.");
        onLogin();
      }
    } catch (err: any) {
      console.error("LoginPage: Auth error full object:", err);
      let errorMessage = "Authentication failed. Please try again.";

      if (err.message) {
        errorMessage = err.message;
        if (err.message.includes("fetch")) errorMessage = "Network error. Please check your connection.";
        if (err.message.includes("Invalid login credentials")) errorMessage = "Invalid email or password.";
      } else if (err.error_description) {
        errorMessage = err.error_description;
      }

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      console.log("LoginPage: Auth process finished.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      // Redirect happens automatically via Supabase, but if not:
      onLogin();
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Google Login failed. This usually happens if the redirect URL is not whitelisted or third-party cookies are blocked.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      <div className="hidden lg:flex flex-1 bg-genz-gradient flex-col items-center justify-center text-white p-12">
        <h1 className="text-8xl font-black italic tracking-tighter mb-4 floating">EIVA</h1>
        <p className="text-2xl font-bold opacity-90">Ask. Learn. Grow with AI.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white italic lg:hidden">EIVA</h2>
            <p className="mt-2 text-xl font-bold text-gray-500">{isSignUp ? 'Join the community' : 'Welcome back'}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-xs font-bold animate-slide-up whitespace-pre-line">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none shadow-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none shadow-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || googleLoading}
            />
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 bg-[#6C63FF] text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
            </button>
          </form>

          {onGuestLogin && (
            <button
              onClick={onGuestLogin}
              className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all text-sm"
            >
              Skip Login & Continue as Guest 🚀
            </button>
          )}

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center space-x-3 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 shadow-sm"
          >
            {googleLoading ? (
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            )}
            <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <p className="text-center text-sm font-bold text-gray-400">
            {isSignUp ? 'Already have an account?' : 'Need an account?'}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-[#6C63FF] hover:underline"
              disabled={loading || googleLoading}
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

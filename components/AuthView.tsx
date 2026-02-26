
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import { LogIn, UserPlus, Mail, Lock, Chrome, ArrowLeft, KeyRound } from 'lucide-react';

const AuthView: React.FC = () => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (view === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (view === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            {view === 'forgot' ? <KeyRound size={32} /> : <LogIn size={32} />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {view === 'login' && 'Welcome Back'}
            {view === 'signup' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-gray-500 mt-2">
            {view === 'login' && 'Enter your credentials to access the chat'}
            {view === 'signup' && 'Join our community today'}
            {view === 'forgot' && 'Enter your email to receive a reset link'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {view !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {view === 'login' && (
                  <button 
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}
          {success && <p className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-100">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              view === 'login' ? <LogIn size={18} /> : (view === 'signup' ? <UserPlus size={18} /> : <Mail size={18} />)
            )}
            {view === 'login' && 'Sign In'}
            {view === 'signup' && 'Sign Up'}
            {view === 'forgot' && 'Send Reset Link'}
          </button>
        </form>

        {view !== 'forgot' && (
          <>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-gray-400 text-sm">OR</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full mt-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Chrome size={18} />
              Continue with Google
            </button>
          </>
        )}

        {view === 'forgot' ? (
          <button
            onClick={() => { setView('login'); setError(''); setSuccess(''); }}
            className="mt-6 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>
        ) : (
          <p className="mt-8 text-center text-gray-600">
            {view === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
              className="text-blue-600 font-semibold hover:underline"
            >
              {view === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthView;

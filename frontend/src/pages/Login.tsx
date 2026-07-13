import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import bgImage from '../assets/login_bg.png'; // 1. Import your construction yard image here

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.user, res.access, res.refresh);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 2. Updated container with full-screen background styling and dark overlay tint
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${bgImage})` }}
    >
      {/* 3. Updated card with transparent backdrop-blur (glassmorphism) for text readability */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-8 z-10">
        {/* 4. Changed heading and subtext to white for contrast */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Equipment Rental ERP
        </h2>
        <p className="text-sm text-gray-200 text-center mb-6">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/20 backdrop-blur border border-red-500/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {/* 5. Changed text labels to light gray */}
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-300 mt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Register as Operator</a>
        </p>
      </div>
    </div>
  );
}

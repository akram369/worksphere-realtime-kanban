import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Briefcase, Eye, EyeOff, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export function LoginPage() {
  const { login, addToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('rahul@abctech.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Invalid email or password', 'conflict');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail) => {
    setEmail(quickEmail);
    setPassword('Password123!');
    setIsLoading(true);
    try {
      await login(quickEmail, 'Password123!');
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Login failed', 'conflict');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-box">
        {/* Brand Logo & Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <div className="brand-icon-box" style={{ width: '42px', height: '42px' }}>
            <Briefcase size={22} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            Sign in to WorkSphere
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Enterprise Collaborative Task Board
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Corporate Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="name@abctech.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px', paddingRight: '34px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <a href="#" onClick={(e) => { e.preventDefault(); addToast('Reset password link sent to your email', 'info'); }} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', marginTop: '4px' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In to Workspace'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Demo Fast Login Buttons for Evaluation */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
            Fast Demo Login (Click to Sign In)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%' }}
              onClick={() => handleQuickLogin('rahul@abctech.com')}
            >
              <span>Rahul Sharma (Org Admin)</span>
              <span className="badge badge-amber">ORG_ADMIN</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%' }}
              onClick={() => handleQuickLogin('priya@abctech.com')}
            >
              <span>Priya Patel (Hyderabad Admin)</span>
              <span className="badge badge-blue">TENANT_ADMIN</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%' }}
              onClick={() => handleQuickLogin('arjun@abctech.com')}
            >
              <span>Arjun Verma (Member)</span>
              <span className="badge badge-green">MEMBER</span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

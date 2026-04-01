import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, ArrowRight, Building2, Globe } from 'lucide-react';

const RegisterPage = () => {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    company_name: '',
    default_currency: 'USD',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    // Fetch Country/Currency map
    fetch('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => res.json())
      .then(data => {
         const clist = data.map(d => {
            const keys = d.currencies ? Object.keys(d.currencies) : [];
            const curr = keys.length > 0 ? keys[0] : 'USD';
            return { name: d.name.common, currency: curr };
         }).sort((a,b) => a.name.localeCompare(b.name));
         setCountries(clist);
      }).catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signup(form);
    if (result.success) navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 mb-4 glow">
            <Building2 className="w-7 h-7 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-1">Get Started</h1>
          <p className="text-dark-400 text-sm">Create your company account</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-dark-100 mb-1">Register Company</h2>
          <p className="text-dark-400 text-sm mb-6">You'll be set up as the Admin</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Company Name *</label>
              <input
                id="company_name"
                type="text"
                className="input-field"
                placeholder="Acme Corporation"
                value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Your Full Name *</label>
              <input
                id="full_name"
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Work Email *</label>
              <input
                id="reg_email"
                type="email"
                className="input-field"
                placeholder="admin@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  id="reg_password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-11"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Country Location</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  className="input-field pl-10"
                  value={form.default_currency}
                  onChange={e => setForm(f => ({ ...f, default_currency: e.target.value }))}
                >
                  <option value="USD">United States (USD)</option>
                  {countries.map((c, i) => (
                    <option key={i} value={c.currency}>{c.name} ({c.currency})</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-dark-500 mt-1">Sets the base currency for your company reports.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

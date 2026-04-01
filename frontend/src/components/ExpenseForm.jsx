import { useState, useEffect } from 'react';
import { sharedAPI, workflowAPI, expenseAPI } from '../services/api';
import { X, Info, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Tesseract from 'tesseract.js';

const ExpenseForm = ({ onSuccess, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    category_id: '',
    description: '',
    receipt_url: '',
    expense_date: new Date().toISOString().split('T')[0],
    workflow_id: '',
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState([{ code: 'USD', name: 'US Dollar' }]);
  const [convertedAmount, setConvertedAmount] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image must be smaller than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        setForm(f => ({ ...f, receipt_url: base64Image }));
        
        // 🚀 Trigger OCR Auto-Fill
        setOcrLoading(true);
        const ocrToast = toast.loading('AI is reading your receipt...', { icon: '🔍' });
        
        Tesseract.recognize(base64Image, 'eng')
          .then(({ data: { text } }) => {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            // 1. Merchant Name
            const merchant = lines[0] || '';
            
            // 2. Amount Extraction (Find largest currency value or explicit total)
            const amountMatches = text.match(/\$?\d+\.\d{2}/g);
            let largestAmount = 0;
            if (amountMatches) {
               amountMatches.forEach(m => {
                  const val = parseFloat(m.replace(/[^0-9.]/g, ''));
                  if (val > largestAmount) largestAmount = val;
               });
            }
            
            // 3. Date Parsing
            const dateMatch = text.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/);
            let parsedDate = form.expense_date;
            if (dateMatch) {
               try {
                 const d = new Date(dateMatch[0]);
                 if (!isNaN(d.getTime())) {
                    parsedDate = d.toISOString().split('T')[0];
                 }
               } catch(e) {}
            }

            setForm(f => ({
              ...f,
              description: merchant ? `Receipt from: ${merchant}` : f.description,
              amount: largestAmount > 0 ? largestAmount.toString() : f.amount,
              expense_date: parsedDate
            }));
            
            toast.success('Scanned successfully!', { id: ocrToast });
          })
          .catch(() => {
            toast.error('Could not auto-read receipt', { id: ocrToast });
          })
          .finally(() => setOcrLoading(false));
      };
      reader.readAsDataURL(file);
    } else {
      setForm(f => ({ ...f, receipt_url: '' }));
    }
  };

  useEffect(() => {
    sharedAPI.getCategories().then(r => setCategories(r.data.data.categories));
    workflowAPI.getAll({ limit: 50 }).then(r => setWorkflows(r.data.data));
    
    // Fetch Countries/Currencies from public API
    fetch('https://restcountries.com/v3.1/all?fields=name,currencies')
      .then(res => res.json())
      .then(data => {
        const crs = new Map();
        crs.set('USD', 'United States Dollar'); // Ensure baseline exists
        data.forEach(d => {
          if (d.currencies) {
            Object.keys(d.currencies).forEach(c => crs.set(c, d.currencies[c].name));
          }
        });
        setAvailableCurrencies(Array.from(crs.entries()).map(([code, name]) => ({ code, name })).sort((a,b) => a.code.localeCompare(b.code)));
      }).catch(err => console.error("Currency fetch failed", err));
  }, []);

  useEffect(() => {
    // Perform Currency Conversion if not USD
    if (form.currency && form.currency !== 'USD' && form.amount) {
       fetch(`https://api.exchangerate-api.com/v4/latest/${form.currency}`)
        .then(res => res.json())
        .then(data => {
           if (data.rates && data.rates['USD']) {
              setConvertedAmount((parseFloat(form.amount) * data.rates['USD']).toFixed(2));
           }
        }).catch(() => setConvertedAmount(null));
    } else {
       setConvertedAmount(null);
    }
  }, [form.currency, form.amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (!payload.workflow_id) delete payload.workflow_id;
      await expenseAPI.create(payload);
      toast.success('Expense submitted successfully!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-dark-100">Submit Expense</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-dark-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
              {convertedAmount && (
                <p className="text-xs text-emerald-400 mt-1 mt-1.5 flex items-center gap-1 font-medium">
                   ≈ ${convertedAmount} USD
                </p>
              )}
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input-field"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              >
                {availableCurrencies.map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              className="input-field"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className="input-field"
              value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none h-20"
              placeholder="Describe the expense..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Receipt Image & Auto-Fill AI</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="input-field p-2 text-sm text-dark-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20"
                onChange={handleFileChange}
                disabled={ocrLoading}
              />
              {ocrLoading && (
                <div className="w-10 h-10 flex items-center justify-center">
                   <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                </div>
              )}
              {!ocrLoading && form.receipt_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-dark-600 bg-dark-800 relative group">
                  <img src={form.receipt_url} alt="Receipt" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-4 h-4 text-primary-300" />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-dark-500 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" /> Wait a few seconds after uploading for AI to read your receipt!
            </p>
          </div>

          <div>
            <label className="label">Workflow (optional)</label>
            <select
              className="input-field"
              value={form.workflow_id}
              onChange={e => setForm(f => ({ ...f, workflow_id: e.target.value }))}
            >
              <option value="">Use default workflow</option>
              {workflows?.map?.(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <p className="text-xs text-dark-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Leave blank to use the company default workflow
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;

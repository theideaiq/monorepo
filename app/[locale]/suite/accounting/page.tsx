'use client';

import { useState } from 'react';
import { ArrowRightLeft, Save } from 'lucide-react';

export default function AccountingPage() {
  const [loading, setLoading] = useState(false);
  
  // FORM STATE
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(1480); // Default Parallel Rate
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // CALCULATED VALUES
  const iqdValue = currency === 'USD' ? (Number(amount) * rate) : Number(amount);

  async function handleSave() {
    setLoading(true);
    // This is where we would insert into the Supabase tables defined in Step 1
    // For now, we just simulate the save.
    alert(`Saved! Tax Value: ${iqdValue.toLocaleString()} IQD`);
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Journal Entry</h1>
          <p className="text-slate-500">Record financial transactions for dual-ledger reporting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: The Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          
          {/* Currency Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Currency</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="USD">🇺🇸 USD (Dollar)</option>
                <option value="IQD">🇮🇶 IQD (Dinar)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Rate</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  disabled={currency === 'IQD'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-sm">IQD/USD</span>
              </div>
            </div>
          </div>

          {/* Amount & Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Payment for Office Rent - Jan 2026"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Saving...' : <><Save size={18} /> Record Transaction</>}
          </button>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-fit">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ledger Preview</h3>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block mb-1">Cash (Actual)</span>
              <div className="text-xl font-mono font-bold text-slate-800">
                {currency === 'USD' ? '$' : 'IQD'} {Number(amount || 0).toLocaleString()}
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowRightLeft size={20} className="rotate-90" />
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <span className="text-xs text-emerald-600 block mb-1">Tax Reporting Value</span>
              <div className="text-xl font-mono font-bold text-emerald-800">
                IQD {iqdValue.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-600/70 mt-2">
                *Calculated at rate {rate} for Gov. Compliance
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

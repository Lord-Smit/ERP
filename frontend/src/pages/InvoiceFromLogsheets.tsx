import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import crmApi, { type ContractListItem } from '../api/crm';
import invoicesApi from '../api/invoices';
import { useToast } from '../context/ToastContext';

interface BillingRow {
  logsheet_id: string;
  date: string;
  equipment_name: string;
  rental_period: string;
  productive_hours: number | null;
  unit_price: number;
  line_total: number;
  description: string;
}

interface PreviewData {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  date_from: string;
  date_to: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  rows: BillingRow[];
}

export default function InvoiceFromLogsheets() {
  const navigate = useNavigate();
  const toast = useToast();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [contractId, setContractId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    crmApi.contracts.list({ status: 'active', page_size: 200 })
      .then((res) => {
        setContracts(res.results ?? []);
      })
      .catch(() => {
        setError('Failed to load contracts.');
      });
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId || !dateFrom || !dateTo) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await invoicesApi.previewFromLogsheets({
        contract_id: contractId,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setPreview(data);
      if (data.rows.length === 0) {
        setError('No approved logsheets found in the specified range.');
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to fetch preview data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoicesApi.generateFromLogsheets({
        contract_id: contractId,
        date_from: dateFrom,
        date_to: dateTo,
      });
      toast.success('Invoice Generated', `Invoice ${res.invoice_number} has been created successfully.`);
      navigate(`/invoices/${res.invoice_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700">&larr; Back to Invoices</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Generate Invoice from Logsheets</h1>
        <p className="text-sm text-gray-500">Auto-calculate charges from approved operator logsheets</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handlePreview} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Active Contract</label>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Choose a Contract --</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contract_number} - {c.customer_name} ({c.contract_type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Load & Preview Logsheets'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Preview Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 pb-6 border-b border-gray-150">
              <div>
                <span className="text-gray-500 block">Customer</span>
                <span className="font-semibold text-gray-800">{preview.customer_name}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Contract</span>
                <span className="font-semibold text-gray-800">{preview.contract_number}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Date Range</span>
                <span className="font-semibold text-gray-800">{preview.date_from} to {preview.date_to}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Logsheet Count</span>
                <span className="font-semibold text-gray-800">{preview.rows.length}</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-3">Calculated Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-medium">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Equipment</th>
                    <th className="pb-2">Details</th>
                    <th className="pb-2 text-right">Computed Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr key={row.logsheet_id + '-' + idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 text-gray-900 font-mono">{row.date}</td>
                      <td className="py-2.5 text-gray-900 font-medium">{row.equipment_name}</td>
                      <td className="py-2.5 text-gray-600">{row.description}</td>
                      <td className="py-2.5 text-right text-gray-900 font-semibold">₹{row.line_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6 mt-6 border-t border-gray-150">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{preview.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({preview.tax_percentage}%)</span>
                  <span>₹{preview.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-bold text-base border-t pt-2 mt-2">
                  <span>Total Due</span>
                  <span>₹{preview.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go Back / Edit Criteria
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors ml-auto"
              >
                {loading ? 'Generating...' : 'Confirm & Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

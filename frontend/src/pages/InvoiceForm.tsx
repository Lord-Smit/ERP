import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/invoices';
import crmApi from '../api/crm';
import equipApi from '../api/equipment';
import type { CustomerListItem } from '../api/crm';
import type { EquipmentListItem } from '../api/equipment';

interface LineItemForm {
  description: string;
  quantity: string;
  unit_price: string;
  equipment_id?: string;
}

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { description: '', quantity: '1', unit_price: '0', equipment_id: '' },
  ]);

  useEffect(() => {
    crmApi.customers.list({ page_size: 200 }).then((res) => {
      setCustomers(res.results ?? []);
    });
    equipApi.equipment.list({ page_size: 200 }).then((res) => {
      setEquipment(res.results ?? []);
    });
  }, []);

  useEffect(() => {
    if (id) {
      api.get(id).then((inv) => {
        setCustomer(inv.customer);
        setIssueDate(inv.issue_date);
        setDueDate(inv.due_date);
        setTaxAmount(inv.tax_amount);
        setNotes(inv.notes);
        if (inv.line_items.length > 0) {
          setLineItems(inv.line_items.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
          })));
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
      // default due date 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [id]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unit_price: '0', equipment_id: '' }]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: keyof LineItemForm, value: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  };

  const handleEquipSelect = (idx: number, equipId: string) => {
    const equip = equipment.find((e) => e.id === equipId);
    if (!equip) return;
    const updated = [...lineItems];
    updated[idx] = {
      ...updated[idx],
      equipment_id: equipId,
      description: `${equip.name} (${equip.brand} ${equip.model})`.trim(),
      unit_price: String(equip.rental_price_daily ?? 0),
    };
    setLineItems(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer || !issueDate || !dueDate) return;
    setSaving(true);
    try {
      const payload = {
        customer,
        issue_date: issueDate,
        due_date: dueDate,
        tax_amount: taxAmount,
        notes,
        line_items: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
        })),
      };
      if (isEdit) {
        await api.update(id!, payload);
      } else {
        await api.create(payload);
      }
      navigate('/invoices');
    } catch {
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Customer *</label>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Issue Date *</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax Amount</label>
              <input type="number" step="0.01" min="0" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
            <button type="button" onClick={addLineItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
          </div>
          {lineItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="w-44 shrink-0">
                <select value={item.equipment_id || ''} onChange={(e) => handleEquipSelect(idx, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">Select equipment</option>
                  {equipment.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.brand} {e.model})</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <input value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="w-20">
                <input type="number" step="1" min="0" value={item.quantity}
                  onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="w-28">
                <input type="number" step="0.01" min="0" value={item.unit_price}
                  onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                  placeholder="Unit Price"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="w-24 pt-2 text-sm text-right text-gray-700">
                ₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
              </div>
              {lineItems.length > 1 && (
                <button type="button" onClick={() => removeLineItem(idx)}
                  className="pt-2 text-red-500 hover:text-red-700 text-sm">&times;</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
          <button type="button" onClick={() => navigate('/invoices')}
            className="px-6 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}

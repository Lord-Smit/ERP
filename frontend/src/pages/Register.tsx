import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerOperator, type RegisterOperatorPayload } from '../api/auth';

export default function Register() {
  const [form, setForm] = useState<RegisterOperatorPayload>({
    email: '', password: '', first_name: '', last_name: '', phone: '', name: '',
    license_type: '', license_number: '', license_expiry: '', license_file: null,
    emergency_contact_name: '', emergency_contact_phone: '',
    address_line1: '', city: '', state: '', pincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'license_file' && files?.length) {
      setForm({ ...form, license_file: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.email.trim() || !form.password) return;
    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerOperator(form);
      setSuccess(res.detail);
      setForm({
        email: '', password: '', first_name: '', last_name: '', phone: '', name: '',
        license_type: '', license_number: '', license_expiry: '', license_file: null,
        emergency_contact_name: '', emergency_contact_phone: '',
        address_line1: '', city: '', state: '', pincode: '',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.email?.[0]
        || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-600 mb-6">{success}</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-4 sm:p-8 mx-4 sm:mx-0">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Equipment Rental ERP
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Register as Operator
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password *</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">First Name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Operator Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">License Type</label>
                <input name="license_type" value={form.license_type} onChange={handleChange} placeholder="e.g. Crane, Forklift"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">License Number</label>
                <input name="license_number" value={form.license_number} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">License Expiry</label>
                <input name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Upload License</label>
                <input name="license_file" type="file" accept="image/*,.pdf" onChange={handleChange}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
                <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact Phone</label>
                <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Address Line</label>
                <input name="address_line1" value={form.address_line1} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pincode</label>
                <input name="pincode" value={form.pincode} onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
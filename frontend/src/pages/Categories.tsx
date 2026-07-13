import { useEffect, useState, FormEvent } from 'react';
import type { EquipmentCategory } from '../api/equipment';
import api from '../api/equipment';

export default function Categories() {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.categories.list().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editingId) {
        await api.categories.update(editingId, { name, description, parent: parent || null });
      } else {
        await api.categories.create({ name, description, parent: parent || null });
      }
      setName('');
      setDescription('');
      setParent('');
      setEditingId(null);
      load();
    } catch {
      alert('Failed to save category');
    }
  };

  const handleEdit = (cat: EquipmentCategory) => {
    setName(cat.name);
    setDescription(cat.description);
    setParent(cat.parent || '');
    setEditingId(cat.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.categories.delete(id);
      load();
    } catch { alert('Failed to delete'); }
  };

  const renderTree = (items: EquipmentCategory[], level = 0) => {
    return items.map((cat) => (
      <div key={cat.id}>
        <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50" style={{ paddingLeft: `${16 + level * 24}px` }}>
          <div>
            <span className="text-sm font-medium text-gray-900">{cat.name}</span>
            {cat.description && <span className="text-xs text-gray-500 ml-2">{cat.description}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleEdit(cat)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
            <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && renderTree(cat.children, level + 1)}
      </div>
    ));
  };

  const flatList = (items: EquipmentCategory[]): EquipmentCategory[] => {
    const result: EquipmentCategory[] = [];
    const walk = (list: EquipmentCategory[], prefix = '') => {
      list.forEach((item) => {
        result.push({ ...item, name: prefix + item.name });
        if (item.children) walk(item.children, prefix + '-- ');
      });
    };
    walk(items);
    return result;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">Parent</label>
          <select value={parent} onChange={(e) => setParent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
            <option value="">None (top level)</option>
            {flatList(categories).map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === editingId}>{c.name}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setName(''); setDescription(''); setParent(''); }}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No categories yet</div>
        ) : (
          renderTree(categories)
        )}
      </div>
    </div>
  );
}

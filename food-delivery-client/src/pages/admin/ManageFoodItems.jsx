import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/common/AdminLayout'
import Loader from '../../components/common/Loader'
import { foodItemsApi } from '../../api/foodItems'
import { restaurantsApi } from '../../api/restaurants'
import { formatCurrency } from '../../utils/formatters'
import { toast } from '../../components/common/Toast'

const EMPTY = { name:'', description:'', price:'', imageUrl:'', isAvailable:true }

export default function ManageFoodItems() {
  const { id: restaurantId } = useParams()
  const [items, setItems]         = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([foodItemsApi.getByRestaurant(restaurantId), restaurantsApi.getById(restaurantId)])
      .then(([items, r]) => { setItems(items); setRestaurant(r) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [restaurantId])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit   = (item) => { setEditing(item); setForm({ ...item }); setShowModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), restaurantId }
      if (editing) {
        await foodItemsApi.update(editing.id, payload)
        toast('Item updated', 'success')
      } else {
        await foodItemsApi.create(payload)
        toast('Item created', 'success')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await foodItemsApi.delete(id)
      toast('Deleted', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <AdminLayout title={`Menu — ${restaurant?.name || '...'}`}>
      <div className="flex items-center justify-between mb-6">
        <Link to="/admin/restaurants" className="text-sm text-brand-500 hover:underline">← Back to Restaurants</Link>
        <button onClick={openCreate} className="btn-primary">+ Add Item</button>
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No items yet. Add your first menu item!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover rounded-xl mb-3" />
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                </div>
                <span className={`badge text-xs shrink-0 ${item.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <p className="text-brand-500 font-bold mt-2">{formatCurrency(item.price)}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(item)} className="flex-1 btn-secondary text-sm py-1.5">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="flex-1 btn-danger text-sm py-1.5">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Item' : 'Add Item'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {[
                { name:'name',        label:'Name',        type:'text' },
                { name:'description', label:'Description', type:'text' },
                { name:'price',       label:'Price ($)',   type:'number', step:'0.01' },
                { name:'imageUrl',    label:'Image URL',   type:'text' },
              ].map(({ name, label, type, step }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} step={step} value={form[name]}
                    onChange={e => setForm({...form, [name]: e.target.value})}
                    className="input-field" required={['name','price'].includes(name)} />
                </div>
              ))}
              {editing && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.isAvailable}
                    onChange={e => setForm({...form, isAvailable: e.target.checked})}
                    className="w-4 h-4 accent-brand-500" />
                  Available for ordering
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

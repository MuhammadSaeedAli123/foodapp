import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/common/AdminLayout'
import Loader from '../../components/common/Loader'
import { restaurantsApi } from '../../api/restaurants'
import { usersApi } from '../../api/users'
import { toast } from '../../components/common/Toast'
import { isOpenNow, fmt12 } from '../../utils/formatters'

function useLiveTick() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  return tick
}

const EMPTY = {
  name: '', description: '', imageUrl: '', address: '',
  phoneNumber: '', deliveryTime: 30, deliveryFee: 0,
  categoryId: '', openTime: '', closeTime: '', ownerId: '',
}

export default function ManageRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [categories, setCategories]   = useState([])
  const [owners, setOwners]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState(null)   // null = closed, false = create, object = edit
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const tick = useLiveTick()

  const load = () => {
    setLoading(true)
    Promise.all([
      restaurantsApi.getAll(),
      restaurantsApi.getCategories(),
      usersApi.getOwners(),
    ]).then(([r, c, o]) => { setRestaurants(r); setCategories(c); setOwners(o) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditing(false); setForm(EMPTY) }
  const openEdit   = (r) => {
    setEditing(r)
    setForm({ ...r, categoryId: r.categoryId, openTime: r.openTime ?? '', closeTime: r.closeTime ?? '', ownerId: r.ownerId ?? '' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.openTime && !form.closeTime) { toast('Please set a closing time too', 'error'); return }
    if (!form.openTime && form.closeTime) { toast('Please set an opening time too', 'error'); return }
    if (!editing && !form.ownerId) { toast('Please select a Restaurant Owner', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, openTime: form.openTime || null, closeTime: form.closeTime || null }
      if (editing) {
        await restaurantsApi.update(editing.id, payload)
        toast('Restaurant updated', 'success')
      } else {
        await restaurantsApi.create(payload)
        toast('Restaurant created', 'success')
      }
      setEditing(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this restaurant? The owner account will remain but will have no linked restaurant.')) return
    try {
      await restaurantsApi.delete(id)
      toast('Restaurant deleted', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <AdminLayout title="Manage Restaurants">

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {loading ? '…' : (
              <span>
                <span className="font-semibold text-gray-800">{restaurants.length}</span> restaurant{restaurants.length !== 1 ? 's' : ''} total
              </span>
            )}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Add Restaurant</button>
      </div>

      {loading ? <Loader /> : restaurants.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No restaurants yet</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Name', 'Owner', 'Category', 'Delivery', 'Fee', 'Hours', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {restaurants.map((r, idx) => {
                const open = isOpenNow(r.openTime, r.closeTime)
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-400 w-10">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {r.ownerName
                        ? <span className="font-medium text-gray-700">{r.ownerName}</span>
                        : <span className="text-amber-500 font-medium">⚠ No owner</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-gray-500">{r.categoryName}</td>
                    <td className="px-5 py-3 text-gray-500">{r.deliveryTime} min</td>
                    <td className="px-5 py-3 text-gray-500">${r.deliveryFee}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {r.openTime && r.closeTime
                        ? <>{fmt12(r.openTime)} – {fmt12(r.closeTime)}</>
                        : <span className="text-gray-400">24 / 7</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge text-xs ${open ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {open ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <Link to={`/admin/restaurants/${r.id}/items`}
                          className="text-xs text-blue-500 hover:underline font-medium">Menu</Link>
                        <button onClick={() => openEdit(r)}
                          className="text-xs text-brand-500 hover:underline font-medium">Edit</button>
                        <button onClick={() => handleDelete(r.id)}
                          className="text-xs text-red-400 hover:underline font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">{editing ? 'Edit Restaurant' : 'Add Restaurant'}</h3>
                {editing && editing.ownerName && (
                  <p className="text-xs text-gray-400 mt-0.5">Owner: {editing.ownerName}</p>
                )}
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">

              {/* Owner dropdown — required on create, read-only info on edit */}
              {!editing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Owner <span className="text-red-500">*</span>
                  </label>
                  <select value={form.ownerId}
                    onChange={e => setForm({ ...form, ownerId: e.target.value })}
                    className="input-field" required>
                    <option value="">Select an owner…</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>{o.fullName} — {o.email}</option>
                    ))}
                  </select>
                  {owners.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No Restaurant Owner accounts exist yet.{' '}
                      <Link to="/admin/owners" className="underline font-medium">Create one first.</Link>
                    </p>
                  )}
                </div>
              ) : null}

              {[
                { name: 'name',         label: 'Name',                type: 'text'   },
                { name: 'description',  label: 'Description',         type: 'text'   },
                { name: 'imageUrl',     label: 'Image URL',           type: 'text'   },
                { name: 'address',      label: 'Address',             type: 'text'   },
                { name: 'phoneNumber',  label: 'Phone',               type: 'text'   },
                { name: 'deliveryTime', label: 'Delivery Time (min)', type: 'number' },
                { name: 'deliveryFee',  label: 'Delivery Fee',        type: 'number' },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[name]}
                    onChange={e => setForm({ ...form, [name]: e.target.value })}
                    className="input-field" required={['name', 'address'].includes(name)} />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field" required>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Opening Hours</p>
                <p className="text-xs text-gray-400 mb-3">Leave both empty for 24/7. Status switches automatically.</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Opens at</label>
                    <input type="time" value={form.openTime}
                      onChange={e => setForm({ ...form, openTime: e.target.value })} className="input-field" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Closes at</label>
                    <input type="time" value={form.closeTime}
                      onChange={e => setForm({ ...form, closeTime: e.target.value })} className="input-field" />
                  </div>
                </div>
                {form.openTime && form.closeTime && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                    isOpenNow(form.openTime, form.closeTime) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow(form.openTime, form.closeTime) ? 'bg-green-500' : 'bg-red-400'}`} />
                    {isOpenNow(form.openTime, form.closeTime)
                      ? `Currently open · Closes at ${fmt12(form.closeTime)}`
                      : `Currently closed · Opens at ${fmt12(form.openTime)}`}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
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

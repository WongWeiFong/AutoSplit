import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 } from 'uuid'

const API_URL = import.meta.env.VITE_BACKEND_URL

interface ParsedData {
  title: string | null
  merchantName: string | null
  items: Array<{
    tempItemId: string
    name: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    totalPrice: number
    description: string
  }>
  subtotal: number
  taxPercentage: number
  tax: number
  totalDiscount: number
  rounding: number
  totalAmount: number
}

interface ResponseData {
  billId: string
  parsedData: ParsedData
}

interface User {
  id: string
  name: string | null
  email: string | null
}

interface ItemSplit {
  userId: string
  amount: number
}

export default function SubmitReceiptPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const [editedData, setEditedData] = useState<ParsedData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [itemSplits, setItemSplits] = useState<Map<number, ItemSplit[]>>(new Map())
  const [paidById, setPaidById] = useState<string | null>(null)
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile))
    } else {
      setPreviewUrl(null)
    }

    // Clear previous data when new file is selected
    setResponseData(null)
    setEditedData(null)
    setSelectedItemIndex(null)
    setItemSplits(new Map())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !tripId) return

    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      alert('Please login first')
      setLoading(false)
      return
    }

    const accessToken = session.access_token
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tripId', tripId)

    try {
      const response = await fetch(`${API_URL}/receipts/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setResponseData(data)
        const itemsWithIds = data.parsedData.items.map((item: any) => ({
          ...item,
          tempItemId: uuidv4()
        }))

        setEditedData({
          ...data.parsedData,
          items: itemsWithIds
        })
      } else {
        alert('Upload failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Upload failed')
    }

    setLoading(false)
  }

  const fetchUsers = async () => {
    if (users.length > 0) return
    setLoadingUsers(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert('Please login first')
      setLoadingUsers(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/trips/${tripId}/members`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.map((m: any) => m.user));
      } else {
        alert('Failed to fetch trip members')
      }
    } catch (error) {
      console.error('Error fetching trip members:', error)
      alert('Failed to fetch trip members')
    }

    setLoadingUsers(false)
  }

  const addNewItem = () => {
    if (!editedData) return;
    const newItem = {
      tempItemId: uuidv4(),
      name: 'New Item',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      totalPrice: 0,
      description: ''
    };

    const newItems = [...editedData.items, newItem];
    const results = recalculateItemAndBill(newItems, editedData.taxPercentage, editedData.rounding);

    setEditedData({
      ...editedData!,
      ...results
    });
  };

  const removeItem = (index: number) => {
    if (!editedData || !confirm('Remove this item?')) return;
    const newItems = editedData!.items.filter((_, i) => i !== index);
    const results = recalculateItemAndBill(newItems, editedData.taxPercentage, editedData.rounding);
    setEditedData({ ...editedData, ...results });
    setSelectedItemIndex(null);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    if (!editedData) return;

    const newItems = [...editedData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    const results = recalculateItemAndBill(newItems, editedData.taxPercentage, editedData.rounding);

    setEditedData({
      ...editedData,
      ...results
    });
  };

  const toggleItemParticipant = (itemIndex: number, userId: string) => {
    const currentSplits = itemSplits.get(itemIndex) || []
    const existingIndex = currentSplits.findIndex(s => s.userId === userId)

    let newSplits: ItemSplit[]
    if (existingIndex >= 0) {
      newSplits = currentSplits.filter(s => s.userId !== userId)
    } else {
      newSplits = [...currentSplits, { userId: userId, amount: 0 }]
    }

    setItemSplits(new Map(itemSplits.set(itemIndex, newSplits)))
  }

  const updateSplitAmount = (itemIndex: number, userId: string, amount: number) => {
    const currentSplits = itemSplits.get(itemIndex) || []
    const newSplits = currentSplits.map(s =>
      s.userId === userId ? { ...s, amount } : s
    )
    setItemSplits(new Map(itemSplits.set(itemIndex, newSplits)))
  }

  const splitEvenly = (itemIndex: number) => {
    if (!editedData) return

    const item = editedData.items[itemIndex]
    const currentSplits = itemSplits.get(itemIndex) || []

    if (currentSplits.length === 0) return

    const amountPerPerson = Number((item.totalPrice / currentSplits.length).toFixed(2))
    const newSplits = currentSplits.map((s, i) => ({
      ...s,
      amount: i === currentSplits.length - 1
        ? Number((item.totalPrice - amountPerPerson * (currentSplits.length - 1)).toFixed(2))
        : amountPerPerson
    }))

    setItemSplits(new Map(itemSplits.set(itemIndex, newSplits)))
  }

  const getTotalSplitAmount = (itemIndex: number): number => {
    const splits = itemSplits.get(itemIndex) || []
    return splits.reduce((sum, s) => sum + s.amount, 0)
  }

  const handleSelectItem = (index: number) => {
    setSelectedItemIndex(index)
    setIsEditingSummary(false)
    fetchUsers()
  }

  const handleSelectSummary = () => {
    setSelectedItemIndex(null)
    setIsEditingSummary(true)
  }

  const recalculateItemAndBill = (
    items: any[],
    taxRate: number,
    rounding: number
  ) => {
    let billSubtotal = 0;
    let billTotalDiscount = 0;
    let billTotalTax = 0;

    const updatedItems = items.map(item => {
      // 1. Calculate Item Subtotal (Qty * Price)
      const itemSubtotal = (item.quantity * item.unitPrice);
      // 2. Taxable amount for this item
      const itemTaxableAmount = itemSubtotal - item.discount;
      // 3. Calculate Item Tax based on the percentage
      const itemTax = itemTaxableAmount * (taxRate / 100);
      // 4. Calculate Item Total Price
      const itemTotalPrice = itemTaxableAmount + itemTax;

      billSubtotal += itemSubtotal;
      billTotalDiscount += item.discount;
      billTotalTax += itemTax;

      return {
        ...item,
        tax: Number(itemTax.toFixed(2)),
        totalPrice: Number(itemTotalPrice.toFixed(2))
      };
    });

    return {
      items: updatedItems,
      subtotal: Number(billSubtotal.toFixed(2)),
      totalDiscount: Number(billTotalDiscount.toFixed(2)),
      tax: Number(billTotalTax.toFixed(2)),
      totalAmount: Number((billSubtotal - billTotalDiscount + billTotalTax + rounding).toFixed(2))
    };
  };

  const handleConfirm = async () => {
    if (!responseData || !editedData) return

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert('Please login first')
      return
    }

    // Collect all unique participants from splits
    const userIds = new Set<string>()
    itemSplits.forEach(splits => {
      splits.forEach(split => userIds.add(split.userId))
    })

    // Build items with IDs
    const items = editedData.items.map(item => ({
      tempItemId: item.tempItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      tax: item.tax ?? 0,
      totalPrice: item.totalPrice,
      description: item.description ?? '',
    }))

    // Build participants array
    const participants = Array.from(userIds).map(userId => {
      const user = users.find(u => u.id === userId)
      return {
        userId: user?.id,
        displayName: user?.name || user?.email || userId.slice(0, 8),
      }
    })

    // Build splits array
    const splits: { tempItemId: string; itemName: string; userId: string; amount: number }[] = []
    editedData.items.forEach((item, itemIndex) => {
      const itemSplitList = itemSplits.get(itemIndex) || []
      itemSplitList.forEach(split => {
        splits.push({
          tempItemId: item.tempItemId,
          itemName: item.name,
          userId: split.userId,
          amount: split.amount,
        })
      })
    })

    const payload = {
      paidById: paidById || session.user.id,
      title: editedData.merchantName || 'Uploaded Receipt',
      merchantName: editedData.merchantName,
      bill: {
        subtotal: editedData.subtotal,
        tax: editedData.tax,
        taxPercentage: editedData.taxPercentage ?? 0,
        totalDiscount: editedData.totalDiscount ?? 0,
        rounding: editedData.rounding,
        totalAmount: editedData.totalAmount,
      },
      items,
      participants,
      splits,
    }

    const res = await fetch(
      `${API_URL}/bills/${responseData.billId}/confirm`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    )

    if (res.ok) {
      alert('Bill saved successfully!');
      navigate(`/trips/${tripId}`);

    } else {
      const error = await res.json()
      console.error('Error:', error)
      alert('Failed to save bill')
    }

  }

  return (
    <div className="container" style={{ maxWidth: '1600px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h2>Submit Receipt</h2>
        {editedData && (
          <button className="btn-primary" onClick={handleConfirm}>
            Confirm & Save Bill
          </button>
        )}
      </div>

      {/* File Upload Form */}
      {!editedData && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ padding: '2rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Upload your receipt image to get started</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ width: 'auto' }}
                />
              </div>
            </div>
            <button className="btn-primary" disabled={loading || !file} style={{ width: '100%' }}>
              {loading ? 'Processing Receipt...' : 'Upload & Process'}
            </button>
          </form>
        </div>
      )}

      {/* Main Content - 3 Column Layout */}
      {previewUrl && editedData && (
        <div className="grid-3-col" style={{ flex: 1, minHeight: 0 }}>

          {/* Left: Image Preview & Summary */}
          <div className="scroll-y" style={{ paddingRight: '1rem' }}>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Receipt Image</h3>
              <div style={{
                height: '400px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Summary Section */}
            <div
              className={`card clickable ${isEditingSummary ? 'ring-2 ring-primary' : ''}`}
              onClick={handleSelectSummary}
              style={{
                borderColor: isEditingSummary ? 'var(--primary)' : 'var(--border)',
                backgroundColor: isEditingSummary ? 'var(--primary-light)' : 'var(--bg-surface)'
              }}
            >
              <h4 style={{ marginBottom: '1rem' }}>Bill Summary</h4>
              <div style={{ fontSize: '0.95rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                  <span>${editedData.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tax ({editedData.taxPercentage?.toFixed(2)}%):</span>
                  <span>${editedData.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Discount:</span>
                  <span>-${editedData.totalDiscount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Rounding:</span>
                  <span>${editedData.rounding?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex-between" style={{ fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--primary)' }}>${editedData.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Items List */}
          <div className="scroll-y" style={{ paddingRight: '1rem' }}>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <label>Payer</label>
              <select value={paidById || ''} onChange={(e) => setPaidById(e.target.value)}>
                <option value="">Select Payer</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>

            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3>Items ({editedData.items.length})</h3>
              <button className="btn-secondary btn-sm" onClick={addNewItem}>+ Add Custom Item</button>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {editedData.items.map((item, index) => {
                const splits = itemSplits.get(index) || []
                const totalSplit = getTotalSplitAmount(index)
                const isFullyAssigned = Math.abs(totalSplit - item.totalPrice) < 0.01
                const isSelected = selectedItemIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectItem(index)}
                    className={`card clickable ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    style={{
                      padding: '1rem',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : (isFullyAssigned ? 'var(--secondary-light)' : 'var(--bg-surface)'),
                      transition: 'all 0.2s',
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: '600' }}>
                        {item.quantity}x {item.name}
                      </div>
                      <div style={{ marginLeft: '1rem' }}>${item.totalPrice.toFixed(2)}</div>
                    </div>

                    {splits.length > 0 ? (
                      <div style={{ fontSize: '0.85rem', color: isFullyAssigned ? 'var(--secondary-hover)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${isFullyAssigned ? 'badge-success' : 'badge-warning'}`}>
                          {splits.length} person(s)
                        </span>
                        <span>${totalSplit.toFixed(2)} assigned</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        No one assigned
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              onClick={addNewItem}
              className="btn-outline"
              style={{ width: '100%', marginTop: '1rem', borderStyle: 'dashed' }}
            >
              + Add New Item
            </button>
          </div>

          {/* Right: Item Detail Panel */}
          <div className="scroll-y card" style={{ height: 'fit-content' }}>
            {isEditingSummary ? (
              <div>
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Edit Bill Summary</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Bill Title</label>
                    <input
                      type="text"
                      value={editedData.title || ''}
                      onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                      placeholder="e.g., Dinner at McDonald's"
                    />
                  </div>
                  <div className="form-group">
                    <label>Merchant Name</label>
                    <input
                      type="text"
                      value={editedData.merchantName || ''}
                      onChange={(e) => setEditedData({ ...editedData, merchantName: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Subtotal</label>
                      <input type="number" value={editedData.subtotal} onChange={(e) => setEditedData({ ...editedData, subtotal: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label>Tax (%)</label>
                      <input
                        type="number"
                        value={editedData.taxPercentage || 0}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value) || 0;
                          const results = recalculateItemAndBill(editedData.items, newRate, editedData.rounding);
                          setEditedData({ ...editedData, taxPercentage: newRate, ...results });
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Discount</label>
                      <input type="number" value={editedData.totalDiscount} onChange={(e) => setEditedData({ ...editedData, totalDiscount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label>Rounding</label>
                      <input type="number" value={editedData.rounding} onChange={(e) => setEditedData({ ...editedData, rounding: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold' }}>Total Amount</label>
                    <input type="number" value={editedData.totalAmount} onChange={(e) => setEditedData({ ...editedData, totalAmount: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
            ) : (selectedItemIndex !== null && editedData.items[selectedItemIndex]) ? (
              <div>
                <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Item Details</h3>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => removeItem(selectedItemIndex)}
                  >
                    Remove
                  </button>
                </div>

                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editedData.items[selectedItemIndex].name}
                    onChange={(e) => updateItem(selectedItemIndex, 'name', e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={editedData.items[selectedItemIndex].quantity}
                      onChange={(e) => updateItem(selectedItemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].unitPrice}
                      onChange={(e) => updateItem(selectedItemIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label>Tax Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].tax}
                      onChange={(e) => updateItem(selectedItemIndex, 'tax', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>Total Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].totalPrice}
                      onChange={(e) => updateItem(selectedItemIndex, 'totalPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editedData.items[selectedItemIndex].description}
                    onChange={(e) => updateItem(selectedItemIndex, 'description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Participant Assignment Section */}
                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Assign To</h4>
                    <button
                      type="button"
                      onClick={() => splitEvenly(selectedItemIndex)}
                      className="btn-secondary btn-sm"
                    >
                      Split Evenly
                    </button>
                  </div>

                  {loadingUsers ? (
                    <p>Loading users...</p>
                  ) : users.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No other users in this trip.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {users.map(user => {
                        const splits = itemSplits.get(selectedItemIndex) || []
                        const isSelected = splits.some(s => s.userId === user.id)

                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleItemParticipant(selectedItemIndex, user.id)}
                            className={`clickable badge ${isSelected ? 'badge-success' : 'badge-neutral'}`}
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              border: isSelected ? '1px solid var(--secondary)' : '1px solid var(--border)',
                            }}
                          >
                            {user.name || user.email || user.id.substring(0, 8)}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4rem' }}>
                Select an item or the summary to edit details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  FileText,
  ArrowLeft,
  X,
  Plus,
  Check,
  Trash2,
  Users,
  DollarSign,
  Receipt,
  Save
} from 'lucide-react'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_BACKEND_URL;

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
      data: { session } 
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
        // Fetch users immediately after successful upload
        fetchUsers()
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
      const itemSubtotal = (item.quantity * item.unitPrice);
      const itemTaxableAmount = itemSubtotal - item.discount;
      const itemTax = itemTaxableAmount * (taxRate / 100);
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

    const userIds = new Set<string>()
    itemSplits.forEach(splits => {
      splits.forEach(split => userIds.add(split.userId))
    })

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

    const participants = Array.from(userIds).map(userId => {
      const user = users.find(u => u.id === userId)
      return {
        userId: user?.id,
        displayName: user?.name || user?.email || userId.slice(0, 8),
      }
    })

    const splits: any[] = []
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
      title: editedData.title || 'Uploaded Receipt',
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Receipt</h1>
              <p className="text-sm text-gray-500">Scan and verify bill details</p>
            </div>
          </div>
          {editedData && (
            <button
              onClick={handleConfirm}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Save className="mr-2 h-5 w-5" />
              Confirm & Save
            </button>
          )}
        </div>

        {/* Upload State */}
        {!editedData && (
          <div className="max-w-2xl mx-auto mt-20">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <UploadCloud size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload your receipt</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Take a clear photo of the entire receipt. We'll automatically extract the items and prices for you.
              </p>

              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button className={`w-full py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-600 font-medium group-hover:border-indigo-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all ${loading ? 'opacity-50' : ''}`}>
                  {loading ? 'Processing...' : 'Click to select or drag file here'}
                </button>
              </div>

              {loading && (
                <div className="mt-8 flex flex-col items-center animate-fade-in">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                  <p className="text-sm text-gray-500 font-medium">Analyzing receipt items...</p>
                </div>
              )}
              
            </div>
            <button className="btn-primary" disabled={loading || !file} style={{ width: '100%' }}>
              {loading ? 'Processing Receipt...' : 'Upload & Process'}
            </button>
            </form>

            
          </div>
        )}

        {/* Editing State - 3 Columns */}
        {previewUrl && editedData && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

            {/* Column 1: Receipt Preview (3 cols) */}
            <div className="xl:col-span-3 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 flex items-center justify-between">
                <span>Original Receipt</span>
                <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="flex-1 bg-gray-900 p-4 flex items-center justify-center overflow-auto relative">
                <img src={previewUrl} alt="Receipt" className="max-w-full max-h-full object-contain rounded shadow-lg" />
              </div>
              {/* Summary Card at bottom left */}
              <div
              onClick={handleSelectSummary}
              className={`p-4 border-t cursor-pointer transition-colors ${isEditingSummary ? 'bg-indigo-50 border-indigo-200' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-900">Bill Summary</h4>
                {isEditingSummary && <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Editing</span>}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal:</span><span>${editedData.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Tax:</span><span>${editedData.tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Discount:</span><span>-${editedData.totalDiscount.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Rounding:</span><span>+-${editedData.rounding.toFixed(2)}</span></div>

                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t mt-2">
                  <span>Total: </span>
                  <span className="text-indigo-600">${editedData.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

            {/* Column 2: Items List (5 cols) */}
            <div className="xl:col-span-5 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 flex items-center justify-between">
              <span>Items ({editedData.items.length})</span>
              <button onClick={addNewItem} className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1">
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50/[0.5]">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Paid By</label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={paidById || ''}
                onChange={(e) => setPaidById(e.target.value)}
              >
                <option value="">Select Payer...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {editedData.items.map((item, index) => {
                const splits = itemSplits.get(index) || []
                const totalSplit = getTotalSplitAmount(index)
                const isFullyAssigned = Math.abs(totalSplit - item.totalPrice) < 0.01
                const isSelected = selectedItemIndex === index

                return (
                  <div
                    key={item.tempItemId}
                    onClick={() => handleSelectItem(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-semibold text-gray-900">{item.quantity}x {item.name}</span>
                        {item.quantity > 1 && <span className="text-xs text-gray-400 block">@ ${item.unitPrice}/ea</span>}
                      </div>
                      <div className="font-mono font-medium">${item.totalPrice.toFixed(2)}</div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {splits.length > 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isFullyAssigned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {splits.length} assigned • ${totalSplit.toFixed(2)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

            {/* Column 3: Edit Details (4 cols) */}
            <div className="xl:col-span-4 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 flex justify-between items-center">
              <span>{isEditingSummary ? 'Edit Bill Details' : selectedItemIndex !== null ? 'Edit Item' : 'Bill Details'}</span>
              {!isEditingSummary && selectedItemIndex !== null && (
                <button 
                  onClick={() => removeItem(selectedItemIndex)} 
                  className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-bold"
                >
                  <Trash2 size={14} /> Remove Item
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isEditingSummary ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bill Title</label>
                    <input type="text" value={editedData.title || ''} onChange={e => setEditedData({ ...editedData, title: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Restaurant Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Merchant Name</label>
                    <input type="text" value={editedData.merchantName || ''} onChange={e => setEditedData({ ...editedData, merchantName: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Restaurant Name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                      <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={editedData.subtotal} 
                      onChange={e => setEditedData({ ...editedData, subtotal: parseFloat(e.target.value) || 0 })} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax %</label>
                        <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedData.taxPercentage || 0} 
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          const res = recalculateItemAndBill(editedData.items, rate, editedData.rounding);
                          setEditedData({ ...editedData, taxPercentage: rate, ...res });
                        }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                        <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedData.tax} 
                        onChange={e => setEditedData({ ...editedData, tax: parseFloat(e.target.value) || 0 })} 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Discount</label>
                      <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={editedData.totalDiscount} 
                      onChange={e => setEditedData({ ...editedData, totalDiscount: parseFloat(e.target.value) || 0 })} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rounding +-</label>
                      <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={editedData.rounding} 
                      onChange={e => setEditedData({ ...editedData, rounding: parseFloat(e.target.value) || 0 })} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <input 
                    type="text" 
                    value={editedData.totalAmount || 0} 
                    onChange={e => setEditedData({ ...editedData, totalAmount: parseFloat(e.target.value) || 0 })} 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              ) : selectedItemIndex !== null && editedData.items[selectedItemIndex] ? (
                <div className="space-y-6">
                  {/* <div className="flex justify-end">
                    <button onClick={() => removeItem(selectedItemIndex)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                      <Trash2 size={14} /> Remove Item
                    </button>
                  </div> */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Item Name</label>
                    <input type="text" value={editedData.items[selectedItemIndex].name} onChange={e => updateItem(selectedItemIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input 
                      type="number"
                      min="0"
                      step="1"
                      value={editedData.items[selectedItemIndex].quantity} 
                      onChange={e => updateItem(selectedItemIndex, 'quantity', parseFloat(e.target.value) || 0)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                      <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].unitPrice} 
                      onChange={e => updateItem(selectedItemIndex, 'unitPrice', parseFloat(e.target.value) || 0)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tax</label>
                      <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].tax || 0} 
                      onChange={e => updateItem(selectedItemIndex, 'tax', parseFloat(e.target.value) || 0)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Discount</label>
                      <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].discount} 
                      onChange={e => updateItem(selectedItemIndex, 'discount', parseFloat(e.target.value) || 0)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Price</label>
                    <input 
                      type="number"
                      step="0.01"
                      disabled={true}
                      value={editedData.items[selectedItemIndex].totalPrice} 
                      onChange={e => updateItem(selectedItemIndex, 'totalPrice', parseFloat(e.target.value) || 0)} 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                    value={editedData.items[selectedItemIndex].description} 
                    onChange={e => updateItem(selectedItemIndex, 'name', e.target.value)} 
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>

                  <div className="border-t pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">Split Between</label>
                      <button onClick={() => splitEvenly(selectedItemIndex)} className="text-indigo-600 text-xs font-semibold hover:underline">Split Evenly</button>
                    </div>
                    {/* <div className="flex flex-wrap gap-2">
                      {loadingUsers ? <p className="text-sm text-gray-400">Loading names...</p> : users.map(u => {
                        const splits = itemSplits.get(selectedItemIndex) || []
                        const isSelected = splits.some(s => s.userId === u.id)
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleItemParticipant(selectedItemIndex, u.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                          >
                            {u.name || u.email?.substring(0, 6)}
                          </button>
                        )
                      })}
                    </div> */}
                                        <div className="space-y-3">
                      {loadingUsers ? (
                        <p className="text-sm text-gray-400">Loading names...</p>
                      ) : (
                        users.map(u => {
                          const splits = itemSplits.get(selectedItemIndex) || []
                          const split = splits.find(s => s.userId === u.id)
                          const isSelected = !!split

                          return (
                            <div key={u.id} className="flex items-center justify-between gap-4 p-2 rounded-lg border border-gray-100">
                              <button
                                onClick={() => toggleItemParticipant(selectedItemIndex, u.id)}
                                className={`flex-1 text-left px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                              >
                                {u.name || u.email?.substring(0, 6)}
                              </button>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-sm">$</span>
                                  <input
                                    type="number"
                                    value={split.amount || 0}
                                    onChange={(e) => updateSplitAmount(selectedItemIndex, u.id, parseFloat(e.target.value) || 0)}
                                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    step="0.01"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                  <FileText size={48} className="mb-4 text-gray-200" />
                  <p>Select an item from the list <br />or the summary to edit details.</p>
                </div>
              )}
            </div>
          </div>
          </div>
        )}
      </main>
    </div>
  )
}
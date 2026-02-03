import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useParams, useNavigate } from 'react-router-dom'

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
      const response = await fetch('${import.meta.env.BACKEND_URL}/receipts/upload', {
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
        // Deep clone for editing
        // setEditedData(JSON.parse(JSON.stringify(data.parsedData)))
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
      const response = await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/members`, {
      // const response = await fetch('${import.meta.env.BACKEND_URL}/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
  
      if (response.ok) {
        const data = await response.json()
        setUsers(data.map((m: any) => m.user));
        // setUsers(data)
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

  // const updateItem = (index: number, field: keyof ParsedData['items'][0], value: string | number) => {
  //   if (editedData) {
  //     const newItems = [...editedData.items]
  //     newItems[index] = { ...newItems[index], [field]: value }
  //     setEditedData({ ...editedData, items: newItems })
  //   }
  // }

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

  // const recalculateBill = (currentData: ParsedData, newRate: number) => {
  //   let totalSubtotal = 0;
  //   let totalTaxAmount = 0;
  
  //   //calculate base price and add tax
  //   const updatedItems = currentData.items.map(item => {
  //     const basePrice = (item.quantity * item.unitPrice) - item.discount;
  //     const itemTax = basePrice * (newRate / 100);
  //     const itemTotalWithTax = basePrice + itemTax;
  
  //     totalSubtotal += basePrice;
  //     totalTaxAmount += itemTax;
  
  //     return {
  //       ...item,
  //       totalPrice: Number(itemTotalWithTax.toFixed(2))
  //     };
  //   });
  
  //   //update bill data
  //   return {
  //     ...currentData,
  //     items: updatedItems,
  //     taxPercentage: newRate,
  //     subtotal: Number(totalSubtotal.toFixed(2)),
  //     tax: Number(totalTaxAmount.toFixed(2)),
  //     totalAmount: Number((totalSubtotal + totalTaxAmount + currentData.rounding).toFixed(2))
  //   };
  // };

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
    const splits: {tempItemId: string; itemName: string; userId: string; amount: number }[] = []
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
      `${import.meta.env.BACKEND_URL}` + `/bills/${responseData.billId}/confirm`,
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
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h2>Submit Receipt</h2>
      
      {/* File Upload Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginRight: '10px' }}
        />
        <button disabled={loading || !file}>
          {loading ? 'Processing...' : 'Upload & Process'}
        </button>
      </form>

      {/* Main Content - 3 Column Layout */}
      {previewUrl && editedData && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          
          {/* Left: Image Preview */}
          <div style={{ flex: '0 0 300px' }}>
            <h3>Receipt Image</h3>
            <div style={{
              width: '300px',
              height: '450px',
              border: '2px solid #ccc',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
            }}>
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Summary Section */}
            <div onClick={handleSelectSummary} style={{ cursor: 'pointer', marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h4 style={{ marginTop: 0 }}>Bill Summary</h4>
              <div style={{ fontSize: '0.9em' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Subtotal:</span>
                  <span>${editedData.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Tax: {editedData.taxPercentage?.toFixed(2) || '0.00'}%</span>
                  <span>${editedData.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Discount:</span>
                  <span>-${editedData.totalDiscount?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Rounding:</span>
                  <span>${editedData.rounding?.toFixed(2) || '0.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #ccc', paddingTop: '5px', marginTop: '5px' }}>
                  <span>Total:</span>
                  <span>${editedData.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Items List */}
          <div style={{ flex: '0 0 300px', maxHeight: '650px', overflowY: 'auto' }}>
            <div style={{ margin: '0px 10px' }}>
              <label>Who paid for this bill?</label>
              <select value={paidById || ''} onChange={(e) => setPaidById(e.target.value)}>
                <option value="">Select Payer</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>
            <h3>Items ({editedData.items.length})</h3>
            {editedData.items.map((item, index) => {
              const splits = itemSplits.get(index) || []
              const totalSplit = getTotalSplitAmount(index)
              const isFullyAssigned = Math.abs(totalSplit - item.totalPrice) < 0.01
              
              return (
                <div
                  key={index}
                  onClick={() => handleSelectItem(index)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    border: selectedItemIndex === index 
                      ? '2px solid #2196F3' 
                      : '1px solid #ddd',
                    backgroundColor: selectedItemIndex === index 
                      ? '#e3f2fd' 
                      : isFullyAssigned ? '#e8f5e9' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {item.quantity}x {item.name}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>
                    ${item.totalPrice.toFixed(2)}
                  </div>
                  {splits.length > 0 && (
                    <div style={{ 
                      fontSize: '0.8em', 
                      marginTop: '4px',
                      color: isFullyAssigned ? 'green' : 'orange'
                    }}>
                      {splits.length} participant(s) • ${totalSplit.toFixed(2)} assigned
                      {!isFullyAssigned && ` ($${(item.totalPrice - totalSplit).toFixed(2)} remaining)`}
                    </div>
                  )}
                </div>
              )
            })}
            <button 
              onClick={addNewItem}
              style={{ width: '100%', padding: '10px', marginTop: '10px', border: '2px dashed #ccc', background: 'transparent', cursor: 'pointer' }}
            >
              + Add New Item
            </button>
          </div>

          {/* Right: Item Detail Panel */}
          <div style={{ flex: '1', minWidth: '400px' }}>
          {isEditingSummary ? (
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>Edit Bill Summary</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 'bold' }}>Bill Title:</label>
                  <input 
                    type="text" 
                    value={editedData.title || ''} 
                    onChange={(e) => setEditedData({...editedData, title: e.target.value})}
                    placeholder="e.g., Dinner at McDonald's"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold' }}>Merchant Name:</label>
                  <input 
                    type="text" 
                    value={editedData.merchantName || ''} 
                    onChange={(e) => setEditedData({...editedData, merchantName: e.target.value})}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label>Subtotal:</label>
                    <input type="number" value={editedData.subtotal} onChange={(e) => setEditedData({...editedData, subtotal: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px' }} />
                  </div>
                  <div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label>Tax:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input 
                      type="number" 
                      value={editedData.taxPercentage || 0} 
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value) || 0;
                        const results = recalculateItemAndBill(editedData.items, newRate, editedData.rounding);
                        setEditedData({
                          ...editedData,
                          taxPercentage: newRate,
                          ...results
                        });
                      }} 
                      style={{ width: '100%', padding: '8px' }} 
                    /> %
                    <input 
                      type="number" 
                      value={editedData.tax} 
                      onChange={(e) => {
                        // If user edits amount, calculate the effective rate and apply to items
                        const newTax = parseFloat(e.target.value) || 0;
                        const results = recalculateItemAndBill(editedData.items, editedData.taxPercentage, newTax);
                        setEditedData({
                          ...editedData,
                          ...results
                        });                      }} 
                      style={{ width: '100%', padding: '8px' }} 
                    />
                    </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label>Discount:</label>
                    <input type="number" value={editedData.totalDiscount} onChange={(e) => setEditedData({...editedData, totalDiscount: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px' }} />
                  </div>
                  <div>
                    <label>Rounding:</label>
                    <input type="number" value={editedData.rounding} onChange={(e) => setEditedData({...editedData, rounding: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight: 'bold' }}>Total Amount:</label>
                  <input type="number" value={editedData.totalAmount} onChange={(e) => setEditedData({...editedData, totalAmount: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>
            </div>
            ) : (selectedItemIndex !== null && editedData.items[selectedItemIndex] ) ? (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
                Item Details
                <button
                  onClick={() => removeItem(selectedItemIndex)}
                  style={{
                    background: '#ff5252',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8em',
                  }}
                >
                  Remove Item
                </button>
              </h3>
                
                {/* Item Fields */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Name:</label>
                    <input
                      type="text"
                      value={editedData.items[selectedItemIndex].name}
                      onChange={(e) => updateItem(selectedItemIndex, 'name', e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Quantity:</label>
                      <input
                        type="number"
                        value={editedData.items[selectedItemIndex].quantity}
                        onChange={(e) => updateItem(selectedItemIndex, 'quantity', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Unit Price:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.items[selectedItemIndex].unitPrice}
                        onChange={(e) => updateItem(selectedItemIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tax Amount:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.items[selectedItemIndex].tax}
                        onChange={(e) => updateItem(selectedItemIndex, 'tax', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Discount:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.items[selectedItemIndex].discount}
                        onChange={(e) => updateItem(selectedItemIndex, 'discount', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Total Price:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.items[selectedItemIndex].totalPrice}
                        onChange={(e) => updateItem(selectedItemIndex, 'totalPrice', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Description:</label>
                    <textarea
                      value={editedData.items[selectedItemIndex].description}
                      onChange={(e) => updateItem(selectedItemIndex, 'description', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Participant Assignment Section */}
                <div style={{ 
                  borderTop: '2px solid #ddd', 
                  paddingTop: '20px',
                  marginTop: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0 }}>Assign Participants</h4>
                    <button
                      type="button"
                      onClick={() => splitEvenly(selectedItemIndex)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9em'
                      }}
                    >
                      Split Evenly
                    </button>
                  </div>

                  {loadingUsers ? (
                    <p>Loading users...</p>
                  ) : users.length === 0 ? (
                    <p style={{ color: '#999' }}>No users available</p>
                  ) : (
                    <>
                      {/* User Selection Grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                        {users.map(user => {
                          const splits = itemSplits.get(selectedItemIndex) || []
                          const isSelected = splits.some(s => s.userId === user.id)
                          
                          return (
                            <div
                              key={user.id}
                              onClick={() => toggleItemParticipant(selectedItemIndex, user.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '20px',
                                border: isSelected ? '2px solid #4CAF50' : '1px solid #ccc',
                                backgroundColor: isSelected ? '#e8f5e9' : 'white',
                                cursor: 'pointer',
                                fontSize: '0.9em',
                                transition: 'all 0.2s',
                              }}
                            >
                              {user.name || user.email || user.id.substring(0, 8)}
                            </div>
                          )
                        })}
                      </div>

                      {/* Amount Inputs for Selected Participants */}
                      {(() => {
                        const splits = itemSplits.get(selectedItemIndex) || []
                        const totalSplit = getTotalSplitAmount(selectedItemIndex)
                        const itemTotal = editedData.items[selectedItemIndex].totalPrice
                        const remaining = itemTotal - totalSplit
                        
                        return splits.length > 0 ? (
                          <div style={{ 
                            backgroundColor: 'white', 
                            padding: '15px', 
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                          }}>
                            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                              Amount per participant:
                            </div>
                            
                            {splits.map(split => {
                              const user = users.find(u => u.id === split.userId)
                              return (
                                <div 
                                  key={split.userId}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    marginBottom: '10px',
                                    padding: '8px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '4px'
                                  }}
                                >
                                  <span style={{ flex: 1 }}>
                                    {user?.name || user?.email || split.userId.substring(0, 8)}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span>$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={split.amount}
                                      onChange={(e) => updateSplitAmount(
                                        selectedItemIndex, 
                                        split.userId, 
                                        parseFloat(e.target.value) || 0
                                      )}
                                      style={{ 
                                        width: '80px', 
                                        padding: '6px', 
                                        borderRadius: '4px', 
                                        border: '1px solid #ccc',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Summary */}
                            <div style={{ 
                              borderTop: '1px solid #ddd', 
                              paddingTop: '10px', 
                              marginTop: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.9em'
                            }}>
                              <span>Item Total: <strong>${itemTotal.toFixed(2)}</strong></span>
                              <span>Assigned: <strong>${totalSplit.toFixed(2)}</strong></span>
                              <span style={{ color: Math.abs(remaining) < 0.01 ? 'green' : 'red' }}>
                                Remaining: <strong>${remaining.toFixed(2)}</strong>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: '#999', fontStyle: 'italic' }}>
                            Click on participants above to assign them to this item
                          </p>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '40px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #ddd',
                textAlign: 'center',
                color: '#999'
              }}>
                <h3>Select an item</h3>
                <p>Click on an item from the list to view details and assign participants</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {editedData && responseData && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button
            onClick={handleConfirm}
            style={{
              padding: '15px 40px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Confirm & Save Bill
          </button>
        </div>
      )}
    </div>
  )
}
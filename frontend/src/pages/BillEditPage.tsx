import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useParams, useNavigate } from 'react-router-dom'

interface ParsedData {
  merchantName: string | null
  items: Array<{
    tempItemId: string
    name: string
    quantity: number
    unitPrice: number
    discount: number
    totalPrice: number
    description: string
  }>
  subtotal: number
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

export default function BillEditPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const [editedData, setEditedData] = useState<ParsedData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [itemSplits, setItemSplits] = useState<Map<number, ItemSplit[]>>(new Map())
  const [paidById, setPaidById] = useState<string | null>(null)
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  
  const { billId } = useParams<{ billId: string }>()
  const navigate = useNavigate()

  // 1. Fetch Bill Data and reconstruct state
  useEffect(() => {
    const fetchBill = async () => {
      if (!billId) return;
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please login first');
        navigate('/login');
        return;
      }

      try {
        const res = await fetch(`http://localhost:3000/bills/${billId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch bill');
        
        const data = await res.json();

        // Reconstruct Preview URL
        if (data.receipt?.imageUrl) {
          setPreviewUrl(data.receipt.imageUrl);
        }

        // Reconstruct Edited Data (handling Decimal strings from DB)
        const mappedEditedData: ParsedData = {
          merchantName: data.merchantName,
          subtotal: Number(data.subtotal),
          tax: Number(data.tax),
          totalDiscount: Number(data.totalDiscount),
          rounding: Number(data.rounding),
          totalAmount: Number(data.totalAmount),
          items: data.items.map((item: any) => ({
            tempItemId: item.id,
            name: item.name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            totalPrice: Number(item.totalPrice),
            description: item.description || '',
          }))
        };
        setEditedData(mappedEditedData);

        // Reconstruct Item Splits Map
        const newSplitsMap = new Map<number, ItemSplit[]>();
        data.items.forEach((item: any, index: number) => {
          const splits = data.splits
            .filter((s: any) => s.billItemId === item.id)
            .map((s: any) => ({ userId: s.userId, amount: Number(s.amount) }));
          newSplitsMap.set(index, splits);
        });
        setItemSplits(newSplitsMap);

        // Set Payer
        setPaidById(data.paidById);

        // Set ResponseData to satisfy handleConfirm check
        setResponseData({
          billId: data.id,
          parsedData: mappedEditedData,
        });

        // After we have the bill data, fetch the trip members
        // We get the tripId from the bill data itself
        if (data.tripId) {
          fetchUsers(data.tripId, session.access_token);
        }

      } catch (error) {
        console.error('Error fetching bill:', error);
        alert('Failed to load bill data');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId, navigate]);

  const fetchUsers = async (tripId: string, token: string) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`http://localhost:3000/trips/${tripId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.map((m: any) => m.user));
      }
    } catch (error) {
      console.error('Error fetching trip members:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedData['items'][0], value: string | number) => {
    if (editedData) {
      const newItems = [...editedData.items]
      newItems[index] = { ...newItems[index], [field]: value }
      setEditedData({ ...editedData, items: newItems })
    }
  }

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
  }

  const handleSelectSummary = () => {
    setSelectedItemIndex(null)
    setIsEditingSummary(true)
  }

  const handleConfirm = async () => {
    if (!responseData || !editedData) return
  
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
  
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
      title: editedData.merchantName || 'Updated Bill',
      merchantName: editedData.merchantName,
      bill: {
        subtotal: editedData.subtotal,
        tax: editedData.tax,
        totalDiscount: editedData.totalDiscount ?? 0,
        rounding: editedData.rounding,
        totalAmount: editedData.totalAmount,
      },
      items,
      participants,
      splits,
    }
  
    const res = await fetch(
      `http://localhost:3000/bills/${responseData.billId}/confirm`,
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
      alert('Bill updated successfully!');
      navigate(-1); // Go back to previous page (TripBillsPage)
    } else {
      const error = await res.json()
      console.error('Error:', error)
      alert('Failed to save bill')
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading bill data...</div>;
  if (!editedData) return <div style={{ padding: '20px' }}>Bill not found.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Edit Bill</h2>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>

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
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No image available</div>
            )}
          </div>

          {/* Summary Section */}
          <div 
            onClick={handleSelectSummary} 
            style={{ 
              cursor: 'pointer', 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: isEditingSummary ? '#e3f2fd' : '#f9f9f9', 
              borderRadius: '8px',
              border: isEditingSummary ? '2px solid #2196F3' : '1px solid transparent',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Bill Summary</h4>
            <div style={{ fontSize: '0.9em' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>${editedData.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Tax:</span>
                <span>${editedData.tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Discount:</span>
                <span>-${editedData.totalDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Rounding:</span>
                <span>${editedData.rounding.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #ccc', paddingTop: '5px', marginTop: '5px' }}>
                <span>Total:</span>
                <span>${editedData.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Items List */}
        <div style={{ flex: '0 0 300px', maxHeight: '650px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Who paid?</label>
            <select 
              value={paidById || ''} 
              onChange={(e) => setPaidById(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            >
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
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Detail Panel */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          {isEditingSummary ? (
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>Edit Bill Summary</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
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
                    <label>Tax:</label>
                    <input type="number" value={editedData.tax} onChange={(e) => setEditedData({...editedData, tax: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px' }} />
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
          ) : (selectedItemIndex !== null && editedData.items[selectedItemIndex]) ? (
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>Item Details</h3>
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
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Unit Price:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].unitPrice}
                      onChange={(e) => updateItem(selectedItemIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Discount:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].discount}
                      onChange={(e) => updateItem(selectedItemIndex, 'discount', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Total Price:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.items[selectedItemIndex].totalPrice}
                      onChange={(e) => updateItem(selectedItemIndex, 'totalPrice', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0 }}>Assign Participants</h4>
                  <button type="button" onClick={() => splitEvenly(selectedItemIndex)}>Split Evenly</button>
                </div>
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
                          fontSize: '0.9em'
                        }}
                      >
                        {user.name || user.email || user.id.substring(0, 8)}
                      </div>
                    )
                  })}
                </div>
                {/* Split inputs... */}
                {(itemSplits.get(selectedItemIndex) || []).map(split => {
                  const user = users.find(u => u.id === split.userId)
                  return (
                    <div key={split.userId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '8px', backgroundColor: '#eee', borderRadius: '4px' }}>
                      <span>{user?.name || user?.email}</span>
                      <input 
                        type="number" 
                        value={split.amount} 
                        onChange={(e) => updateSplitAmount(selectedItemIndex, split.userId, parseFloat(e.target.value) || 0)}
                        style={{ width: '80px' }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <h3>Select an item or the Summary to edit</h3>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={handleConfirm}
          style={{ padding: '15px 40px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}

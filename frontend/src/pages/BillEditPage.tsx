import { useState, useEffect } from 'react'
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

export default function BillEditPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const [editedData, setEditedData] = useState<ParsedData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [, setLoadingUsers] = useState(false)
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
        const res = await fetch(`${import.meta.env.BACKEND_URL}` + `/bills/${billId}`, {
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
          title: data.title,
          merchantName: data.merchantName,
          taxPercentage: Number(data.taxPercentage),
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
      const response = await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/members`, {
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
    setEditedData({
      ...editedData!,
      items: [...editedData!.items, newItem]
    });
  };
  
  const removeItem = (index: number) => {
    if (!editedData || !confirm('Remove this item?')) return;
    if (!editedData) return;
    const newItems = editedData!.items.filter((_, i) => i !== index);
    const newSplits = new Map<number, ItemSplit[]>();
    itemSplits.forEach((splits, key) => {
      if (key < index) {
        newSplits.set(key, splits);
      } else if (key > index) {
        newSplits.set(key - 1, splits);
      }
    });
  
    const newSubtotal = newItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const newTotalDiscount = newItems.reduce((sum, i) => sum + i.discount, 0);
    const taxableAmount = newSubtotal - newTotalDiscount;
    const newTaxAmount = taxableAmount * (editedData.taxPercentage / 100);

    setEditedData({
      ...editedData,
      items: newItems,
      subtotal: Number(newSubtotal.toFixed(2)),
      totalDiscount: Number(newTotalDiscount.toFixed(2)),
      tax: Number(newTaxAmount.toFixed(2)),
      totalAmount: Number((taxableAmount + newTaxAmount + editedData.rounding).toFixed(2))
    });
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

    // // 1. Calculate Item Total: (Qty * UnitPrice) - Discount + Tax
    // item.totalPrice = Number(((item.quantity * item.unitPrice) - item.discount + item.tax).toFixed(2));
    // newItems[index] = item;
  
    // // 2. Calculate Bill Totals
    // const newSubtotal = newItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    // const newTotalDiscount = newItems.reduce((sum, i) => sum + i.discount, 0);
    
    // // 3. Apply Tax (based on the new subtotal minus discounts)
    // const taxableAmount = newSubtotal - newTotalDiscount;
    // const newTaxAmount = taxableAmount * (editedData.taxPercentage / 100);
  
    // setEditedData({
    //   ...editedData,
    //   items: newItems,
    //   subtotal: Number(newSubtotal.toFixed(2)),
    //   totalDiscount: Number(newTotalDiscount.toFixed(2)),
    //   tax: Number(newTaxAmount.toFixed(2)),
    //   totalAmount: Number((taxableAmount + newTaxAmount + editedData.rounding).toFixed(2))
    // });
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
  }

  const handleSelectSummary = () => {
    setSelectedItemIndex(null)
    setIsEditingSummary(true)
  }

  // const recalculateBill = (currentData: ParsedData, newRate: number) => {
  //   let totalSubtotal = 0;
  //   let totalTaxPercentage = 0;
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
    items: ParsedData['items'], 
    taxRate: number, 
    rounding: number
  ) => {
    let billSubtotal = 0;
    let billTotalDiscount = 0;
    let billTotalTax = 0;
  
    const updatedItems = items.map(item => {
      // 1. Calculate Item Subtotal (Qty * Price - Discount)
      const itemSubtotal = (item.quantity * item.unitPrice) - item.discount;
      
      // 2. Calculate Item Tax based on the percentage
      const itemTax = itemSubtotal * (taxRate / 100);
      
      // 3. Calculate Item Total Price
      const itemTotalPrice = itemSubtotal + itemTax;
  
      // Accumulate Bill Totals
      billSubtotal += (item.quantity * item.unitPrice);
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
      tax: (item as any).tax ?? 0,
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
                  position: 'relative',
                }}
                onClick={() => handleSelectItem(index)}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: '#ff5252',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75em',
                    cursor: 'pointer',
                  }}
                >
                  X
                </button>

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

        {/* Right: Detail Panel */}
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
                        const newTax = parseFloat(e.target.value) || 0;
                        const results = recalculateItemAndBill(editedData.items, editedData.taxPercentage, newTax);
                        setEditedData({
                          ...editedData,
                          ...results
                        });
                      }} 
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
          ) : (selectedItemIndex !== null && editedData.items[selectedItemIndex]) ? (
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

              <div style={{ borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0 }}>Assign Participants</h4>
                  <button type="button" onClick={() => splitEvenly(selectedItemIndex)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8em' }}>Split Evenly</button>
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

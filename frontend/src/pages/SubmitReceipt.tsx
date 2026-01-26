import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

interface ParsedData {
  merchantName: string | null
  items: Array<{
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

type BillItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  description?: string
}

type Participant = {
  id: string
  displayName: string
}

type Split = {
  participantId: string
  itemId: string
  amount: number
}


export default function SubmitReceiptPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [responseData, setResponseData] = useState<ResponseData | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    
    // Create preview URL
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile))
    } else {
      setPreviewUrl(null)
    }
    
    // Clear previous response when new file is selected
    setResponseData(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

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

    try {
      const response = await fetch('http://localhost:3000/receipts/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setResponseData(data)
      } else {
        alert('Upload failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Upload failed')
    }

    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!responseData) return
  
    const {
      data: { session },
    } = await supabase.auth.getSession()
  
    if (!session) {
      alert('Please login first')
      return
    }
  
    const accessToken = session.access_token
  
    // Ensure each item has a stable ID
    const payload = {
      title: 'Uploaded Receipt',
      merchantName: responseData.parsedData.merchantName,
      items: responseData.parsedData.items.map(item => ({
        id: uuidv4(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        totalPrice: item.totalPrice,
        description: item.description ?? '',
      })),
      bill:{     
        subtotal: responseData.parsedData.subtotal,
        tax: responseData.parsedData.tax,
        totalDiscount: responseData.parsedData.totalDiscount ?? 0,
        rounding: responseData.parsedData.rounding,
        totalAmount: responseData.parsedData.totalAmount,
      },
      participants: [],
      splits: [],
    }
  
    const res = await fetch(
      `http://localhost:3000/bills/${responseData.billId}/confirm`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    )
  
    if (!res.ok) {
      alert('Failed to save bill')
      return
    }
  
    alert('Bill saved successfully!')
  }
  

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Submit Receipt</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginBottom: '20px' }}
        />
        <button disabled={loading} style={{ marginLeft: '10px' }}>
          {loading ? 'Uploading...' : 'Submit Receipt'}
        </button>
      </form>

      {previewUrl && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          {/* Left: Image Preview */}
          <div style={{ flex: '0 0 400px' }}>
            <h3>Image Preview</h3>
            <div
              style={{
                width: '400px',
                height: '600px',
                border: '2px solid #ccc',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
              }}
            >
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>

          {/* Right: Parsed Data */}
          <div style={{ flex: '1', minWidth: '400px' }}>
            <h3>Parsed Data</h3>
            {responseData ? (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <strong>Bill ID:</strong> {responseData.billId}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <strong>Merchant:</strong> {responseData.parsedData.merchantName || 'Unknown'}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <strong>Items:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {responseData.parsedData.items.map((item, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          padding: '12px', 
                          marginBottom: '10px', 
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {item.quantity}x {item.name}
                        </div>
                        {item.description && item.description !== 'No description' && (
                          <div style={{ 
                            fontSize: '0.9em', 
                            color: '#666', 
                            marginBottom: '5px',
                            whiteSpace: 'pre-line'
                          }}>
                            {item.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                          <span>Unit: RM{item.unitPrice.toFixed(2)}</span>
                          {item.discount > 0 && (
                            <span style={{ color: 'green' }}>Discount: -RM{item.discount.toFixed(2)}</span>
                          )}
                          <span style={{ fontWeight: 'bold' }}>Total: RM{item.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ 
                  borderTop: '2px solid #ccc', 
                  paddingTop: '15px',
                  fontSize: '1.1em'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Subtotal:</span>
                    <span>RM{responseData.parsedData.subtotal.toFixed(2)}</span>
                  </div>
                  {responseData.parsedData.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Tax & Service Charges:</span>
                      <span>RM{responseData.parsedData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {responseData.parsedData.totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'green' }}>
                      <span>Discount:</span>
                      <span>-RM{(responseData.parsedData.totalDiscount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  {responseData.parsedData.rounding !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Rounding:</span>
                      <span>RM{responseData.parsedData.rounding.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontWeight: 'bold',
                    fontSize: '1.2em',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '2px solid #333'
                  }}>
                    <span>Total Amount:</span>
                    <span>RM{responseData.parsedData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={!responseData}
                  style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  Confirm & Save Bill
                </button>
              </div>
            ) : (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #ddd',
                color: '#999',
                textAlign: 'center'
              }}>
                {loading ? 'Processing receipt...' : 'Submit the receipt to see parsed data'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
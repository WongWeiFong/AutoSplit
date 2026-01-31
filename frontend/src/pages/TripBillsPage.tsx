import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface Bill {
  id: string;
  title: string;
  merchantName: string;
  totalAmount: number;
  createdAt: string;
}

export default function TripBillsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`http://localhost:3000/trips/${tripId}/bills`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (res.ok) setBills(await res.json());
    setLoading(false);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Delete this bill?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`http://localhost:3000/bills/${billId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    fetchBills();
  };

  useEffect(() => { fetchBills(); }, [tripId]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Trip Bills</h1>
        <button 
          onClick={() => navigate(`/upload/${tripId}`)}
          style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          + Upload New Receipt
        </button>
      </div>

      {loading ? <p>Loading bills...</p> : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          {bills.length === 0 ? <p>No bills found for this trip.</p> : bills.map(bill => (
            <div key={bill.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{bill.title}</h3>
                <p style={{ margin: 0, color: '#666' }}>{bill.merchantName || 'Unknown Merchant'}</p>
                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>${Number(bill.totalAmount).toFixed(2)}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => navigate(`/bills/${bill.id}/edit`)}>View/Edit</button>
                <button onClick={() => handleDeleteBill(bill.id)} style={{ color: 'red' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
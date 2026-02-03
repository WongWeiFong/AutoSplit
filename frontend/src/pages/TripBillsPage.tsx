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

interface TripMember {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  }
}

export default function TripBillsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const token = session.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    const billsRes = await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/bills`, { headers });
    if (billsRes.ok) setBills(await billsRes.json());
    const balancesRes = await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/balances`, { headers });
    if (balancesRes.ok) setBalances(await balancesRes.json());
    const membersRes = await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/members`, { headers });
    if (membersRes.ok) setTripMembers(await membersRes.json());
    setLoading(false);

  }
  // const fetchBills = async () => {
  //   const { data: { session } } = await supabase.auth.getSession();
  //   const res = await fetch(`${import.meta.env.BACKEND_URL}/trips/${tripId}/bills`, {
  //     headers: { Authorization: `Bearer ${session?.access_token}` }
  //   });
  //   if (res.ok) setBills(await res.json());
  //   setLoading(false);
  // };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Delete this bill?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.BACKEND_URL}/bills/${billId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    fetchData();
  };

  useEffect(() => { fetchData(); }, [tripId]);

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

      <div className="balance-summary" style={{ padding: '15px', backgroundColor: '#f0f4f8', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Trip Balances</h3>
        {Object.entries(balances).map(([userId, amount]) => {
          const member = tripMembers.find(m => m.userId === userId);
          const name = member?.user?.name || member?.user?.email || "Unknown User";
          return (
            <div key={userId} style={{ color: amount >= 0 ? 'green' : 'red' }}>
              {name}: {amount >= 0 ? `is owed $${amount.toFixed(2)}` : `owes $${Math.abs(amount).toFixed(2)}`}
            </div>
          );
        })}
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
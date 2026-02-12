import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const API_URL = import.meta.env.VITE_BACKEND_URL;

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
  const [tripName, setTripName] = useState('');

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const token = session.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch trip details for the name
    const tripRes = await fetch(`${API_URL}/trips/${tripId}`, { headers });
    if (tripRes.ok) {
      const tripData = await tripRes.json();
      setTripName(tripData.tripName);
    }

    const billsRes = await fetch(`${API_URL}/trips/${tripId}/bills`, { headers });
    if (billsRes.ok) setBills(await billsRes.json());

    const balancesRes = await fetch(`${API_URL}/trips/${tripId}/balances`, { headers });
    if (balancesRes.ok) setBalances(await balancesRes.json());

    const membersRes = await fetch(`${API_URL}/trips/${tripId}/members`, { headers });
    if (membersRes.ok) setTripMembers(await membersRes.json());

    setLoading(false);
  }

  const handleDeleteBill = async (e: React.MouseEvent, billId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this bill? This affects all balances.')) return;

    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/bills/${billId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    fetchData();
  };

  useEffect(() => { fetchData(); }, [tripId]);

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/trips')} className="btn-ghost" style={{ paddingLeft: 0, marginBottom: '1rem' }}>
          &larr; Back to Trips
        </button>
        <div className="flex-between">
          <div>
            <h1>{tripName || 'Trip Details'}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Overview of expenses and balances</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate(`/trips/${tripId}/members`)}
              className="btn-outline"
            >
              Trip Members
            </button>
            <button
              onClick={() => navigate(`/upload/${tripId}`)}
              className="btn-secondary"
            >
              + Upload Bill
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Balances Section */}
        <div>
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Balances</h3>
            {Object.keys(balances).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No balances yet.</p>
            ) : (
              <div className="list-group" style={{ border: 'none' }}>
                {Object.entries(balances)
                  .sort(([, a], [, b]) => b - a) // Sort positive first
                  .map(([userId, amount]) => {
                    const member = tripMembers.find(m => m.userId === userId);
                    const name = member?.user?.name || member?.user?.email || "Unknown User";
                    const isPositive = amount >= 0;

                    return (
                      <div key={userId} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <span style={{ fontWeight: 500 }}>{name}</span>
                        <span style={{
                          color: isPositive ? 'var(--secondary)' : 'var(--danger)',
                          fontWeight: 'bold'
                        }}>
                          {isPositive ? `gets back $${amount.toFixed(2)}` : `owes $${Math.abs(amount).toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Bills Section */}
        <div style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '1rem' }}>Recent Bills</h3>
          {loading ? <p>Loading bills...</p> : (
            <div className="list-group">
              {bills.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No bills added yet.
                </div>
              ) : bills.map(bill => (
                <div
                  key={bill.id}
                  className="list-item clickable"
                  onClick={() => navigate(`/bills/${bill.id}/edit`)}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{bill.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {bill.merchantName || 'Unknown Merchant'} • {new Date(bill.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${Number(bill.totalAmount).toFixed(2)}</span>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => navigate(`/bills/${bill.id}/edit`)}
                    >
                      View
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={(e) => handleDeleteBill(e, bill.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_BACKEND_URL

interface Trip {
  id: string
  tripName: string
  createdBy: string
  createdAt: string
  _count?: {
    bills: number
  }
}

interface Bill {
  id: string
  title: string
  merchantName: string
  totalAmount: number
  createdAt: string
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [newTripName, setNewTripName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const navigate = useNavigate()

  // Get user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${API_URL}/trips`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    const data = await res.json()
    setTrips(data)
  }

  const handleCreate = async () => {
    if (!newTripName.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ tripName: newTripName })
    });
    setNewTripName('');
    fetchTrips();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip and all its data?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res =await fetch(`${API_URL}/trips/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (res.ok) {
      alert("Trip deleted successfully!"); // Notification
      fetchTrips();
    } else {
      const data = await res.json();
      alert(`Failed to delete trip: ${data.message || 'Unknown error'}`);
    }
    fetchTrips();
  };

  const handleUpdate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newName = prompt('Enter new trip name:');
    if (!newName) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/trips/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ tripName: newName })
    });
    fetchTrips();
  };

  return (
    <div className="container">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>My Trips</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your shared expenses</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => {
            supabase.auth.signOut().then(() => navigate('/login'));
          }} className="btn-outline">Sign Out</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', backgroundColor: '#f8fafc' }}>
        <div style={{ flex: 1 }}>
          <label>Start a new trip</label>
          <input
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            placeholder="e.g. Summer Vacation, Roommates 2024"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <span>+</span> Create Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          No trips yet. Create one to get started!
        </div>
      ) : (
        <div className="trip-grid">
          {trips.map(trip => (
            <div
              key={trip.id}
              className="card clickable trip-card"
              onClick={() => navigate(`/trips/${trip.id}`)}
            >
              <div>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{trip.tripName}</h3>
                  {trip._count && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      backgroundColor: 'var(--bg-secondary)', 
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {trip._count.bills} {trip._count.bills === 1 ? 'bill' : 'bills'}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>
                  Created on {new Date(trip.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/upload/${trip.id}`);
                  }}
                >
                  + Receipt
                </button>

                {trip.createdBy === currentUserId && (
                  <>
                    <button
                      className="btn-outline btn-sm"
                      onClick={(e) => handleUpdate(e, trip.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={(e) => handleDelete(e, trip.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

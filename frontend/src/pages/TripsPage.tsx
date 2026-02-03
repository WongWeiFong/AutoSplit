import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

interface Trip {
  id: string
  tripName: string
  createdAt: string
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
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('${import.meta.env.BACKEND_URL}/trips', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    const data = await res.json()
    setTrips(data)
  }

  const handleCreate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('${import.meta.env.BACKEND_URL}/trips', {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    fetchTrips();
  };

  const handleUpdate = async (id: string) => {
    const newName = prompt('Enter new trip name:');
    if (!newName) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.BACKEND_URL}` + `/trips/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}` 
      },
      body: JSON.stringify({ tripName: newName })
    });
    fetchTrips();
  };

  useEffect(() => { fetchTrips(); }, []);

  const fetchBills = async (tripId: string) => {
    setSelectedTrip(tripId)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(
      `${import.meta.env.BACKEND_URL}` + `/trips/${tripId}/bills`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    )

    const data = await res.json()
    setBills(data)
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>My Trips</h2>
      <div style={{ marginBottom: '20px' }}>
        <input 
          value={newTripName} 
          onChange={(e) => setNewTripName(e.target.value)} 
          placeholder="New Trip Name"
        />
        <button onClick={handleCreate}>Create Trip</button>
      </div>
      <ul>
        {trips.map(trip => (
          <div 
          key={trip.id} 
          onClick={() => navigate(`/trips/${trip.id}`)} // Redirect to the bills list
          style={{ cursor: 'pointer', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}
        >
          <h3>{trip.tripName}</h3>
            {/* NEW BUTTON: Redirect to upload with tripId */}
          <button 
            onClick={() => navigate(`/upload/${trip.id}`)}
            style={{ backgroundColor: '#2196F3', color: 'white', marginRight: '10px' }}
          >
            Add Receipt to Trip
          </button>
            <button onClick={() => handleUpdate(trip.id)}>Update</button>
            <button onClick={() => handleDelete(trip.id)}>Delete</button>
          </div>
        ))}
      </ul>

      {selectedTrip && (
        <>
          <h3>Bills</h3>
          <ul>
            {bills.map(bill => (
              <li key={bill.id}>
                <strong>{bill.title}</strong> – {bill.merchantName}
                <br />
                RM {bill.totalAmount.toFixed(2)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

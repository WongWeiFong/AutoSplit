import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_BACKEND_URL
const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default function TripMembersPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true);

    const token = await getToken();
    if (!tripId || !token) return;
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/trips/${tripId}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      },
    );

    setLoading(false);

    if (!res.ok) {
      alert('Failed to send invite');
      return;
    }

    alert('Invite sent!');
    setEmail('');
  };

  useEffect(() => {
    if (tripId) {
      fetchTripDetails(tripId);
      fetchMembers(tripId);
      getCurrentUser();
    }
  }, [tripId]);

  const fetchTripDetails = async (tripId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOwnerId(data.createdBy); // Set the owner ID
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
    }
  };

  const fetchMembers = async (tripId: string) => {
    const token = await getToken();
    if (!tripId || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trips/${tripId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const removeMember = async (memberUserId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    const token = await getToken();
    if (!tripId || !token) return;
    await fetch(`${API_URL}/trips/${tripId}/members/${memberUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    fetchMembers(tripId!);
  };

  const transferOwnership = async (newOwnerId: string) => {
    if (!window.confirm("Are you sure you want to transfer ownership? You will lose owner privileges.")) return;
    const token = await getToken();
    if (!tripId || !token) return;
    await fetch(`${API_URL}/trips/${tripId}/transfer-ownership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newOwnerId }),
    });

    fetchMembers(tripId!);
  };

  // Find owner
  const ownerMember = members.find(m => m.user.id === ownerId);
  // Filter normal members
  const otherMembers = members.filter(m => m.user.id !== ownerId);
  const isOwner = currentUserId === ownerId;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate(-1)} className="btn-ghost" style={{ paddingLeft: 0, marginBottom: '1rem' }}>
        &larr; Back to Trip
      </button>

      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2>Trip Members</h2>
      </div>

      {isOwner && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-surface)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Invite New Member</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={invite} disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Members List</h3>

        {loading && members.length === 0 ? <p>Loading...</p> : (
          <div className="list-group">
            {/* Owner */}
            {ownerMember && (
              <div className="list-item" style={{ backgroundColor: 'var(--primary-light)' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{ownerMember.user.name || 'Unknown Name'} <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Owner</span></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ownerMember.user.email}</div>
                </div>
              </div>
            )}

            {/* Other Members */}
            {otherMembers.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No other members yet.</div>
            ) : (
              otherMembers.map((member) => (
                <div key={member.id} className="list-item">
                  <div>
                    <div style={{ fontWeight: 500 }}>{member.user.name || 'Unknown Name'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{member.user.email}</div>
                  </div>

                  {isOwner && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-outline btn-sm"
                        onClick={() => transferOwnership(member.user.id)}
                        title="Make Owner"
                      >
                        Promote
                      </button>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => removeMember(member.user.id)}
                        title="Remove Member"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
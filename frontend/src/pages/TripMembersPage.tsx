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
        // setMembers(data.members);
        // setOwnerId(data.ownerId);
        // setCurrentUserId(data.currentUserId);
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

  // const sortedMembers = [...members].sort((a, b) => {
  //   if (a.user.id === ownerId) return -1;
  //   if (b.user.id === ownerId) return 1;
  //   return 0;
  // });

  // Find owner
  const ownerMember = members.find(m => m.user.id === ownerId);
  // Filter normal members
  const otherMembers = members.filter(m => m.user.id !== ownerId);
  const isOwner = currentUserId === ownerId;
  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        &larr; Back
      </button>
      <h2>Trip Members</h2>

      {loading && <p>Loading...</p>}

      {isOwner && (
        <div style={{ marginBottom: 20, padding: 15, border: '1px solid #eee', borderRadius: 8 }}>
          <h3>Invite Member</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="email"
              placeholder="Enter email to invite"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 8, flex: 1 }}
            />
            <button onClick={invite} disabled={loading} style={{ padding: '8px 16px' }}>
              Send Invite
            </button>
          </div>
        </div>
      )}

      {/* Display Owner at the very top */}
      {ownerMember && (
        <div style={{ marginBottom: 20, padding: 15, border: '2px solid #ffd700', borderRadius: 8, background: '#fff9c4' }}>
          <h3 style={{ marginTop: 0 }}>Owner</h3>
          <div>
            <strong>{ownerMember.user.name}</strong>
            <div>{ownerMember.user.email}</div>
          </div>
        </div>
      )}

      {/* Display other members */}
      <h3>Members</h3>
      {otherMembers.length === 0 && <p>No other members yet.</p>}
      {otherMembers.map((member) => {
        return (
          <div
            key={member.id}
            style={{
              border: "1px solid #ccc",
              padding: 12,
              marginBottom: 10,
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{member.user.name}</strong>
              <div>{member.user.email}</div>
            </div>

            {isOwner && (
              <div>
                <button
                  onClick={() => transferOwnership(member.user.id)}
                  style={{ marginRight: 10 }}
                >
                  Make Owner
                </button>

                <button
                  onClick={() => removeMember(member.user.id)}
                  style={{ color: "red" }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
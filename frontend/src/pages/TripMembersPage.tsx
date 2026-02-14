
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Crown, Mail, Shield, User } from 'lucide-react';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_BACKEND_URL;

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
  const [tripName, setTripName] = useState('');
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
        setOwnerId(data.createdBy);
        setTripName(data.tripName);
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

  const ownerMember = members.find(m => m.user.id === ownerId);
  const otherMembers = members.filter(m => m.user.id !== ownerId);
  const isOwner = currentUserId === ownerId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 group transition-colors"
        >
          <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Trip Details
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tripName || 'Trip'} Members</h2>
              <p className="text-sm text-gray-500 mt-1">Manage who is part of this trip.</p>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full">
              {members.length} Member(s)
            </span>
          </div>

          <div className="p-6">
            {/* Invite Section */}
            {isOwner && (
              <div className="mb-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                <h3 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
                  <UserPlus size={18} />
                  Invite New Member
                </h3>
                <p className="text-sm text-indigo-700 mb-4">
                  Send an email invitation to add someone to this trip.
                </p>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="friend@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 block w-full rounded-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                    onClick={invite}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Members</h3>

              {loading && members.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Loading members...</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Owner */}
                  {ownerMember && (
                    <div className="flex items-center justify-between py-4 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 flex items-center justify-center text-yellow-700 font-bold shadow-sm">
                          <Crown size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {ownerMember.user.name || ownerMember.user.email.split('@')[0]}
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full border border-yellow-200 font-medium">Owner</span>
                          </div>
                          <div className="text-sm text-gray-500">{ownerMember.user.email}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Members */}
                  {otherMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 italic">No other members yet. Invite someone!</div>
                  ) : (
                    otherMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-4 group hover:bg-gray-50 rounded-lg px-2 transition-colors -mx-2">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-bold">
                            {member.user.name ? member.user.name.charAt(0).toUpperCase() : <User size={18} />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.user.name || member.user.email.split('@')[0]}
                            </div>
                            <div className="text-sm text-gray-500">{member.user.email}</div>
                          </div>
                        </div>

                        {isOwner && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              onClick={() => transferOwnership(member.user.id)}
                              title="Make Owner"
                            >
                              <Shield size={18} />
                            </button>
                            <button
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => removeMember(member.user.id)}
                              title="Remove Member"
                            >
                              <Trash2 size={18} />
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
        </div>
      </main>
    </div>
  );
}
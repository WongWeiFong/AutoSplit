import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { User, Mail, Calendar, Pencil, Check, X, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setName(data.name || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const token = await getToken();
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Failed to update profile.');
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setEditing(false);
    setError(null);
  };

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 group transition-colors"
          >
            <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header banner */}
            <div className="h-28 bg-gradient-to-r from-indigo-500 to-purple-600" />

            {/* Avatar + name */}
            <div className="px-8 pb-8">
              <div className="-mt-14 mb-4 flex items-end justify-between">
                <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-white shadow-md flex items-center justify-center text-indigo-700 font-bold text-3xl">
                  {initials}
                </div>
              </div>

              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <Check size={16} /> Profile updated successfully.
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Name field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                    <User size={15} /> Display Name
                  </label>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex-1 rounded-lg border border-indigo-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? '...' : <Check size={16} />}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="border border-gray-200 text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                      <span className="text-gray-900 font-medium">{profile?.name || 'No name set'}</span>
                      <button
                        onClick={() => setEditing(true)}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Email field (read-only) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                    <Mail size={15} /> Email Address
                  </label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 text-gray-900">
                    {profile?.email}
                    <span className="ml-2 text-xs text-gray-400">(managed by sign-in provider)</span>
                  </div>
                </div>

                {/* Member since */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1.5">
                    <Calendar size={15} /> Member Since
                  </label>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 text-gray-900">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
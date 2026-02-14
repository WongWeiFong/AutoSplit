
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, Edit2, MapPin, Receipt, ArrowRight, Loader2, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_BACKEND_URL;

interface Trip {
  id: string;
  tripName: string;
  createdBy: string;
  createdAt: string;
  _count?: {
    bills: number;
  };
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTripName, setNewTripName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  // Get user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${API_URL}/trips`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setTrips(data);
    }
    setLoading(false);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    setShowCreateModal(false);
    fetchTrips();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip and all its data?')) return;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_URL}/trips/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });

    if (res.ok) {
      fetchTrips();
    } else {
      const data = await res.json();
      alert(`Failed to delete trip: ${data.message || 'Unknown error'}`);
    }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Trips</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your shared expenses and track spending.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Trip
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl h-48 border border-gray-200 shadow-sm"></div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          // Empty State
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <MapPin className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new trip.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                New Trip
              </button>
            </div>
          </div>
        ) : (
          // Trips Grid
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <MapPin size={20} />
                    </div>
                    {trip.createdBy === currentUserId && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"
                          onClick={(e) => handleUpdate(e, trip.id)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                          onClick={(e) => handleDelete(e, trip.id)}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{trip.tripName}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Calendar size={14} className="mr-1.5" />
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-2 flex items-center justify-between">
                  <div className="flex items-center text-sm font-medium text-gray-600">
                    <Receipt size={16} className="mr-1.5 text-gray-400" />
                    {trip._count?.bills || 0} Bills
                  </div>

                  <span className="text-indigo-600 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                    View Details <ArrowRight size={16} className="ml-1" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowCreateModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 animate-fade-in">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Plus className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Create New Trip
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Give your trip a name to get started. You can add members and bills later.
                    </p>
                    <form onSubmit={handleCreate} className="mt-4">
                      <input
                        type="text"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border"
                        placeholder="e.g. Summer Vacation, Roommates 2024"
                        value={newTripName}
                        onChange={(e) => setNewTripName(e.target.value)}
                        autoFocus
                      />
                    </form>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCreate}
                >
                  Create Trip
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

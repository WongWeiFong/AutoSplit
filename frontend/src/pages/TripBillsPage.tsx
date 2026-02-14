
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  Plus,
  Users,
  Receipt,
  Trash2,
  ArrowLeft,
  DollarSign,
  Calendar,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import Navbar from '../components/Navbar';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb / Back Navigation */}
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 group transition-colors"
        >
          <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Trips
        </button>

        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{tripName || 'Trip Details'}</h1>
            <p className="mt-1 text-gray-500 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Active Trip
              </span>
              <span className="text-gray-300">•</span>
              <span>{tripMembers.length} Member(s)</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/trips/${tripId}/members`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Users className="mr-2 h-4 w-4 text-gray-500" />
              Members
            </button>
            <button
              onClick={() => navigate(`/upload/${tripId}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Balances & Stats */}
          <div className="lg:col-span-1 space-y-6">

            {/* Balances Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign size={18} className="text-gray-400" />
                  Balances
                </h3>
              </div>

              <div className="p-0">
                {Object.keys(balances).length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No balances calculated yet. Add some bills!
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {Object.entries(balances)
                      .sort(([, a], [, b]) => b - a) // Sort positive first
                      .map(([userId, amount]) => {
                        const member = tripMembers.find(m => m.userId === userId);
                        const name = member?.user?.name || member?.user?.email || "Unknown User";
                        const isPositive = amount >= 0;
                        const isZero = Math.abs(amount) < 0.01;

                        return (
                          <div key={userId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]" title={name}>{name}</span>
                            </div>

                            <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                              {isZero ? (
                                <span className="text-gray-400">Settled</span>
                              ) : (
                                isPositive ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
              <h4 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
                <CreditCard size={16} />
                Settle Up
              </h4>
              <p className="text-sm text-indigo-700 mb-4">
                Balances update automatically. When someone pays you back, record a "Payment" bill to settle up.
              </p>
              <button
                onClick={() => navigate(`/upload/${tripId}`)}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-800 hover:underline"
              >
                Record a payment &rarr;
              </button>
            </div>
          </div>

          {/* Right Column: Bills List */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Receipt size={18} className="text-gray-400" />
              Recent Expenses
            </h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>)}
              </div>
            ) : bills.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No expenses yet</h3>
                <p className="text-gray-500 mb-6">Start by adding a bill or scanning a receipt.</p>
                <button
                  onClick={() => navigate(`/upload/${tripId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Expense
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bills.map(bill => (
                  <div
                    key={bill.id}
                    onClick={() => navigate(`/bills/${bill.id}/edit`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                        {/* Icon based on category or first letter */}
                        {bill.title ? bill.title.charAt(0).toUpperCase() : 'B'}
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{bill.title}</h4>
                        <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                          <span className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {new Date(bill.createdAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{bill.merchantName || 'Unknown Merchant'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="font-bold text-lg text-gray-900">
                        ${Number(bill.totalAmount).toFixed(2)}
                      </span>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteBill(e, bill.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight size={20} className="text-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
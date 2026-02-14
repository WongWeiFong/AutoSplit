import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, CheckCircle, XCircle, Home } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function accept() {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const { data: session } = await supabase.auth.getSession();

        if (!session.session) {
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.href, // This handles the redirect back.
            },
          });
          return;
        }

        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/invites/accept/${token}`,
          {
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          },
        );

        if (!res.ok) {
          const err = await res.json();
          setError(err.message || 'Invite invalid or expired');
          return;
        }

        setSuccess('Successfully joined the trip!');
        setTimeout(() => navigate('/trips'), 2000);
      } catch (err) {
        console.error(err);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      accept();
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">

        {loading && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Joining Trip...</h2>
            <p className="text-gray-500">Please wait while we process your invitation.</p>
          </div>
        )}

        {!loading && success && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-pulse">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
            <p className="text-gray-500 mb-6">{success}</p>
            <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
              <XCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Couldn't Join Trip</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/trips')}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Home size={16} className="mr-2" />
              Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
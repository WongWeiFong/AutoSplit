import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

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

        // If not logged in, force Google login
        if (!session.session) {
          // Store the invite link to redirect back after login? 
          // Ideally the auth flow should handle this, but for now we just redirect to login
          // or start OAuth flow.
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.href,
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
        setTimeout(() => navigate('/trips'), 2000); // Redirect after success
      } catch (err) {
        console.error(err);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      accept();
    }
  }, [token, navigate]);

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Joining Trip...</h2>

        {loading && <p>Processing your invitation...</p>}

        {error && (
          <div style={{ color: 'var(--danger)', marginTop: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>Error</p>
            <p>{error}</p>
            <button className="btn-outline" onClick={() => navigate('/trips')} style={{ marginTop: '1rem' }}>
              Go to Home
            </button>
          </div>
        )}

        {success && (
          <div style={{ color: 'var(--secondary)', marginTop: '1rem' }}>
            <p style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Success!</p>
            <p>{success}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Redirecting you...</p>
          </div>
        )}
      </div>
    </div>
  );
}
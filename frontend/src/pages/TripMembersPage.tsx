import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useParams } from 'react-router-dom';

export default function TripMembersPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const invite = async () => {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

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

  return (
    <div>
      <h3>Invite Member</h3>

      <input
        type="email"
        placeholder="user@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <button onClick={invite} disabled={loading || !email}>
        Invite
      </button>
    </div>
  );
}

import {  useState  } from 'react';
import api from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.auth.login({ email, password });
      navigate('/Dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input type="email" className="bg-slate-800 border-slate-700 text-slate-200" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <Input type="password" className="bg-slate-800 border-slate-700 text-slate-200" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

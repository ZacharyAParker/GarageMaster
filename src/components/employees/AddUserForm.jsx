import {  useMemo, useState  } from 'react';
import api from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, KeyRound, RefreshCw, UserPlus, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { POSITIONS, POSITION_LABELS } from '@/lib/constants';

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Administrator' },
];

/** Generate a random temporary password (characters chosen to avoid look-alikes). */
function generateTempPassword(length = 12) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i += 1) arr[i] = Math.floor(Math.random() * 4294967296);
  }
  return Array.from(arr, (n) => charset[n % charset.length]).join('');
}

/** Parse a comma-separated string into a clean, deduped array of tags. */
function parseTags(value) {
  const seen = new Set();
  return String(value || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function AddUserForm({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    position: 'mechanic',
    role: 'staff',
    phone: '',
    specialties: '',
  });
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { email, password, generated }

  // Safe user listing (no credential material) for client-side email uniqueness check.
  const { data: existingUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.auth.listUsers(),
  });

  const emailTaken = useMemo(() => {
    const email = form.email.trim().toLowerCase();
    if (!email) return false;
    return existingUsers.some((u) => (u.email || '').toLowerCase() === email);
  }, [form.email, existingUsers]);

  const mutation = useMutation({
    // adminCreateUser only accepts core account fields; phone/specialties ride along
    // through adminUpdateUser immediately after creation.
    mutationFn: async ({ payload, extras }) => {
      const user = await api.auth.adminCreateUser(payload);
      if (Object.keys(extras).length > 0) {
        try {
          await api.auth.adminUpdateUser({ userId: user.id, updates: extras });
        } catch (err) {
          console.warn('Could not save profile extras for new user:', err);
        }
      }
      return user;
    },
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreated({
        email: user.email,
        password: variables?._tempPassword,
        generated: Boolean(variables?._generated),
      });
    },
    onError: (err) => setError(err?.message || 'Failed to add user'),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    const email = form.email.trim();
    if (emailTaken) {
      setError('A user with this email already exists.');
      return;
    }
    let password = form.password;
    let generated = false;
    if (!password) {
      password = generateTempPassword();
      generated = true;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters (or leave blank to auto-generate one).');
      return;
    }
    const extras = {};
    if (form.phone.trim()) extras.phone = form.phone.trim();
    const specialties = parseTags(form.specialties);
    if (specialties.length > 0) extras.specialties = specialties;
    mutation.mutate({
      payload: {
        full_name: form.full_name.trim(),
        email,
        password,
        role: form.role,
        position: form.position,
      },
      extras,
      _tempPassword: password,
      _generated: generated,
    });
  };

  // ---- Success state: show the one-time credentials ----
  if (created) {
    return (
      <Card className="bg-slate-900 border-emerald-800">
        <CardHeader className="border-b border-slate-800 flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            User Created
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg space-y-3">
            <p className="text-sm text-emerald-300 font-medium">Share these sign-in credentials with the new user now - they will not be shown again.</p>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-slate-200 font-mono">{created.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Temporary password {created.generated ? '(auto-generated)' : ''}</p>
              <div className="flex items-center gap-2">
                <code className="text-orange-300 font-mono text-lg tracking-wide">{created.password}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300"
                  onClick={() => navigator.clipboard?.writeText(created.password)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">The user will be asked to set a new password the first time they sign in with this temporary password.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800 flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-orange-500" />
          Add User
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Full Name</Label>
              <Input
                className="bg-slate-800 border-slate-700 text-slate-200"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Alex Rivera"
                required
              />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                className={`bg-slate-800 border-slate-700 text-slate-200 ${emailTaken ? 'border-red-600 focus-visible:ring-red-600' : ''}`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
              {emailTaken && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This email is already in use.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Position</Label>
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select position..." />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {POSITION_LABELS[p] || p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.role === 'admin' && (
                <p className="text-xs text-orange-400 mt-1">Administrators can manage users, settings, and data.</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Phone</Label>
            <Input
              type="tel"
              className="bg-slate-800 border-slate-700 text-slate-200"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label className="text-slate-300">
              Temporary Password <span className="text-slate-500">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                className="bg-slate-800 border-slate-700 text-slate-200 font-mono"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to auto-generate"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                onClick={() => setForm({ ...form, password: generateTempPassword() })}
                title="Generate a random temporary password"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              The password is shown once after the user is created.
            </p>
          </div>

          <div>
            <Label className="text-slate-300">Specialties</Label>
            <Input
              className="bg-slate-800 border-slate-700 text-slate-200"
              value={form.specialties}
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              placeholder="Comma-separated, e.g. engine, brakes, diagnostics"
            />
            {parseTags(form.specialties).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parseTags(form.specialties).map((tag) => (
                  <Badge key={tag} className="bg-orange-900/40 text-orange-300 border-orange-800">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || emailTaken}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
            >
              {mutation.isPending ? 'Creating...' : 'Add User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

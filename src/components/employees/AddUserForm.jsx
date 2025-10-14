import React, { useState } from 'react';
import api from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const positions = ['mechanic', 'manager', 'service_advisor', 'parts_specialist', 'admin', 'customer'];

export default function AddUserForm({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', position: 'mechanic', role: 'mechanic' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.auth.adminCreateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose?.();
    },
    onError: (err) => setError(err?.message || 'Failed to add user'),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800 flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-slate-100">Add User</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-300">Full Name</Label>
            <Input className="bg-slate-800 border-slate-700 text-slate-200" value={form.full_name} onChange={(e)=>setForm({...form, full_name: e.target.value})} required />
          </div>
          <div>
            <Label className="text-slate-300">Email</Label>
            <Input type="email" className="bg-slate-800 border-slate-700 text-slate-200" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} required />
          </div>
          <div>
            <Label className="text-slate-300">Password</Label>
            <Input type="password" className="bg-slate-800 border-slate-700 text-slate-200" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} required minLength={8} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Role</Label>
              <Select value={form.role} onValueChange={(v)=>setForm({...form, role: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Position</Label>
              <Select value={form.position} onValueChange={(v)=>setForm({...form, position: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full">Add User</Button>
        </form>
      </CardContent>
    </Card>
  );
}

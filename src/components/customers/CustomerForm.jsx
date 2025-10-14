import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload } from "lucide-react";

export default function CustomerForm({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(customer || {
    full_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    preferred_contact: "email",
    customer_since: new Date().toISOString().split('T')[0],
    status: "active",
    avatar_url: ""
  });

  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (customer) {
  return api.entities.Customer.update(customer.id, data);
      }
  return api.entities.Customer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
  const { file_url } = await api.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, avatar_url: file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {formData.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <label htmlFor="avatar-upload">
                <Button type="button" size="sm" variant="outline" disabled={uploading} className="bg-slate-800 border-slate-700 text-slate-300" onClick={() => document.getElementById('avatar-upload').click()}>
                  <Upload className="w-3 h-3 mr-1" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name *</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Phone *</Label>
              <Input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Preferred Contact Method</Label>
              <Select value={formData.preferred_contact} onValueChange={(value) => setFormData({ ...formData, preferred_contact: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Customer Since</Label>
              <Input
                type="date"
                value={formData.customer_since}
                onChange={(e) => setFormData({ ...formData, customer_since: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Internal Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={3}
              placeholder="Add any internal notes about this customer..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
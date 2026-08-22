
import React, { useEffect, useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, User, Mail, Phone, Lock, LogOut, KeyRound, Store, Database,
  CheckCircle2, AlertCircle, Info,
} from "lucide-react";
import { POSITION_LABELS } from "@/lib/constants";
import DataManagement from "@/components/settings/DataManagement";

const getRoleDisplay = (role) => {
  const roleMap = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'mechanic': 'Mechanic',
    'service_advisor': 'Service Advisor',
    'parts_specialist': 'Parts Specialist',
    'staff': 'Staff',
    'customer': 'Customer'
  };
  return roleMap[role] || role || 'Staff';
};

// ---------------- Profile Tab ----------------

function ProfileTab({ currentUser }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar_url: ""
  });

  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || "",
        phone: currentUser.phone || "",
        avatar_url: currentUser.avatar_url || ""
      });
    }
  }, [currentUser]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (error) {
      alert("Failed to upload image");
    }
    setIsSaving(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.auth.updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        avatar_url: formData.avatar_url
      });

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update profile. Please try again.");
    }
    setIsSaving(false);
  };

  const handleLogout = () => {
    api.auth.logout();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-100">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-slate-800"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center border-4 border-slate-800">
                      <span className="text-white font-bold text-3xl">
                        {currentUser.full_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <label htmlFor="avatar-upload">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      onClick={() => document.getElementById('avatar-upload').click()}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      {isSaving ? 'Uploading...' : 'Change Photo'}
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

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">{currentUser.full_name}</h3>
                  <p className="text-slate-400 text-sm">{getRoleDisplay(currentUser.role)}</p>
                  <p className="text-slate-500 text-xs mt-1">{currentUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    required
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-200"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={currentUser.email || ""}
                    disabled
                    className="bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500">Email cannot be changed. Contact your administrator if needed.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-200"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Employment Details - Only show for non-customer roles */}
        {currentUser.role !== 'customer' && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-100">Employment Details</h3>
                <p className="text-sm text-slate-400">
                  Information such as specialties, certifications, hourly rate, and shift schedules
                  can only be modified by administrators through the Employee Management page.
                </p>
                <p className="text-xs text-slate-500">
                  Contact your manager if you need to update your employment information.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout Button */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40 hover:text-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Security Tab ----------------

function SecurityTab({ currentUser }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => api.auth.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setSuccess(true);
      setPw({ current: "", next: "", confirm: "" });
      setError("");
    },
    onError: (err) => {
      setSuccess(false);
      setError(err?.message || "Failed to change password");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!pw.current) {
      setError("Enter your current password.");
      return;
    }
    if ((pw.next || "").length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setError("New passwords do not match.");
      return;
    }
    mutation.mutate({ currentPassword: pw.current, newPassword: pw.next });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-500" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-slate-300">Current Password</Label>
                <Input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">New Password</Label>
                <Input
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Confirm New Password</Label>
                <Input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  className={`bg-slate-800 border-slate-700 text-slate-200 ${pw.confirm && pw.next !== pw.confirm ? "border-red-700 focus-visible:ring-red-700" : ""}`}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Password changed successfully.
                </div>
              )}

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
              >
                {mutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-500" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-slate-200 break-all">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-slate-200">{getRoleDisplay(currentUser.role)}</p>
            </div>
            {currentUser.position && (
              <div>
                <p className="text-xs text-slate-500">Position</p>
                <p className="text-slate-200">{POSITION_LABELS[currentUser.position] || currentUser.position}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Member Since</p>
              <p className="text-slate-200">
                {currentUser.created_date ? new Date(currentUser.created_date).toLocaleDateString() : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Shop Settings Tab (admin only) ----------------

function ShopSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get()
  });

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settings && !form) {
      // tax_rate is stored as a decimal (e.g. 0.0825) but edited as a percent (8.25)
      setForm({
        shop_name: settings.shop_name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        tax_percent: settings.tax_rate != null ? String(parseFloat((settings.tax_rate * 100).toFixed(4))) : "",
        default_labor_rate: settings.default_labor_rate != null ? String(settings.default_labor_rate) : ""
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (updates) => api.settings.set(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 3500);
    },
    onError: (err) => setError(err?.message || "Failed to save shop settings"),
  });

  const handleSave = (e) => {
    e.preventDefault();
    const taxPercent = parseFloat(form.tax_percent);
    const laborRate = parseFloat(form.default_labor_rate);
    saveMutation.mutate({
      shop_name: form.shop_name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      tax_rate: Number.isFinite(taxPercent) ? taxPercent / 100 : 0,
      default_labor_rate: Number.isFinite(laborRate) ? laborRate : 0,
    });
  };

  if (isLoading || !form) {
    return (
      <div className="mt-4 p-6 text-slate-500 text-sm">Loading shop settings...</div>
    );
  }

  return (
    <div className="mt-4 max-w-3xl">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            Shop Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Shop Name</Label>
                <Input
                  required
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="GarageMaster Shop"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="123 Main St, Anytown, USA"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="shop@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.tax_percent}
                  onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="8.25"
                />
                <p className="text-xs text-slate-500">Entered as a percent - saved internally as a decimal.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Default Labor Rate ($/hr)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.default_labor_rate}
                  onChange={(e) => setForm({ ...form, default_labor_rate: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="85"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {saved && (
              <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Shop settings saved.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Shop Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------- Page ----------------

export default function Settings() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Account Settings</h1>
        <p className="text-slate-400 mt-1">Manage your personal information and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-slate-800 border border-slate-700 text-slate-400 h-auto p-1">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-orange-400 text-slate-400 px-4 py-2"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-orange-400 text-slate-400 px-4 py-2"
          >
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="shop"
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-orange-400 text-slate-400 px-4 py-2"
            >
              <Store className="w-4 h-4 mr-2" />
              Shop
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-orange-400 text-slate-400 px-4 py-2"
            >
              <Database className="w-4 h-4 mr-2" />
              Data
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab currentUser={currentUser} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="shop">
            <ShopSettings />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="data">
            <div className="mt-4">
              <DataManagement />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

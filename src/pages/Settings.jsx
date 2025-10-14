
import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, User, Mail, Phone, Lock, LogOut } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const [formData, setFormData] = useState({
    full_name: "",
    email: "", // Added email to formData
    phone: "",
    avatar_url: ""
  });

  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || "",
        email: currentUser.email || "", // Populate email from currentUser
        phone: currentUser.phone || "",
        avatar_url: currentUser.avatar_url || ""
      });
    }
  }, [currentUser]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true); // Changed from setUploading to setIsSaving
    try {
  const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url })); // Used functional update
    } catch (error) {
      alert("Failed to upload image");
    }
    setIsSaving(false); // Changed from setUploading to setIsSaving
  };

  const handleSave = async (e) => { // New handleSave function replacing handleSubmit and updateMutation
    e.preventDefault();
    setIsSaving(true);
    try {
  // Update user profile using api.auth.updateMe for current user
  await api.auth.updateMe({
        full_name: formData.full_name, // Include full_name in updateMe
        phone: formData.phone,
        avatar_url: formData.avatar_url
      });
      
  // Note: email update is not implemented in self-hosted auth
      // via updateMe for the current user in this context.
      // If email changes are needed, they typically go through a separate flow (e.g., email verification).
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
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

  const getRoleDisplay = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'mechanic': 'Mechanic',
      'service_advisor': 'Service Advisor',
      'parts_specialist': 'Parts Specialist',
      'customer': 'Customer' // Added customer role
    };
    return roleMap[role] || role;
  };

  if (!currentUser) {
    return <div className="p-6 bg-slate-950 min-h-screen">
      <p className="text-slate-400">Loading...</p>
    </div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Account Settings</h1>
        <p className="text-slate-400 mt-1">Manage your personal information and preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-100">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-6"> {/* Changed onSubmit to handleSave */}
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
                        disabled={isSaving} // Changed to isSaving
                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        onClick={() => document.getElementById('avatar-upload').click()}
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        {isSaving ? 'Uploading...' : 'Change Photo'} {/* Changed to isSaving */}
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
                      value={formData.email} // Use formData.email
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
                    disabled={isSaving} // Changed to isSaving
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'} {/* Changed to isSaving */}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Account Info Card */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-slate-100">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-slate-200">{getRoleDisplay(currentUser.role)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Member Since</p>
                <p className="text-slate-200">
                  {new Date(currentUser.created_date).toLocaleDateString()}
                </p>
              </div>
              {currentUser.level && (
                <div>
                  <p className="text-xs text-slate-500">Level</p>
                  <p className="text-slate-200">Level {currentUser.level}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* HR Info Note - Only show for non-customer roles */}
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
    </div>
  );
}

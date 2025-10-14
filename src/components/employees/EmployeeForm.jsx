
import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Upload, Star } from "lucide-react";

const specialtyOptions = ['engine', 'transmission', 'brakes', 'electrical', 'diagnostics', 'bodywork', 'performance'];
const positionOptions = ['mechanic', 'manager', 'service_advisor', 'parts_specialist', 'admin', 'customer'];

export default function EmployeeForm({ employee, onClose }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  
  // Initialize formData based on whether an employee object is provided.
  // If employee is null, formData will be null, and an early return will display instructions.
  // If employee exists, we populate formData with employee data, providing defaults for potentially missing fields.
  const [formData, setFormData] = useState(employee ? {
    phone: employee.phone || "",
    avatar_url: employee.avatar_url || "",
    position: employee.position || "mechanic", // Default position for new users being set up
    specialties: employee.specialties || [],
    skill_level: employee.skill_level || 5,
    certifications: employee.certifications || [],
    shift_schedule: employee.shift_schedule || {
      monday: "9:00 AM - 5:00 PM",
      tuesday: "9:00 AM - 5:00 PM",
      wednesday: "9:00 AM - 5:00 PM",
      thursday: "9:00 AM - 5:00 PM",
      friday: "9:00 AM - 5:00 PM",
      saturday: "Off",
      sunday: "Off"
    },
    hourly_rate: employee.hourly_rate || 25,
    jobs_completed: employee.jobs_completed || 0,
    total_hours_worked: employee.total_hours_worked || 0,
    average_rating: employee.average_rating || 0,
    achievements: employee.achievements || [],
    xp_points: employee.xp_points || 0,
    level: employee.level || 1
  } : null);

  const [newCertification, setNewCertification] = useState({ name: "", issued_date: "", expires_date: "" });

  const mutation = useMutation({
    mutationFn: (data) => {
      // This form is now exclusively for updating existing users.
      // New user creation (invitation) happens elsewhere.
  return api.entities.User.update(employee.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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

  const toggleSpecialty = (specialty) => {
    const current = formData.specialties || [];
    if (current.includes(specialty)) {
      setFormData({ ...formData, specialties: current.filter(s => s !== specialty) });
    } else {
      setFormData({ ...formData, specialties: [...current, specialty] });
    }
  };

  const addCertification = () => {
    if (newCertification.name) {
      setFormData({
        ...formData,
        certifications: [...(formData.certifications || []), newCertification]
      });
      setNewCertification({ name: "", issued_date: "", expires_date: "" });
    }
  };

  const removeCertification = (index) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const getPositionDisplay = (position) => {
    const positionMap = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'mechanic': 'Mechanic',
      'service_advisor': 'Service Advisor',
      'parts_specialist': 'Parts Specialist',
      'customer': 'Customer (Limited Access)'
    };
    return positionMap[position] || position;
  };

  // If no employee object is provided, display instructions for adding new employees.
  if (!employee) {
    return (
      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-100">Add New Employee</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>How to add employees:</strong>
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-blue-300">
              <li>Use the "Add User" button in the Employee Directory</li>
              <li>Create the user's account (name, email, password, role/position)</li>
              <li>After they log in, they'll appear here and can be assigned details</li>
              <li>Click "Assign Position" to set their shop role and complete their profile</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {employee.position ? 'Edit Employee Profile' : 'Setup Employee Profile'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {!employee.position && (
            <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-300">
                <strong>Complete Setup:</strong> This user needs to be assigned a shop position before they can work on jobs.
              </p>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {employee.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <label htmlFor="avatar-upload">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  disabled={uploading} 
                  className="bg-slate-800 border-slate-700 text-slate-300"
                  onClick={() => document.getElementById('avatar-upload').click()}
                >
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

            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  value={employee.full_name}
                  disabled
                  className="bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed"
                  title="Name is managed through user settings"
                />
                <p className="text-xs text-slate-500 mt-1">Name can be changed in user account settings</p>
              </div>

              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  value={employee.email}
                  disabled
                  className="bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label className="text-slate-300">Shop Position * {!employee.position && <span className="text-yellow-400">(Required)</span>}</Label>
              <Select 
                value={formData.position} 
                onValueChange={(value) => setFormData({ ...formData, position: value })}
                required
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select position..." />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map(pos => (
                    <SelectItem key={pos} value={pos} className="capitalize">
                      {getPositionDisplay(pos)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!employee.position && (
                <p className="text-xs text-yellow-400">This user cannot be assigned to jobs until a position is set</p>
              )}
            </div>
          </div>

          {/* Only show these fields for employees with relevant positions */}
          {['mechanic', 'manager', 'admin'].includes(formData.position) && (
            <>
              {/* Specialties */}
              <div className="space-y-2">
                <Label className="text-slate-300">Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {specialtyOptions.map((specialty) => (
                    <Badge
                      key={specialty}
                      onClick={() => toggleSpecialty(specialty)}
                      className={`cursor-pointer capitalize ${
                        formData.specialties?.includes(specialty)
                          ? 'bg-orange-600 text-white border-0'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Skill Level */}
              <div className="space-y-2">
                <Label className="text-slate-300">Skill Level: {formData.skill_level}/10</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.skill_level}
                    onChange={(e) => setFormData({ ...formData, skill_level: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    {Array.from({ length: formData.skill_level }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-3">
            <Label className="text-slate-300">Certifications</Label>
            <div className="space-y-2">
              {formData.certifications?.map((cert, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex-1">
                    <p className="text-slate-200 font-medium">{cert.name}</p>
                    <p className="text-xs text-slate-400">
                      Issued: {cert.issued_date} {cert.expires_date && `• Expires: ${cert.expires_date}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCertification(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Certification name"
                value={newCertification.name}
                onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
              <Input
                type="date"
                placeholder="Issued date"
                value={newCertification.issued_date}
                onChange={(e) => setNewCertification({ ...newCertification, issued_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="Expires date"
                  value={newCertification.expires_date}
                  onChange={(e) => setNewCertification({ ...newCertification, expires_date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
                <Button type="button" onClick={addCertification} size="sm" className="bg-orange-600 hover:bg-orange-500">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Shift Schedule */}
          <div className="space-y-3">
            <Label className="text-slate-300">Weekly Schedule</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <Label className="text-slate-400 capitalize w-24">{day}</Label>
                  <Input
                    value={formData.shift_schedule?.[day] || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      shift_schedule: { ...formData.shift_schedule, [day]: e.target.value }
                    })}
                    placeholder="9:00 AM - 5:00 PM"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? 'Saving...' : (employee.position ? 'Update Profile' : 'Complete Setup')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

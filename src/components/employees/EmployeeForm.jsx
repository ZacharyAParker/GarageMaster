
import {  useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, AlertCircle } from "lucide-react";
import { POSITIONS, POSITION_LABELS } from "@/lib/constants";

/** Parse a comma-separated string into a clean, deduped array of tags. */
function parseTags(value) {
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Render an array field (strings or legacy objects) as a comma-separated string. */
function tagsToText(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((t) => (typeof t === "string" ? t : t?.name || ""))
    .filter(Boolean)
    .join(", ");
}

export default function EmployeeForm({ employee, onClose }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(employee ? {
    phone: employee.phone || "",
    avatar_url: employee.avatar_url || "",
    position: employee.position || "mechanic",
    specialties: tagsToText(employee.specialties),
    skills: tagsToText(employee.skills),
    certifications: tagsToText(employee.certifications),
    hourly_wage: employee.hourly_wage ?? "",
    hire_date: employee.hire_date ? String(employee.hire_date).slice(0, 10) : "",
  } : null);

  const mutation = useMutation({
    mutationFn: (data) => {
      // This form is exclusively for admin updates of an existing user.
      // New user creation happens through the Add User form (adminCreateUser).
      const updates = {
        phone: data.phone,
        position: data.position,
        specialties: parseTags(data.specialties),
        skills: parseTags(data.skills),
        certifications: parseTags(data.certifications),
        hourly_wage: data.hourly_wage === "" || data.hourly_wage == null ? null : Number(data.hourly_wage),
        hire_date: data.hire_date || null,
      };
      if (data.avatar_url) updates.avatar_url = data.avatar_url;
      return api.auth.adminUpdateUser({ userId: employee.id, updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      onClose?.();
    },
    onError: (err) => setError(err?.message || "Failed to save profile"),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, avatar_url: file_url }));
    } catch (err) {
      setError("Failed to upload photo");
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    mutation.mutate(formData);
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
              <li>Use the &quot;Add User&quot; button in the Employee Directory</li>
              <li>Create the user&apos;s account (name, email, password, role/position)</li>
              <li>After they log in, they&apos;ll appear here and can be assigned details</li>
              <li>Click &quot;Assign Position&quot; to set their shop role and complete their profile</li>
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
            {employee.position ? "Edit Employee Profile" : "Setup Employee Profile"}
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
                <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {employee.full_name?.[0]?.toUpperCase() || "?"}
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
                  {uploading ? "Uploading..." : "Upload Photo"}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                Shop Position {!employee.position && <span className="text-yellow-400">(Required)</span>}
              </Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select position..." />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {POSITION_LABELS[pos] || pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!employee.position && (
                <p className="text-xs text-yellow-400">This user cannot be assigned to jobs until a position is set</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Hourly Wage ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_wage}
                onChange={(e) => setFormData({ ...formData, hourly_wage: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="e.g. 25.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Specialties */}
            <div className="space-y-2">
              <Label className="text-slate-300">Specialties</Label>
              <Input
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Comma-separated, e.g. engine, brakes, diagnostics"
              />
              {parseTags(formData.specialties).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parseTags(formData.specialties).map((tag) => (
                    <Badge key={tag} className="bg-orange-900/40 text-orange-300 border-orange-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-slate-300">Skills</Label>
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Comma-separated, e.g. brake repair, wheel alignment"
              />
              {parseTags(formData.skills).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parseTags(formData.skills).map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certifications */}
            <div className="space-y-2">
              <Label className="text-slate-300">Certifications</Label>
              <Input
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Comma-separated, e.g. ASE Master Tech, EPA 609"
              />
              {parseTags(formData.certifications).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parseTags(formData.certifications).map((tag) => (
                    <Badge key={tag} className="bg-blue-900/40 text-blue-300 border-blue-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Hire Date */}
            <div className="space-y-2">
              <Label className="text-slate-300">Hire Date</Label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
              {mutation.isPending ? "Saving..." : (employee.position ? "Update Profile" : "Complete Setup")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

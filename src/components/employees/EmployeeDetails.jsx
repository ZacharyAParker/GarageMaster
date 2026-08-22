import {  useState  } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Edit, Star, Trophy, Clock, DollarSign, CheckCircle,
  ShieldAlert, KeyRound, Copy, Trash2, UserCog, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { POSITIONS, POSITION_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Administrator" },
];

function generateTempPassword(length = 12) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i += 1) arr[i] = Math.floor(Math.random() * 4294967296);
  }
  return Array.from(arr, (n) => charset[n % charset.length]).join("");
}

const certLabel = (cert) => (typeof cert === "string" ? cert : cert?.name || "");
export { certLabel };

export default function EmployeeDetails({ employee, stats, jobs, onBack, onEdit, canEdit, isAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const [tempPassword, setTempPassword] = useState(null); // shown once after reset
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState("");

  const recentJobs = jobs.slice(0, 10);
  const isSelf = currentUser?.id === employee.id;
  const roleValue = employee.role === "admin" ? "admin" : "staff";

  const statusColors = {
    intake: "bg-slate-700 text-slate-300 border-0",
    awaiting_diagnosis: "bg-blue-900/50 text-blue-300 border-0",
    in_progress: "bg-orange-900/50 text-orange-300 border-0",
    completed: "bg-green-900/50 text-green-300 border-0",
  };

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }) => api.auth.adminResetPassword({ userId, newPassword }),
    onSuccess: (_data, variables) => {
      setTempPassword(variables.newPassword); // one-time display
      setActionError("");
      invalidateUsers();
    },
    onError: (err) => setActionError(err?.message || "Failed to reset password"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ updates }) => api.auth.adminUpdateUser({ userId: employee.id, updates }),
    onSuccess: () => {
      setActionError("");
      invalidateUsers();
    },
    onError: (err) => setActionError(err?.message || "Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.auth.adminDeleteUser({ userId: employee.id }),
    onSuccess: () => {
      invalidateUsers();
      setConfirmDelete(false);
      onBack?.();
    },
    onError: (err) => {
      setConfirmDelete(false);
      setActionError(err?.message || "Failed to delete user");
    },
  });

  const handleResetPassword = () => {
    const newPassword = generateTempPassword();
    resetPasswordMutation.mutate({ userId: employee.id, newPassword });
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">{employee.full_name}</h1>
          <p className="text-slate-400 mt-1">{POSITION_LABELS[employee.position] || "Pending Setup"}</p>
        </div>
        {canEdit && (
          <Button onClick={onEdit} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* One-time temporary password alert */}
      {tempPassword && (
        <Alert className="bg-emerald-900/20 border-emerald-700">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <AlertTitle className="text-emerald-300">Temporary password generated</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-emerald-200/80 text-sm mb-2">
              Share this with {employee.full_name} now - it will not be shown again. They&apos;ll set a new password at next sign-in.
            </p>
            <div className="flex items-center gap-3">
              <code className="px-3 py-1.5 rounded bg-slate-950 border border-emerald-800 text-emerald-300 font-mono text-base tracking-widest">
                {tempPassword}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-slate-900 border-slate-700 text-slate-300"
                onClick={() => navigator.clipboard?.writeText(tempPassword)}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-slate-500 hover:text-slate-300"
                onClick={() => setTempPassword(null)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl text-slate-100">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.full_name} className="w-24 h-24 rounded-full object-cover mb-4" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-3xl">
                    {employee.full_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold text-slate-100">
                    Level {employee.level || Math.floor((employee.xp_points || 0) / 1000) + 1}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{employee.xp_points || 0} XP</p>
              </div>

              {employee.skill_level && (
                <div className="w-full">
                  <p className="text-xs text-slate-400 mb-2 text-center">Skill Level</p>
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: employee.skill_level }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                    {Array.from({ length: 10 - employee.skill_level }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-slate-700" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-slate-300 break-all">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-slate-300">{employee.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hourly Wage</p>
                <p className="text-slate-300">
                  {employee.hourly_wage != null ? `$${Number(employee.hourly_wage).toFixed(2)}/hr` : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hire Date</p>
                <p className="text-slate-300">{formatDate(employee.hire_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <Badge className={roleValue === "admin" ? "bg-orange-900/40 text-orange-300 border-orange-800" : "bg-slate-800 text-slate-300 border-slate-700"}>
                  {roleValue === "admin" ? "Administrator" : "Staff"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jobs Completed</p>
                <p className="text-slate-300">{employee.jobs_completed ?? stats.completedJobs}</p>
              </div>
            </div>

            {employee.skills && employee.skills.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {employee.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                      {typeof skill === "string" ? skill : skill?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {employee.specialties && employee.specialties.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {employee.specialties.map((specialty, idx) => (
                    <Badge key={idx} className="bg-orange-900/30 text-orange-300 border-orange-800 capitalize">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {employee.certifications && employee.certifications.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Certifications</p>
                <div className="space-y-2">
                  {employee.certifications.map((cert, idx) =>
                    typeof cert === "string" ? (
                      <div key={idx} className="p-2 bg-slate-800/50 rounded">
                        <p className="text-sm text-slate-200">{cert}</p>
                      </div>
                    ) : (
                      <div key={idx} className="p-2 bg-slate-800/50 rounded">
                        <p className="text-sm text-slate-200">{cert.name}</p>
                        {(cert.issued_date || cert.expires_date) && (
                          <p className="text-xs text-slate-500">
                            {cert.issued_date && `Issued: ${cert.issued_date}`}
                            {cert.expires_date && ` • Expires: ${cert.expires_date}`}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats and Jobs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Completed</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{stats.completedJobs}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-slate-400">Active</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{stats.activeJobs}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-green-400">${(stats.totalRevenue || 0).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-400">Rating</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{employee.average_rating?.toFixed(1) || "5.0"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Management */}
          {isAdmin && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-orange-500" />
                  Admin Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wide">Position</Label>
                    <Select
                      value={employee.position || undefined}
                      onValueChange={(value) => updateMutation.mutate({ updates: { position: value } })}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                        <SelectValue placeholder={employee.position ? POSITION_LABELS[employee.position] : "Select position..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {POSITION_LABELS[pos] || pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wide">Role</Label>
                    <Select
                      value={roleValue}
                      onValueChange={(value) => updateMutation.mutate({ updates: { role: value } })}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                    className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    {resetPasswordMutation.isPending ? "Generating..." : "Reset Password"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSelf || deleteMutation.isPending}
                    title={isSelf ? "You cannot delete your own account" : "Delete this user"}
                    className="bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isSelf ? "Cannot Delete Yourself" : "Delete User"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Jobs */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xl text-slate-100">Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recentJobs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No jobs assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-orange-600 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-slate-200">{job.job_number || `Job #${job.id.slice(0, 8)}`}</h4>
                          <p className="text-sm text-slate-400 mt-1">{job.description?.substring(0, 60)}...</p>
                        </div>
                        <Badge className={statusColors[job.status] || statusColors.intake}>
                          {job.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {job.created_date && (
                        <p className="text-xs text-slate-600">
                          {format(new Date(job.created_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-slate-900 border-red-900 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              Delete this user?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This permanently removes <span className="text-slate-200 font-medium">{employee.full_name}</span> ({employee.email}) and their login.
              Their job history records remain but will no longer be assigned to anyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-red-700 text-white hover:bg-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

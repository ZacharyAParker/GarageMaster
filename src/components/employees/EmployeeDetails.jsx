import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Star, Trophy, Award, Clock, DollarSign, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeDetails({ employee, stats, jobs, onBack, onEdit, canEdit }) {
  const recentJobs = jobs.slice(0, 10);

  const statusColors = {
    intake: "bg-slate-700 text-slate-300 border-0",
    awaiting_diagnosis: "bg-blue-900/50 text-blue-300 border-0",
    in_progress: "bg-orange-900/50 text-orange-300 border-0",
    completed: "bg-green-900/50 text-green-300 border-0"
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">{employee.full_name}</h1>
          <p className="text-slate-400 mt-1 capitalize">{employee.position || 'Mechanic'}</p>
        </div>
        {canEdit && (
          <Button onClick={onEdit} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

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
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-3xl">
                    {employee.full_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold text-slate-100">Level {employee.level || 1}</span>
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
                <p className="text-slate-300">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-slate-300">{employee.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hourly Rate</p>
                <p className="text-slate-300">${employee.hourly_rate || 25}/hr</p>
              </div>
            </div>

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
                  {employee.certifications.map((cert, idx) => (
                    <div key={idx} className="p-2 bg-slate-800/50 rounded">
                      <p className="text-sm text-slate-200">{cert.name}</p>
                      <p className="text-xs text-slate-500">
                        Issued: {cert.issued_date}
                        {cert.expires_date && ` • Expires: ${cert.expires_date}`}
                      </p>
                    </div>
                  ))}
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
                <p className="text-2xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-400">Rating</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{employee.average_rating?.toFixed(1) || '5.0'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Schedule */}
          {employee.shift_schedule && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(employee.shift_schedule).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-300 capitalize font-medium">{day}</span>
                      <span className="text-slate-400">{hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {employee.achievements && employee.achievements.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.achievements.map((achievement, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-orange-900/20 to-orange-800/10 border border-orange-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.icon || '🏆'}</div>
                        <div>
                          <h4 className="font-semibold text-slate-200">{achievement.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{achievement.description}</p>
                          <Badge className="mt-2 bg-orange-600 text-white border-0">
                            +{achievement.points} XP
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
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
                          {job.status?.replace(/_/g, ' ')}
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
    </div>
  );
}
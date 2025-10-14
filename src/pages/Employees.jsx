
import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Wrench, Star, TrendingUp, Edit, Eye, Plus, AlertCircle } from "lucide-react";

import EmployeeCard from "../components/employees/EmployeeCard";
import EmployeeForm from "../components/employees/EmployeeForm";
import EmployeeDetails from "../components/employees/EmployeeDetails";
import AddUserForm from "../components/employees/AddUserForm";
// Removed PermissionGate import as it's no longer used directly in this file
// import PermissionGate from "../components/permissions/PermissionGate";

export default function Employees() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['users'],
  queryFn: () => api.entities.User.list()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list()
  });

  // Only customers are blocked from viewing employee directory
  if (currentUser?.position === 'customer') {
    return (
      <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">You don't have access to the employee directory.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter out customers from employee list - only show actual shop employees
  const shopEmployees = employees.filter(e => e.position !== 'customer');
  
  // Show ALL users - those with positions AND those without (pending setup)
  const allEmployees = shopEmployees;
  
  // Separate employees with positions (active) from those without (pending setup)
  const activeEmployees = shopEmployees.filter(e => e.position);
  const pendingEmployees = shopEmployees.filter(e => !e.position);
  
  const getEmployeeStats = (employeeId) => {
    const employeeJobs = jobs.filter(j => j.assigned_mechanic_id === employeeId);
    const completedJobs = employeeJobs.filter(j => j.status === 'completed');
    const activeJobs = employeeJobs.filter(j => !['completed', 'cancelled'].includes(j.status));
    
    return {
      totalJobs: employeeJobs.length,
      completedJobs: completedJobs.length,
      activeJobs: activeJobs.length,
      totalRevenue: completedJobs.reduce((sum, j) => sum + (j.total_cost || 0), 0)
    };
  };

  const topPerformer = activeEmployees.reduce((top, employee) => {
    const stats = getEmployeeStats(employee.id);
    if (!top || stats.completedJobs > getEmployeeStats(top.id).completedJobs) {
      return employee;
    }
    return top;
  }, null);

  // Admins OR anyone with manager/admin position can edit
  const canEdit = currentUser?.role === 'admin' || ['admin', 'manager'].includes(currentUser?.position);

  const handleEdit = (employee) => {
    if (!canEdit) {
      alert("Only administrators and managers can edit employee profiles.");
      return;
    }
    setEditingEmployee(employee);
    setShowForm(true);
    setSelectedEmployee(null);
  };

  const handleView = (employee) => {
    if (!employee.position) {
      alert("This user hasn't been assigned a position yet.");
      return;
    }
    setSelectedEmployee(employee);
    setShowForm(false);
  };

  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        stats={getEmployeeStats(selectedEmployee.id)}
        jobs={jobs.filter(j => j.assigned_mechanic_id === selectedEmployee.id)}
        onBack={() => setSelectedEmployee(null)}
        onEdit={() => handleEdit(selectedEmployee)}
        canEdit={canEdit}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Employee Directory</h1>
          <p className="text-slate-400 mt-1">View team members and their information</p>
        </div>
        {canEdit && ( // Used canEdit here for consistency with other admin/manager actions
          <div className="flex gap-3">
            <Button
              onClick={() => setAddingUser(true)}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-slate-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        )}
      </div>
      {addingUser && canEdit && (
        <AddUserForm onClose={() => setAddingUser(false)} />
      )}

      {showForm && canEdit && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
        />
      )}

      {pendingEmployees.length > 0 && canEdit && (
        <Card className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Pending Employee Setup</h3>
                <p className="text-slate-300 mb-4">
                  {pendingEmployees.length} new user{pendingEmployees.length > 1 ? 's' : ''} need{pendingEmployees.length === 1 ? 's' : ''} to be assigned a shop position.
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingEmployees.map((emp, index) => (
                    <Button
                      key={emp.id}
                      size="sm"
                      onClick={() => handleEdit(emp)}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white"
                    >
                      Setup User #{index + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {topPerformer && (
        <Card className="bg-gradient-to-r from-orange-900/30 to-orange-800/20 border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <h3 className="text-xl font-bold text-slate-100">Top Performer</h3>
                </div>
                <p className="text-2xl font-bold text-orange-400">{topPerformer.full_name}</p>
                <p className="text-slate-400 mt-1">{getEmployeeStats(topPerformer.id).completedJobs} jobs completed this period</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Team Members ({activeEmployees.length} Active{pendingEmployees.length > 0 ? `, ${pendingEmployees.length} Pending` : ''})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading employees...</div>
          ) : activeEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEmployees.map((employee) => (
                <EmployeeCard 
                  key={employee.id} 
                  employee={employee} 
                  stats={getEmployeeStats(employee.id)}
                  isTopPerformer={topPerformer?.id === employee.id}
                  onView={() => handleView(employee)}
                  onEdit={() => handleEdit(employee)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* The outline specifically removes the nested pendingEmployees section from the main card. */}
      {/* However, the top-level pending employees card remains, and is shown if isAdmin. */}

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-slate-100">Team Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Users</span>
                <span className="text-2xl font-bold text-slate-100">{allEmployees.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Employees</span>
                <span className="text-2xl font-bold text-green-500">{activeEmployees.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pending Setup</span>
                <span className="text-2xl font-bold text-yellow-500">{pendingEmployees.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Jobs</span>
                <span className="text-2xl font-bold text-orange-500">
                  {jobs.filter(j => !['completed', 'cancelled'].includes(j.status)).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-sm text-green-400">Highest Completion Rate</p>
                <p className="font-semibold text-slate-100 mt-1">
                  {topPerformer?.full_name || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-400">Most Specialized</p>
                <p className="font-semibold text-slate-100 mt-1">
                  {activeEmployees.find(m => m.specialties && m.specialties.length > 0)?.full_name || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-slate-100">Skill Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {['engine', 'transmission', 'brakes', 'electrical', 'diagnostics'].map((skill) => {
                const count = activeEmployees.filter(m => m.specialties?.includes(skill)).length;
                return (
                  <div key={skill} className="flex justify-between items-center">
                    <span className="text-slate-400 capitalize">{skill}</span>
                    <Badge className="bg-slate-800 text-slate-300 border-0">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

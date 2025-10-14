import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Calendar, Edit, Trash2, Car, Eye } from "lucide-react";
import { format } from "date-fns";

import CustomerForm from "../components/customers/CustomerForm";
import CustomerDetails from "../components/customers/CustomerDetails";

export default function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
  queryFn: () => api.entities.Customer.list("-created_date")
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
  queryFn: () => api.entities.Vehicle.list()
  });

  const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
    setSelectedCustomer(null);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setShowForm(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const getCustomerVehicles = (customerId) => {
    return vehicles.filter(v => v.customer_id === customerId);
  };

  const statusColors = {
    active: "bg-green-900/50 text-green-300 border-0",
    inactive: "bg-slate-700 text-slate-300 border-0",
    vip: "bg-orange-600 text-white border-0"
  };

  if (selectedCustomer) {
    return (
      <CustomerDetails
        customer={selectedCustomer}
        vehicles={getCustomerVehicles(selectedCustomer.id)}
        onBack={() => setSelectedCustomer(null)}
        onEdit={() => handleEdit(selectedCustomer)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Customer Management</h1>
          <p className="text-slate-400 mt-1">Manage your customer database</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingCustomer(null);
          }}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-100">All Customers</CardTitle>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 w-full md:w-96 border border-slate-700">
              <Search className="w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm text-slate-300 placeholder-slate-500 p-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No customers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer" onClick={() => handleView(customer)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {customer.avatar_url ? (
                          <img src={customer.avatar_url} alt={customer.full_name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {customer.full_name?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-200">{customer.full_name}</h3>
                          <Badge className={statusColors[customer.status] || statusColors.active}>
                            {customer.status || 'active'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Car className="w-4 h-4" />
                        <span>{getCustomerVehicles(customer.id).length} vehicle(s)</span>
                      </div>
                      {customer.customer_since && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>Since {format(new Date(customer.customer_since), "MMM yyyy")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(customer);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(customer);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(customer.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
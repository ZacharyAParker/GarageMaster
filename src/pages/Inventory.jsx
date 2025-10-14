
import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle, TrendingDown, Edit, Trash2 } from "lucide-react";

import InventoryForm from "../components/inventory/InventoryForm";

export default function Inventory() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
  queryFn: () => api.entities.InventoryItem.list("part_name")
  });

  const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  // Admins can manage, OR anyone with a shop position (mechanic, manager, etc.) can manage
  // Only customers are read-only
  const canManage = currentUser?.role === 'admin' || 
                    (currentUser?.position && currentUser?.position !== 'customer');

  const handleEdit = (item) => {
    if (!canManage) {
      alert("You don't have permission to edit inventory.");
      return;
    }
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!canManage) {
      alert("You don't have permission to delete inventory.");
      return;
    }
    if (confirm("Are you sure you want to delete this part?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.part_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.part_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(item => item.quantity_in_stock <= item.minimum_stock);
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity_in_stock * item.unit_cost), 0);

  const categories = [...new Set(inventory.map(item => item.category))].filter(Boolean);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Parts Inventory</h1>
          <p className="text-slate-400 mt-1">{canManage ? 'Manage stock levels and parts catalog' : 'View parts catalog and availability'}</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingItem(null);
            }}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <InventoryForm
          item={editingItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Parts</p>
                <p className="text-2xl font-bold text-slate-100">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-400">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Inventory Value</p>
                <p className="text-2xl font-bold text-green-400">${totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-100">All Parts</CardTitle>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 flex-1 md:w-96 border border-slate-700">
                <Search className="w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search parts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm text-slate-300 placeholder-slate-500 p-0"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-2"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading inventory...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">No parts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Part #</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Name</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase p-3">Category</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Stock</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Unit Cost</th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Retail</th>
                    {canManage && (
                      <th className="text-right text-xs font-semibold text-slate-400 uppercase p-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="p-3 text-slate-300 font-mono text-sm">{item.part_number}</td>
                      <td className="p-3">
                        <p className="text-slate-200 font-medium">{item.part_name}</p>
                        {item.brand && <p className="text-xs text-slate-500">{item.brand}</p>}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700 capitalize">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${
                          item.quantity_in_stock <= item.minimum_stock ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {item.quantity_in_stock}
                        </span>
                        {item.quantity_in_stock <= item.minimum_stock && (
                          <AlertTriangle className="w-4 h-4 text-red-400 inline ml-2" />
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-300">${item.unit_cost?.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-300">${item.retail_price?.toFixed(2)}</td>
                      {canManage && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

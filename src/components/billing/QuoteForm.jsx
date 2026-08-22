import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, FileText } from "lucide-react";
import { Quote } from "@/api/entities";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/constants";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const emptyLineItem = () => ({ description: "", quantity: 1, unit_price: 0, total: 0 });

export default function QuoteForm({ quote, customers = [], vehicles = [], jobs = [], onClose }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(
    quote
      ? {
          ...quote,
          line_items:
            Array.isArray(quote.line_items) && quote.line_items.length > 0
            ? quote.line_items.map((li) => ({ ...emptyLineItem(), ...li }))
            : [emptyLineItem()],
          tax_rate: Number(quote.tax_rate ?? 0),
        }
      : {
          quote_number: `QT-${String(Date.now()).slice(-6).padStart(6, "0")}`,
          customer_id: "",
          vehicle_id: "",
          job_id: "",
          status: "draft",
          line_items: [emptyLineItem()],
          subtotal: 0,
          tax_rate: 0.0825,
          tax_amount: 0,
          total: 0,
          valid_until: addDays(new Date(), 30).toISOString().slice(0, 10),
          notes: "",
        }
  );

  // Load the shop's default tax rate from settings for new quotes
  React.useEffect(() => {
    if (quote) return;
    let cancelled = false;
    api.settings
      .get()
      .then((s) => {
        if (!cancelled && s && s.tax_rate != null && s.tax_rate !== "") {
          setFormData((prev) => ({ ...prev, tax_rate: Number(s.tax_rate) || 0 }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quote]);

  // Recalculate line totals, subtotal, tax and grand total whenever lines/tax rate change
  React.useEffect(() => {
    setFormData((prev) => {
      const items = (Array.isArray(prev.line_items) ? prev.line_items : []).map((li) => ({
        ...li,
        quantity: Number(li.quantity) || 0,
        unit_price: Number(li.unit_price) || 0,
        total: round2((Number(li.quantity) || 0) * (Number(li.unit_price) || 0)),
      }));
      const subtotal = round2(items.reduce((sum, li) => sum + li.total, 0));
      const taxRate = Number(prev.tax_rate) || 0;
      const tax_amount = round2(subtotal * taxRate);
      const total = round2(subtotal + tax_amount);

      const unchanged =
        prev.line_items.length === items.length &&
        prev.line_items.every(
          (li, i) =>
            li.description === items[i].description &&
            Number(li.quantity) === items[i].quantity &&
            Number(li.unit_price) === items[i].unit_price &&
            Number(li.total) === items[i].total
        ) &&
        prev.subtotal === subtotal &&
        prev.tax_amount === tax_amount &&
        prev.total === total;
      if (unchanged) return prev;

      return { ...prev, line_items: items, subtotal, tax_amount, total };
    });
  }, [formData.line_items, formData.tax_rate]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (quote) {
        return Quote.update(quote.id, data);
      }
      return Quote.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      onClose();
    },
  });

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const updateLineItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.map((li, i) => (i === index ? { ...li, [field]: value } : li)),
    }));
  };

  const addLineItem = () =>
    setFormData((prev) => ({ ...prev, line_items: [...prev.line_items, emptyLineItem()] }));

  const removeLineItem = (index) =>
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));

  const handleCustomerChange = (customerId) => {
    setFormData((prev) => {
      const stillValid = vehicles.some((v) => v.id === prev.vehicle_id && v.customer_id === customerId);
      return {
        ...prev,
        customer_id: customerId,
        vehicle_id: stillValid ? prev.vehicle_id : "",
      };
    });
  };

  const vehicleOptions = formData.customer_id
    ? vehicles.filter((v) => v.customer_id === formData.customer_id)
    : vehicles;

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const validUntilValue = formData.valid_until ? String(formData.valid_until).slice(0, 10) : "";

  return (
    <Card className="bg-slate-900 border-slate-800 mb-6">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-100">
            {quote ? `Edit Quote ${quote.quote_number}` : "Create New Quote"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Quote Number</Label>
              <Input
                value={formData.quote_number}
                onChange={(e) => updateField("quote_number", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {QUOTE_STATUS_LABELS[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Valid Until</Label>
              <Input
                type="date"
                value={validUntilValue}
                onChange={(e) => updateField("valid_until", e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Customer</Label>
              <Select value={formData.customer_id || undefined} onValueChange={handleCustomerChange}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <SelectItem value="no-customers" disabled>
                      No customers available
                    </SelectItem>
                  ) : (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Vehicle</Label>
              <Select
                value={formData.vehicle_id || undefined}
                onValueChange={(value) => updateField("vehicle_id", value)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleOptions.length === 0 ? (
                    <SelectItem value="no-vehicles" disabled>
                      No vehicles for this customer
                    </SelectItem>
                  ) : (
                    vehicleOptions.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Linked Job</Label>
              <Select
                value={formData.job_id || "none"}
                onValueChange={(value) => updateField("job_id", value === "none" ? "" : value)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="No linked job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_number || job.id} - {(job.description || "").slice(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <Label className="text-slate-100 text-lg font-semibold">Line Items</Label>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addLineItem}
                className="bg-orange-600 hover:bg-orange-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Line Item
              </Button>
            </div>

            <div className="hidden md:grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-slate-500">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {formData.line_items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <Input
                    placeholder="Description of work or part"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    className="md:col-span-5 bg-slate-800 border-slate-700 text-slate-200"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="md:col-span-2 bg-slate-800 border-slate-700 text-slate-200"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    className="md:col-span-2 bg-slate-800 border-slate-700 text-slate-200"
                  />
                  <div className="md:col-span-2 md:text-right font-semibold text-slate-200 px-3 py-2 rounded bg-slate-800/50">
                    ${round2(item.total).toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLineItem(index)}
                    disabled={formData.line_items.length <= 1}
                    className="text-red-400 hover:text-red-300 justify-self-end"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Panel */}
          <div className="space-y-3 pt-4 border-t border-slate-800 bg-slate-800/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Totals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex justify-between items-center text-slate-300 md:hidden">
                <span>Subtotal</span>
                <span className="font-semibold">${round2(formData.subtotal).toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tax Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={formData.tax_rate}
                    onChange={(e) => updateField("tax_rate", parseFloat(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                  <span className="text-slate-400 text-sm whitespace-nowrap">
                    ({(Number(formData.tax_rate) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="hidden md:flex justify-between items-center text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold">${round2(formData.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tax Amount</span>
                <span className="font-semibold">${round2(formData.tax_amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-orange-500 pt-3 border-t border-slate-700">
              <span>Total</span>
              <span>${round2(formData.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-200"
              rows={3}
              placeholder="Terms, warranty notes, or anything else the customer should know..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
            >
              {mutation.isPending ? "Saving..." : quote ? "Update Quote" : "Create Quote"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

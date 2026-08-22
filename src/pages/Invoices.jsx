import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  DollarSign,
  Ban,
  CheckCircle2,
  Printer,
  Pencil,
  Trash2,
  Receipt,
} from "lucide-react";
import { Invoice, Customer, Vehicle } from "@/api/entities";
import InvoiceForm, { completeLinkedJob } from "@/components/billing/InvoiceForm";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatMoney, formatDate, daysUntil } from "@/lib/format";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const INVOICE_STATUSES = ["draft", "unpaid", "partial_paid", "paid", "void"];
const INVOICE_STATUS_LABELS = {
  draft: "Draft",
  unpaid: "Unpaid",
  partial_paid: "Partial Paid",
  paid: "Paid",
  void: "Void",
};
const INVOICE_STATUS_COLORS = {
  draft: "bg-slate-700/50 text-slate-300 border-slate-600",
  unpaid: "bg-red-900/40 text-red-300 border-red-800",
  partial_paid: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  paid: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
  void: "bg-slate-800 text-slate-400 border-slate-700",
};

export default function Invoices() {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [payment, setPayment] = useState(null); // { invoiceId, amount, method }
  const [printInvoiceId, setPrintInvoiceId] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => Invoice.list("-created_date"),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => Customer.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => Vehicle.list(),
  });

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [customers]);

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchStatus = statusFilter === "all" || invoice.status === statusFilter;
      const customerName = (customerMap[invoice.customer_id]?.full_name || "").toLowerCase();
      const matchSearch =
        !q ||
        String(invoice.invoice_number || "").toLowerCase().includes(q) ||
        customerName.includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, searchQuery, customerMap]);

  const invalidateInvoices = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ invoice, patch }) => Invoice.update(invoice.id, patch),
    onSuccess: invalidateInvoices,
  });

  const deleteMutation = useMutation({
    mutationFn: (invoiceId) => Invoice.delete(invoiceId),
    onSuccess: invalidateInvoices,
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ invoice, amount, method }) => {
      const paid = round2((Number(invoice.amount_paid) || 0) + amount);
      const balance = round2((Number(invoice.total) || 0) - paid);
      const updated = await Invoice.update(invoice.id, {
        amount_paid: paid,
        balance_due: Math.max(balance, 0),
        status: balance <= 0 ? "paid" : "partial_paid",
        payment_method: method || invoice.payment_method || "",
      });
      await completeLinkedJob(updated);
      return updated;
    },
    onSuccess: () => {
      invalidateInvoices();
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setPayment(null);
    },
  });

  const voidMutation = useMutation({
    mutationFn: (invoice) => Invoice.update(invoice.id, { status: "void", balance_due: 0 }),
    onSuccess: invalidateInvoices,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoice) => {
      const updated = await Invoice.update(invoice.id, {
        status: "paid",
        amount_paid: round2(invoice.total),
        balance_due: 0,
      });
      await completeLinkedJob(updated);
      return updated;
    },
    onSuccess: () => {
      invalidateInvoices();
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  // Give the DOM a beat to mount the print section, then print only it
  React.useEffect(() => {
    if (!printInvoiceId) return undefined;
    const t = setTimeout(() => {
      window.print();
      setPrintInvoiceId(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printInvoiceId]);

  const handleDelete = (invoice) => {
    if (window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const openPayment = (invoice) => {
    setPayment({
      invoiceId: invoice.id,
      amount: round2(Math.max((Number(invoice.total) || 0) - (Number(invoice.amount_paid) || 0), 0)),
      method: "cash",
    });
  };

  const submitPayment = (invoice) => {
    if (!payment) return;
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) return;
    paymentMutation.mutate({ invoice, amount, method: payment.method });
  };

  const vehicleLabel = (vehicleId) => {
    const v = vehicleMap[vehicleId];
    return v ? `${v.year} ${v.make} ${v.model}` : "";
  };

  const agingBadge = (invoice) => {
    if (!invoice.due_date || ["draft", "paid", "void"].includes(invoice.status)) return null;
    const days = daysUntil(invoice.due_date);
    if (days == null) return null;
    if (days < 0) {
      return (
        <Badge className="bg-red-900/40 text-red-300 border-red-800 border">
          {Math.abs(days)}d past due
        </Badge>
      );
    }
    if (days <= 7) {
      return (
        <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-800 border">
          Due in {days}d
        </Badge>
      );
    }
    return null;
  };

  const printInvoice = invoices.find((inv) => inv.id === printInvoiceId) || null;
  const printCustomer = printInvoice ? customerMap[printInvoice.customer_id] : null;
  const printVehicle = printInvoice ? vehicleMap[printInvoice.vehicle_id] : null;
  const busy =
    statusMutation.isPending ||
    deleteMutation.isPending ||
    paymentMutation.isPending ||
    voidMutation.isPending ||
    markPaidMutation.isPending;

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      {/* Print rules: hide everything except the .invoice-print section */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print, .invoice-print * { visibility: visible !important; }
          .invoice-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Invoices</h1>
          <p className="text-slate-400 mt-1">Bill customers and track payments</p>
        </div>
        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          customers={customers}
          vehicles={vehicles}
          onClose={() => {
            setShowForm(false);
            setEditingInvoice(null);
          }}
        />
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl font-bold text-slate-100">All Invoices</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search invoice # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-slate-200 w-full sm:w-64"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-slate-800 flex-wrap h-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {INVOICE_STATUSES.map((status) => (
                    <TabsTrigger key={status} value={status}>
                      {INVOICE_STATUS_LABELS[status]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-slate-400 text-center py-8">Loading invoices...</p>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                {searchQuery || statusFilter !== "all"
                  ? "No invoices match your filters."
                  : "No invoices yet. Create your first invoice to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => {
                const canTakePayment = ["unpaid", "partial_paid"].includes(invoice.status);
                const canMarkPaid = ["draft", "unpaid", "partial_paid"].includes(invoice.status);
                const canVoid = invoice.status !== "void";
                return (
                  <div
                    key={invoice.id}
                    className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-100">{invoice.invoice_number}</span>
                          <Badge
                            className={`border ${INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.draft}`}
                          >
                            {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                          </Badge>
                          {agingBadge(invoice)}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 truncate">
                          {customerMap[invoice.customer_id]?.full_name || "No customer"}
                          {invoice.vehicle_id ? ` · ${vehicleLabel(invoice.vehicle_id)}` : ""}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued {formatDate(invoice.issue_date)}
                          {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}
                        </p>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-lg font-bold text-orange-500">{formatMoney(invoice.total)}</p>
                        <p className="text-xs text-slate-400">
                          Paid {formatMoney(invoice.amount_paid)}
                          {" · "}
                          <span
                            className={
                              round2(invoice.balance_due) > 0 ? "text-red-400" : "text-emerald-400"
                            }
                          >
                            Due {formatMoney(invoice.balance_due)}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {canTakePayment && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => openPayment(invoice)}
                            className="border-emerald-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1" />
                            Record Payment
                          </Button>
                        )}
                        {canMarkPaid && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => markPaidMutation.mutate(invoice)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        {canVoid && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm(`Void invoice ${invoice.invoice_number}?`)) {
                                voidMutation.mutate(invoice);
                              }
                            }}
                            className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Void
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrintInvoiceId(invoice.id)}
                          className="bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingInvoice(invoice);
                            setShowForm(true);
                          }}
                          className="text-slate-300 hover:text-slate-100"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(invoice)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {payment && payment.invoiceId === invoice.id && (
                      <div className="mt-3 flex flex-col md:flex-row md:items-end gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/60">
                        <div className="space-y-1.5">
                          <Label className="text-slate-300 text-xs">Amount ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={payment.amount}
                            onChange={(e) =>
                              setPayment((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                            }
                            className="bg-slate-800 border-slate-700 text-slate-200 w-full md:w-36"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-300 text-xs">Method</Label>
                          <Select
                            value={payment.method}
                            onValueChange={(value) => setPayment((prev) => ({ ...prev, method: value }))}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 w-full md:w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {PAYMENT_METHOD_LABELS[method] || method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busy || !(Number(payment.amount) > 0)}
                            onClick={() => submitPayment(invoice)}
                            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                          >
                            {paymentMutation.isPending ? "Saving..." : "Save Payment"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPayment(null)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print-friendly invoice section (offscreen on screen; only this prints) */}
      {printInvoice && (
        <div className="invoice-print fixed top-0 left-[-10000px] w-[800px] bg-white text-black p-10">
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h1 className="text-2xl font-bold">INVOICE</h1>
              <p className="text-lg font-semibold mt-1">{printInvoice.invoice_number}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-base">GarageMaster Shop</p>
              <p>Issue Date: {formatDate(printInvoice.issue_date)}</p>
              <p>Due Date: {formatDate(printInvoice.due_date)}</p>
              <p>
                Status: {INVOICE_STATUS_LABELS[printInvoice.status] || printInvoice.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4 text-sm">
            <div>
              <p className="font-bold uppercase text-xs text-gray-500 mb-1">Bill To</p>
              <p className="font-semibold">{printCustomer?.full_name || "-"}</p>
              {printCustomer?.phone ? <p>{printCustomer.phone}</p> : null}
              {printCustomer?.email ? <p>{printCustomer.email}</p> : null}
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-gray-500 mb-1">Vehicle</p>
              {printVehicle ? (
                <>
                  <p className="font-semibold">
                    {printVehicle.year} {printVehicle.make} {printVehicle.model}
                  </p>
                  {printVehicle.license_plate ? <p>Plate: {printVehicle.license_plate}</p> : null}
                  {printVehicle.vin ? <p>VIN: {printVehicle.vin}</p> : null}
                </>
              ) : (
                <p>-</p>
              )}
            </div>
          </div>

          <table className="w-full mt-6 text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000" }}>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(printInvoice.line_items || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ccc" }}>
                  <td className="py-2">{item.description || "-"}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{formatMoney(item.unit_price)}</td>
                  <td className="text-right py-2">{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 text-sm">
              <div className="flex justify-between py-1">
                <span>Subtotal</span>
                <span>{formatMoney(printInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>
                  Tax ({(Number(printInvoice.tax_rate) * 100 || 0).toFixed(2)}%)
                </span>
                <span>{formatMoney(printInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-base" style={{ borderTop: "2px solid #000" }}>
                <span>Total</span>
                <span>{formatMoney(printInvoice.total)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Amount Paid</span>
                <span>{formatMoney(printInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span>Balance Due</span>
                <span>{formatMoney(printInvoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {printInvoice.notes ? (
            <div className="mt-6 text-sm">
              <p className="font-bold uppercase text-xs text-gray-500 mb-1">Notes</p>
              <p>{printInvoice.notes}</p>
            </div>
          ) : null}

          <p className="mt-8 text-xs text-gray-500 text-center">
            Thank you for your business!
          </p>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Send,
  Check,
  X,
  Clock,
  ArrowRightLeft,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { Quote, Invoice, Customer, Vehicle } from "@/api/entities";
import QuoteForm from "@/components/billing/QuoteForm";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/format";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function Quotes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => Quote.list("-created_date"),
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

  const filteredQuotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotes.filter((quote) => {
      const matchStatus = statusFilter === "all" || quote.status === statusFilter;
      const customerName = (customerMap[quote.customer_id]?.full_name || "").toLowerCase();
      const matchSearch =
        !q || String(quote.quote_number || "").toLowerCase().includes(q) || customerName.includes(q);
      return matchStatus && matchSearch;
    });
  }, [quotes, statusFilter, searchQuery, customerMap]);

  const invalidateQuotes = () => {
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ quote, status }) => Quote.update(quote.id, { status }),
    onSuccess: invalidateQuotes,
  });

  const deleteMutation = useMutation({
    mutationFn: (quoteId) => Quote.delete(quoteId),
    onSuccess: invalidateQuotes,
  });

  const convertMutation = useMutation({
    mutationFn: async (quote) => {
      const invoiceData = {
        invoice_number: `INV-${String(Date.now()).slice(-6).padStart(6, "0")}`,
        customer_id: quote.customer_id || "",
        vehicle_id: quote.vehicle_id || "",
        job_id: quote.job_id || "",
        status: "unpaid",
        line_items: (quote.line_items || []).map((li) => ({
          description: li.description || "",
          quantity: Number(li.quantity) || 0,
          unit_price: Number(li.unit_price) || 0,
          total: Number(li.total) || round2((Number(li.quantity) || 0) * (Number(li.unit_price) || 0)),
        })),
        subtotal: Number(quote.subtotal) || 0,
        tax_rate: Number(quote.tax_rate) || 0,
        tax_amount: Number(quote.tax_amount) || 0,
        total: Number(quote.total) || 0,
        amount_paid: 0,
        balance_due: Number(quote.total) || 0,
        issue_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        payment_terms: "due_on_receipt",
        payment_method: "",
        notes: `Converted from ${quote.quote_number}. ${quote.notes || ""}`.trim(),
      };
      await Invoice.create(invoiceData);
      return Quote.update(quote.id, { status: "converted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate("/Invoices");
    },
  });

  const handleDelete = (quote) => {
    if (window.confirm(`Delete quote ${quote.quote_number}? This cannot be undone.`)) {
      deleteMutation.mutate(quote.id);
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingQuote(null);
  };

  const vehicleLabel = (vehicleId) => {
    const v = vehicleMap[vehicleId];
    return v ? `${v.year} ${v.make} ${v.model}` : "";
  };

  const actionButtons = (quote) => {
    const busy =
      statusMutation.isPending || convertMutation.isPending || deleteMutation.isPending;
    const buttons = [];
    if (quote.status === "draft") {
      buttons.push(
        <Button
          key="send"
          size="sm"
          disabled={busy}
          onClick={() => statusMutation.mutate({ quote, status: "sent" })}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Send className="w-3.5 h-3.5 mr-1" />
          Send
        </Button>
      );
    }
    if (quote.status === "sent") {
      buttons.push(
        <Button
          key="accept"
          size="sm"
          disabled={busy}
          onClick={() => statusMutation.mutate({ quote, status: "accepted" })}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          Accept
        </Button>,
        <Button
          key="decline"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => statusMutation.mutate({ quote, status: "declined" })}
          className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Decline
        </Button>,
        <Button
          key="expire"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => statusMutation.mutate({ quote, status: "expired" })}
          className="border-yellow-800 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
        >
          <Clock className="w-3.5 h-3.5 mr-1" />
          Expire
        </Button>
      );
    }
    if (quote.status === "accepted") {
      buttons.push(
        <Button
          key="convert"
          size="sm"
          disabled={busy}
          onClick={() => convertMutation.mutate(quote)}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
          Convert to Invoice
        </Button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Quotes</h1>
          <p className="text-slate-400 mt-1">Create estimates and track customer approvals</p>
        </div>
        <Button
          onClick={() => {
            setEditingQuote(null);
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {showForm && (
        <QuoteForm
          quote={editingQuote}
          customers={customers}
          vehicles={vehicles}
          onClose={handleCloseForm}
        />
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl font-bold text-slate-100">All Quotes</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search quote # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-slate-200 w-full sm:w-64"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-slate-800 flex-wrap h-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {QUOTE_STATUSES.map((status) => (
                    <TabsTrigger key={status} value={status}>
                      {QUOTE_STATUS_LABELS[status]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-slate-400 text-center py-8">Loading quotes...</p>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                {searchQuery || statusFilter !== "all"
                  ? "No quotes match your filters."
                  : "No quotes yet. Create your first quote to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100">{quote.quote_number}</span>
                      <Badge
                        className={`border ${QUOTE_STATUS_COLORS[quote.status] || QUOTE_STATUS_COLORS.draft}`}
                      >
                        {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 truncate">
                      {customerMap[quote.customer_id]?.full_name || "No customer"}
                      {quote.vehicle_id ? ` · ${vehicleLabel(quote.vehicle_id)}` : ""}
                      {" · "}
                      {(quote.line_items || []).length} line item
                      {(quote.line_items || []).length === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created {formatDate(quote.created_date)}
                      {quote.valid_until ? ` · Valid until ${formatDate(quote.valid_until)}` : ""}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-lg font-bold text-orange-500">{formatMoney(quote.total)}</p>
                    <p className="text-xs text-slate-500">incl. tax</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {actionButtons(quote)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(quote)}
                      className="text-slate-300 hover:text-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(quote)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

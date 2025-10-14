import React, { useState } from "react";
import api from "@/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, CreditCard, DollarSign } from "lucide-react";

export default function PaymentModal({ job, onClose }) {
  const queryClient = useQueryClient();
  const [paymentData, setPaymentData] = useState({
    payment_method: "card",
    amount_paid: job.total_cost || 0,
    payment_date: new Date().toISOString().split('T')[0]
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payment_status = paymentData.amount_paid >= job.total_cost ? 'paid' : 
                           paymentData.amount_paid > 0 ? 'partial' : 'unpaid';
      
  return api.entities.Job.update(job.id, {
        payment_status,
        payment_method: paymentData.payment_method,
        amount_paid: paymentData.amount_paid,
        payment_date: new Date(paymentData.payment_date).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-slate-800 w-full max-w-md">
        <CardHeader className="border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              Record Payment
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Amount Due:</span>
                <span className="text-2xl font-bold text-orange-500">${(job.total_cost || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Payment Method</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(value) => setPaymentData({...paymentData, payment_method: value})}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Amount Paid</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.amount_paid}
                  onChange={(e) => setPaymentData({...paymentData, amount_paid: parseFloat(e.target.value) || 0})}
                  className="bg-slate-800 border-slate-700 text-slate-200 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Payment Date</Label>
              <Input
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            {paymentData.amount_paid < job.total_cost && paymentData.amount_paid > 0 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-300">
                  <strong>Partial Payment:</strong> ${(job.total_cost - paymentData.amount_paid).toFixed(2)} remaining
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="bg-green-600 hover:bg-green-500"
              >
                {mutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Wrench, Users, Car, Receipt, Search } from 'lucide-react';

/**
 * Global search palette (Cmd/Ctrl+K). Searches jobs, customers, vehicles and
 * invoices across the whole shop and jumps straight to the record.
 */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.entities.Job.list('-created_date'),
    enabled: open,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.entities.Customer.list(),
    enabled: open,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.entities.Vehicle.list(),
    enabled: open,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.entities.Invoice.list('-created_date'),
    enabled: open,
  });

  const customerName = (id) => customers.find((c) => c.id === id)?.full_name || '';

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-lg px-4 py-2 w-96 border border-slate-700 text-left cursor-pointer"
      >
        <Search className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-500 flex-1">Search jobs, customers, vehicles...</span>
        <kbd className="text-[10px] text-slate-500 border border-slate-600 rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search the whole shop..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Work Orders">
            {jobs.slice(0, 6).map((j) => (
              <CommandItem
                key={j.id}
                value={`job ${j.job_number} ${j.description} ${customerName(j.customer_id)}`}
                onSelect={() => go(`/Jobs?job=${j.id}`)}
              >
                <Wrench className="mr-2 h-4 w-4 text-orange-400" />
                <span>{j.job_number}</span>
                <span className="text-slate-400 text-sm truncate ml-2">{String(j.description || '').slice(0, 48)}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Customers">
            {customers.slice(0, 6).map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.full_name} ${c.email} ${c.phone}`}
                onSelect={() => go(`/Customers?customer=${c.id}`)}
              >
                <Users className="mr-2 h-4 w-4 text-blue-400" />
                <span>{c.full_name}</span>
                <span className="text-slate-400 text-sm truncate ml-2">{c.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Vehicles">
            {vehicles.slice(0, 6).map((v) => (
              <CommandItem
                key={v.id}
                value={`vehicle ${v.year} ${v.make} ${v.model} ${v.license_plate} ${v.vin}`}
                onSelect={() => go(`/Vehicles?vehicle=${v.id}`)}
              >
                <Car className="mr-2 h-4 w-4 text-green-400" />
                <span>
                  {v.year} {v.make} {v.model}
                </span>
                <span className="text-slate-400 text-sm ml-2">{v.license_plate || v.vin?.slice(-6)}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Invoices">
            {invoices.slice(0, 4).map((inv) => (
              <CommandItem
                key={inv.id}
                value={`invoice ${inv.invoice_number} ${customerName(inv.customer_id)}`}
                onSelect={() => go('/Invoices')}
              >
                <Receipt className="mr-2 h-4 w-4 text-purple-400" />
                <span>{inv.invoice_number}</span>
                <span className="text-slate-400 text-sm ml-2">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.total || 0)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

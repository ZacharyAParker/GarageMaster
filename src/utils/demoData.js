import { Job, Customer, Vehicle, InventoryItem } from '@/api/entities';

/**
 * Demo data seeder. Populates a fresh shop with a realistic dataset so the app
 * is explorable immediately. Idempotent: refuses to run if customers exist.
 */

const CUSTOMERS = [
  { full_name: 'Marcus Rivera', email: 'marcus.rivera@example.com', phone: '(555) 201-3345', address: '412 Alder St, Springfield', status: 'vip', preferred_contact: 'phone' },
  { full_name: 'Elena Kovac', email: 'elena.kovac@example.com', phone: '(555) 318-7720', address: '88 Birchwood Ln, Springfield', status: 'active', preferred_contact: 'email' },
  { full_name: 'Dwayne Carter', email: 'dwayne.carter@example.com', phone: '(555) 442-9081', address: '1901 Route 9, Shelbyville', status: 'active', preferred_contact: 'text' },
  { full_name: 'Priya Natarajan', email: 'priya.n@example.com', phone: '(555) 550-2210', address: '73 Cypress Ct, Springfield', status: 'active', preferred_contact: 'email' },
  { full_name: 'Tom OConnell', email: 'tom.oconnell@example.com', phone: '(555) 611-4567', address: '12 Foundry Rd, Shelbyville', status: 'inactive', preferred_contact: 'phone' },
  { full_name: 'Aisha Bell', email: 'aisha.bell@example.com', phone: '(555) 728-3300', address: '950 Grand Ave, Springfield', status: 'vip', preferred_contact: 'text' },
];

const VEHICLES = [
  { customer: 0, make: 'Toyota', model: 'Tacoma', year: 2019, color: 'Midnight Black', mileage: 78400, vin: '3TMGZ5DN0KM012345', license_plate: 'SPR-8841', engine_type: '3.5L V6', transmission: 'automatic', status: 'picked_up' },
  { customer: 0, make: 'Honda', model: 'Civic', year: 2021, color: 'Sonic Gray', mileage: 32100, vin: '19XFL2H85ME023456', license_plate: 'SPR-1122', engine_type: '2.0L I4', transmission: 'automatic', status: 'checked_in' },
  { customer: 1, make: 'Ford', model: 'F-150', year: 2018, color: 'Race Red', mileage: 121500, vin: '1FTEW1EG7JFA34567', license_plate: 'SHB-4410', engine_type: '5.0L V8', transmission: 'automatic', status: 'in_service' },
  { customer: 2, make: 'Chevrolet', model: 'Malibu', year: 2017, color: 'Silver Ice', mileage: 96700, vin: '1G1ZD5ST7HF045678', license_plate: 'SHB-7789', engine_type: '1.5L Turbo', transmission: 'automatic', status: 'ready' },
  { customer: 3, make: 'Subaru', model: 'Outback', year: 2022, color: 'Forest Green', mileage: 18900, vin: '4S4BTANC1N3056789', license_plate: 'SPR-3390', engine_type: '2.5L H4', transmission: 'automatic', status: 'picked_up' },
  { customer: 4, make: 'BMW', model: '328i', year: 2015, color: 'Alpine White', mileage: 143800, vin: 'WBA3B1G51FNS06789', license_plate: 'SHB-9021', engine_type: '2.0L Turbo', transmission: 'manual', status: 'picked_up' },
  { customer: 5, make: 'Jeep', model: 'Wrangler', year: 2020, color: 'Firecracker Red', mileage: 45200, vin: '1C4HJXDG4LW078901', license_plate: 'SPR-5567', engine_type: '3.6L V6', transmission: 'manual', status: 'in_service' },
];

const PARTS = [
  { part_number: 'BRK-PD-F150', part_name: 'Brake Pads (Front)', brand: 'Motorcraft', category: 'brakes', quantity_in_stock: 4, minimum_stock: 6, unit_cost: 38.5, retail_price: 79.99, supplier: 'NAPA Auto Parts', storage_location: 'Shelf B2' },
  { part_number: 'OIL-FLT-UNIV', part_name: 'Oil Filter (Universal)', brand: 'FRAM', category: 'filters', quantity_in_stock: 32, minimum_stock: 12, unit_cost: 4.25, retail_price: 11.99, supplier: 'AutoZone Commercial', storage_location: 'Bin A1' },
  { part_number: 'BAT-GP-48', part_name: 'Battery Group 48', brand: 'Interstate', category: 'electrical', quantity_in_stock: 0, minimum_stock: 4, unit_cost: 112.0, retail_price: 199.99, supplier: 'NAPA Auto Parts', storage_location: 'Floor Rack C' },
  { part_number: 'AIR-FLT-CIV', part_name: 'Engine Air Filter', brand: 'K&N', category: 'filters', quantity_in_stock: 15, minimum_stock: 8, unit_cost: 14.75, retail_price: 34.99, supplier: 'Worldpac', storage_location: 'Bin A4' },
  { part_number: 'WIP-24IN', part_name: 'Wiper Blade 24in', brand: 'Bosch', category: 'body', quantity_in_stock: 9, minimum_stock: 10, unit_cost: 9.4, retail_price: 22.99, supplier: 'AutoZone Commercial', storage_location: 'Wall D1' },
  { part_number: 'COOL-ANT-GL', part_name: 'Coolant (Gal)', brand: 'Peak', category: 'cooling', quantity_in_stock: 21, minimum_stock: 10, unit_cost: 8.2, retail_price: 18.99, supplier: 'NAPA Auto Parts', storage_location: 'Fluids Shelf' },
  { part_number: 'SPK-PLG-IR5', part_name: 'Iridium Spark Plug', brand: 'NGK', category: 'engine', quantity_in_stock: 40, minimum_stock: 20, unit_cost: 7.9, retail_price: 16.99, supplier: 'Worldpac', storage_location: 'Bin B3' },
  { part_number: 'TIRE-SNS-A', part_name: 'Tire Pressure Sensor', brand: 'Schrader', category: 'suspension', quantity_in_stock: 2, minimum_stock: 6, unit_cost: 26.3, retail_price: 59.99, supplier: 'Tire Distributors Inc', storage_location: 'Bin C2' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + (n % 4), 30, 0, 0);
  return d.toISOString();
}

function daysAhead(n, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Seed demo data. Returns counts; refuses to double-seed. */
export async function seedDemoData() {
  const existing = await Customer.list();
  if (existing.length > 0) {
    return { skipped: true };
  }

  const createdCustomers = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = await Customer.create({
      ...CUSTOMERS[i],
      notes: '',
      avatar_url: '',
      customer_since: new Date(Date.now() - (400 - i * 37) * 86400000).toISOString().split('T')[0],
    });
    createdCustomers.push(c);
  }

  const createdVehicles = [];
  for (let i = 0; i < VEHICLES.length; i++) {
    const v = VEHICLES[i];
    const created = await Vehicle.create({
      customer_id: createdCustomers[v.customer].id,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin,
      license_plate: v.license_plate,
      color: v.color,
      mileage: v.mileage,
      engine_type: v.engine_type,
      transmission: v.transmission,
      status: v.status,
    });
    createdVehicles.push(created);
  }

  for (const p of PARTS) {
    await InventoryItem.create(p);
  }

  // Jobs spread across statuses and the last ~5 months for charts
  const jobSpecs = [
    { v: 0, status: 'completed', priority: 'normal', desc: 'Oil change + multi-point inspection', hours: 0.5, parts: [1], days: 130 },
    { v: 2, status: 'completed', priority: 'high', desc: 'Front brake pads replacement, rotors resurfaced', hours: 2.5, parts: [0], days: 98 },
    { v: 3, status: 'completed', priority: 'normal', desc: 'AC not blowing cold - recharge and leak dye test', hours: 1.5, parts: [], days: 64 },
    { v: 5, status: 'completed', priority: 'urgent', desc: 'No-start condition - battery and alternator replaced', hours: 3, parts: [2], days: 31 },
    { v: 4, status: 'completed', priority: 'normal', desc: '60k mile service: plugs, filters, fluids', hours: 3.5, parts: [3, 5, 6], days: 12 },
    { v: 1, status: 'awaiting_approval', priority: 'normal', desc: 'Check engine light - diagnostic shows evap leak', hours: 1, parts: [], days: 2 },
    { v: 6, status: 'in_progress', priority: 'high', desc: 'Lift kit install and alignment check', hours: 4, parts: [7], days: 1 },
    { v: 3, status: 'ready_for_pickup', priority: 'normal', desc: 'Wiper blades and cabin air filter replacement', hours: 0.5, parts: [4], days: 0 },
    { v: 2, status: 'waiting_for_parts', priority: 'high', desc: 'Rear differential fluid leak - waiting on gasket kit', hours: 0.5, parts: [], days: 4 },
    { v: 0, status: 'intake', priority: 'low', desc: 'Customer reports intermittent rattle over bumps', hours: 0, parts: [], days: 0 },
  ];

  const laborRate = 85;
  for (const spec of jobSpecs) {
    const vehicle = createdVehicles[spec.v];
    let partsCost = 0;
    const partsUsed = spec.parts.map((pi) => {
      const p = PARTS[pi];
      const lineCost = p.retail_price * 1;
      partsCost += lineCost;
      return {
        part_id: null,
        part_number: p.part_number,
        part_name: p.part_name,
        quantity: 1,
        unit_cost: p.retail_price,
        total_cost: Math.round(lineCost * 100) / 100,
      };
    });
    const laborCost = spec.hours * laborRate;
    await Job.create({
      vehicle_id: vehicle.id,
      customer_id: vehicle.customer_id,
      assigned_mechanic_id: null,
      status: spec.status,
      priority: spec.priority,
      description: spec.desc,
      job_number: `JOB-${String(100230 + jobSpecs.indexOf(spec))}`,
      check_in_date: daysAgo(spec.days),
      completed_date: ['completed'].includes(spec.status) ? daysAgo(Math.max(spec.days - 2, 0)) : null,
      labor_hours: spec.hours,
      labor_rate: laborRate,
      parts_used: partsUsed,
      total_parts_cost: Math.round(partsCost * 100) / 100,
      total_labor_cost: Math.round(laborCost * 100) / 100,
      total_cost: Math.round((partsCost + laborCost) * 100) / 100,
    });
  }

  return {
    seeded: true,
    customers: createdCustomers.length,
    vehicles: createdVehicles.length,
    parts: PARTS.length,
    jobs: jobSpecs.length,
  };
}

/** Upcoming appointment events for a fresh calendar. */
export async function seedDemoEvents(customers, vehicles) {
  const { Event } = await import('@/api/entities');
  if ((await Event.list()).length > 0 || !customers?.length) return { skipped: true };

  const specs = [
    { title: 'Civic drop-off - EVAP diagnosis', type: 'dropoff', day: 0, hour: 9, color: 'blue' },
    { title: 'F-150 alignment check', type: 'appointment', day: 1, hour: 11, color: 'orange' },
    { title: 'Wrangler lift kit follow-up', type: 'reminder', day: 2, hour: 14, color: 'purple' },
    { title: 'Malibu pickup', type: 'pickup', day: 0, hour: 17, color: 'green' },
    { title: 'Outback 60k service booking', type: 'appointment', day: 5, hour: 10, color: 'orange' },
    { title: 'Tacoma rattle inspection', type: 'appointment', day: 3, hour: 13, color: 'red' },
  ];
  for (const s of specs) {
    const cust = customers[s.day % customers.length];
    const custVehicles = vehicles.filter((v) => v.customer_id === cust.id);
    await Event.create({
      title: s.title,
      event_type: s.type,
      date: daysAhead(s.day, s.hour),
      duration_minutes: 60,
      customer_id: cust.id,
      vehicle_id: custVehicles[0]?.id || null,
      job_id: null,
      assigned_to: null,
      notes: '',
      color: s.color,
    });
  }
  return { seeded: specs.length };
}

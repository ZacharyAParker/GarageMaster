import api from './client';

// Canonical entity exports. Pages import from '@/api/entities'.

export const Customer = api.entities.Customer;
export const Vehicle = api.entities.Vehicle;
export const Job = api.entities.Job;
export const Inspection = api.entities.Inspection;
export const InventoryItem = api.entities.InventoryItem;
export const Quote = api.entities.Quote;
export const Invoice = api.entities.Invoice;
export const Message = api.entities.Message;
export const Event = api.entities.Event;
export const Notification = api.entities.Notification;
export const StockMovement = api.entities.StockMovement;

// auth sdk:
export const User = api.auth;

// New API surfaces
export const settings = api.settings;
export const backup = api.backup;
export default api;

import Layout from "./Layout.jsx";
import Setup from "./Setup.jsx";
import Login from "./Login.jsx";

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { seedDemoData, seedDemoEvents } from '@/utils/demoData';

// Route-level code splitting: each page loads on demand.
const Dashboard = lazy(() => import("./Dashboard"));
const Customers = lazy(() => import("./Customers"));
const Vehicles = lazy(() => import("./Vehicles"));
const Jobs = lazy(() => import("./Jobs"));
const Employees = lazy(() => import("./Employees"));
const Inspections = lazy(() => import("./Inspections"));
const Inventory = lazy(() => import("./Inventory"));
const Messages = lazy(() => import("./Messages"));
const Leaderboard = lazy(() => import("./Leaderboard"));
const Settings = lazy(() => import("./Settings"));
const Calendar = lazy(() => import("./Calendar"));
const Quotes = lazy(() => import("./Quotes"));
const Invoices = lazy(() => import("./Invoices"));
const Reports = lazy(() => import("./Reports"));

const PAGES = {
    Dashboard: Dashboard,
    Customers: Customers,
    Vehicles: Vehicles,
    Jobs: Jobs,
    Employees: Employees,
    Inspections: Inspections,
    Inventory: Inventory,
    Messages: Messages,
    Leaderboard: Leaderboard,
    Settings: Settings,
    Calendar: Calendar,
    Quotes: Quotes,
    Invoices: Invoices,
    Reports: Reports,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

function PageLoader() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading...</p>
            </div>
        </div>
    );
}

/** One-time demo data seeding on first authenticated launch. */
function useDemoSeed(enabled) {
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!enabled) return;
        if (localStorage.getItem('garagemaster_seeded')) return;
        let cancelled = false;
        (async () => {
            try {
                await seedDemoData();
                if (!cancelled) {
                    localStorage.setItem('garagemaster_seeded', '1');
                    const customers = await api.entities.Customer.list();
                    const vehicles = await api.entities.Vehicle.list();
                    await seedDemoEvents(customers, vehicles);
                    queryClient.invalidateQueries();
                }
            } catch (e) {
                console.warn('Demo seeding failed', e);
            }
        })();
        return () => { cancelled = true; };
    }, [enabled, queryClient]);
}

/** Keep react-query caches fresh across browser tabs. */
function useCrossTabSync() {
    const queryClient = useQueryClient();
    useEffect(() => {
        const handler = () => queryClient.invalidateQueries();
        window.addEventListener('garagemaster:data-changed', handler);
        return () => window.removeEventListener('garagemaster:data-changed', handler);
    }, [queryClient]);
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const [boot, setBoot] = useState({ loading: true, needsSetup: false, isAuthed: false });
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const needsSetup = !(await api.auth.isSetupComplete());
            const me = await api.auth.me();
            if (!mounted) return;
            setBoot({ loading: false, needsSetup, isAuthed: !!me });
        })();
        return () => { mounted = false; };
    }, [location.pathname]);

    useDemoSeed(boot.isAuthed);
    useCrossTabSync();

    if (boot.loading) return null;
    if (boot.needsSetup && location.pathname !== '/Setup') {
        return <Navigate to="/Setup" replace />;
    }
    if (!boot.needsSetup && !boot.isAuthed && location.pathname !== '/Login') {
        return <Navigate to="/Login" replace />;
    }

    return (
    <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoader />}>
            <Routes>
        <Route path="/Setup" element={<Setup />} />
        <Route path="/Login" element={<Login />} />

                    <Route path="/" element={<Dashboard />} />

                    <Route path="/Dashboard" element={<Dashboard />} />
                    <Route path="/Customers" element={<Customers />} />
                    <Route path="/Vehicles" element={<Vehicles />} />
                    <Route path="/Jobs" element={<Jobs />} />
                    <Route path="/Employees" element={<Employees />} />
                    <Route path="/Inspections" element={<Inspections />} />
                    <Route path="/Inventory" element={<Inventory />} />
                    <Route path="/Messages" element={<Messages />} />
                    <Route path="/Leaderboard" element={<Leaderboard />} />
                    <Route path="/Settings" element={<Settings />} />
                    <Route path="/Calendar" element={<Calendar />} />
                    <Route path="/Quotes" element={<Quotes />} />
                    <Route path="/Invoices" element={<Invoices />} />
                    <Route path="/Reports" element={<Reports />} />

            </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}

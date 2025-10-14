import Layout from "./Layout.jsx";
import Setup from "./Setup.jsx";
import Login from "./Login.jsx";

import Dashboard from "./Dashboard";

import Customers from "./Customers";

import Vehicles from "./Vehicles";

import Jobs from "./Jobs";

import Employees from "./Employees";

import Inspections from "./Inspections";

import Inventory from "./Inventory";

import Messages from "./Messages";

import Leaderboard from "./Leaderboard";

import Settings from "./Settings";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '@/api/client';

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

    if (boot.loading) return null;
    if (boot.needsSetup && location.pathname !== '/Setup') {
        return <Navigate to="/Setup" replace />;
    }
    if (!boot.needsSetup && !boot.isAuthed && location.pathname !== '/Login') {
        return <Navigate to="/Login" replace />;
    }
    
    return (
    <Layout currentPageName={currentPage}>
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
                
            </Routes>
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
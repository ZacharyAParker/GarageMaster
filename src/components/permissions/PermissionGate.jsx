import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

export default function PermissionGate({ 
  children, 
  positions = [], // The main roles: mechanic, manager, etc.
  fallback = null,
  requirePosition = false // Require ANY position to be set
}) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  if (!currentUser) return fallback;

  // Admins can access everything
  if (currentUser.role === 'admin') {
    return children;
  }

  // If requirePosition is true, user must have ANY position assigned
  if (requirePosition && !currentUser.position) {
    return fallback;
  }

  // Check if user's position matches the required positions
  const hasPosition = positions.length === 0 || positions.includes(currentUser.position);

  return hasPosition ? children : fallback;
}
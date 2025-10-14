import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Wrench, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VehicleDetails({ vehicle, customer, jobs, onBack, onEdit }) {
  const statusColors = {
    in_shop: "bg-orange-600 text-white border-0",
    awaiting_parts: "bg-red-600 text-white border-0",
    ready_for_pickup: "bg-green-600 text-white border-0",
    picked_up: "bg-slate-700 text-slate-300 border-0",
    archived: "bg-slate-800 text-slate-500 border-0"
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
          <p className="text-slate-400 mt-1">Vehicle details and service history</p>
        </div>
        <Button onClick={onEdit} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
          <Edit className="w-4 h-4 mr-2" />
          Edit Vehicle
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl text-slate-100">Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge className={`${statusColors[vehicle.status] || statusColors.picked_up} mt-1`}>
                {vehicle.status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            {vehicle.vin && (
              <div>
                <p className="text-xs text-slate-500">VIN</p>
                <p className="text-slate-300 font-mono text-sm">{vehicle.vin}</p>
              </div>
            )}

            {vehicle.license_plate && (
              <div>
                <p className="text-xs text-slate-500">License Plate</p>
                <p className="text-slate-300">{vehicle.license_plate}</p>
              </div>
            )}

            {vehicle.color && (
              <div>
                <p className="text-xs text-slate-500">Color</p>
                <p className="text-slate-300">{vehicle.color}</p>
              </div>
            )}

            {vehicle.mileage > 0 && (
              <div>
                <p className="text-xs text-slate-500">Mileage</p>
                <p className="text-slate-300">{vehicle.mileage.toLocaleString()} miles</p>
              </div>
            )}

            {vehicle.engine_type && (
              <div>
                <p className="text-xs text-slate-500">Engine</p>
                <p className="text-slate-300">{vehicle.engine_type}</p>
              </div>
            )}

            {vehicle.transmission && (
              <div>
                <p className="text-xs text-slate-500">Transmission</p>
                <p className="text-slate-300 capitalize">{vehicle.transmission}</p>
              </div>
            )}

            {customer && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Owner</p>
                <Link to={`${createPageUrl("Customers")}?customer=${customer.id}`}>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">{customer.full_name}</p>
                      <p className="text-xs text-slate-400">{customer.phone}</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-slate-100">Service History ({jobs.length})</CardTitle>
                <Link to={`${createPageUrl("Jobs")}?vehicle=${vehicle.id}`}>
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-slate-300">
                    <Wrench className="w-4 h-4 mr-2" />
                    Create Job
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No service history yet</p>
                  <Link to={`${createPageUrl("Jobs")}?vehicle=${vehicle.id}`}>
                    <Button size="sm" className="mt-4 bg-gradient-to-r from-orange-600 to-orange-500">
                      Create First Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <Link key={job.id} to={`${createPageUrl("Jobs")}?job=${job.id}`}>
                      <Card className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-slate-200">
                                {job.job_number || `Job #${job.id.slice(0, 8)}`}
                              </h3>
                              <p className="text-sm text-slate-400 mt-1">{job.description}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(job.check_in_date || job.created_date), "MMM d, yyyy")}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                job.status === 'completed' ? 'bg-green-900/50 text-green-300 border-0' :
                                job.status === 'in_progress' ? 'bg-orange-900/50 text-orange-300 border-0' :
                                'bg-slate-700 text-slate-300 border-0'
                              }>
                                {job.status?.replace(/_/g, ' ')}
                              </Badge>
                              {job.total_cost > 0 && (
                                <p className="text-slate-300 font-semibold mt-2">
                                  ${job.total_cost.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
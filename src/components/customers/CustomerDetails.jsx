import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Car, Edit } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CustomerDetails({ customer, vehicles, onBack, onEdit }) {
  const statusColors = {
    active: "bg-green-900/50 text-green-300 border-0",
    inactive: "bg-slate-700 text-slate-300 border-0",
    vip: "bg-orange-600 text-white border-0"
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-100">Customer Details</h1>
          <p className="text-slate-400 mt-1">View and manage customer information</p>
        </div>
        <Button onClick={onEdit} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400">
          <Edit className="w-4 h-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800 text-center">
            {customer.avatar_url ? (
              <img src={customer.avatar_url} alt={customer.full_name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-5xl">
                  {customer.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <CardTitle className="text-2xl text-slate-100">{customer.full_name}</CardTitle>
            <Badge className={`${statusColors[customer.status] || statusColors.active} mt-2`}>
              {customer.status || 'active'}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="break-all">{customer.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-300">
              <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p>{customer.phone}</p>
              </div>
            </div>

            {customer.address && (
              <div className="flex items-start gap-3 text-slate-300">
                <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p>{customer.address}</p>
                </div>
              </div>
            )}

            {customer.customer_since && (
              <div className="flex items-start gap-3 text-slate-300">
                <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Customer Since</p>
                  <p>{format(new Date(customer.customer_since), "MMMM d, yyyy")}</p>
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Internal Notes</p>
                <p className="text-slate-300 text-sm">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-slate-100">Vehicles ({vehicles.length})</CardTitle>
                <Link to={`${createPageUrl("Vehicles")}?customer=${customer.id}`}>
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-slate-300">
                    <Car className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {vehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No vehicles registered</p>
                  <Link to={`${createPageUrl("Vehicles")}?customer=${customer.id}`}>
                    <Button size="sm" className="mt-4 bg-gradient-to-r from-orange-600 to-orange-500">
                      Add First Vehicle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {vehicles.map((vehicle) => (
                    <Link key={vehicle.id} to={`${createPageUrl("Vehicles")}?vehicle=${vehicle.id}`}>
                      <Card className="bg-slate-800/50 border-slate-700 hover:border-orange-600 transition-all duration-200 cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-slate-200 text-lg">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {vehicle.license_plate && (
                                  <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700">
                                    {vehicle.license_plate}
                                  </Badge>
                                )}
                                {vehicle.vin && (
                                  <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700">
                                    VIN: {vehicle.vin.slice(-8)}
                                  </Badge>
                                )}
                                {vehicle.color && (
                                  <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-700">
                                    {vehicle.color}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge className={`${
                              vehicle.status === 'in_shop' ? 'bg-orange-600' :
                              vehicle.status === 'awaiting_parts' ? 'bg-red-600' :
                              vehicle.status === 'ready_for_pickup' ? 'bg-green-600' :
                              'bg-slate-700'
                            } text-white border-0`}>
                              {vehicle.status?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {vehicle.mileage && (
                            <p className="text-sm text-slate-400 mt-2">
                              {vehicle.mileage.toLocaleString()} miles
                            </p>
                          )}
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
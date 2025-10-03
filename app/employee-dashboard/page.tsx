"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Clock,
  Calendar,
  DollarSign,
  Download,
  Play,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DashboardLayout } from "@/components/dashboard-layout"

// Sample employee data
const employeeAttendance = [
  {
    date: "2025-06-22",
    timeIn: "08:00 AM",
    timeOut: "05:00 PM",
    status: "present",
    hours: 9.0,
  },
  {
    date: "2025-06-21",
    timeIn: "08:15 AM",
    timeOut: "05:00 PM",
    status: "late",
    hours: 8.75,
  },
  {
    date: "2025-06-20",
    timeIn: "08:00 AM",
    timeOut: "06:30 PM",
    status: "overtime",
    hours: 10.5,
  },
  {
    date: "2025-06-19",
    timeIn: "08:00 AM",
    timeOut: "05:00 PM",
    status: "present",
    hours: 9.0,
  },
  {
    date: "2025-06-18",
    timeIn: "-",
    timeOut: "-",
    status: "absent",
    hours: 0,
  },
]

const employeePayslips = [
  {
    period: "June 2025",
    basicPay: 50000,
    netPay: 44775,
    status: "paid",
    date: "2025-06-30",
  },
  {
    period: "May 2025",
    basicPay: 50000,
    netPay: 44775,
    status: "paid",
    date: "2025-05-31",
  },
  {
    period: "April 2025",
    basicPay: 50000,
    netPay: 44775,
    status: "paid",
    date: "2025-04-30",
  },
]

export default function EmployeeDashboard() {
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Present
          </Badge>
        )
      case "late":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Late
          </Badge>
        )
      case "overtime":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            Overtime
          </Badge>
        )
      case "absent":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {session?.user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">Here's your attendance and payroll overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">22</p>
                  <p className="text-xs text-gray-500">Days Present</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">176</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overtime</p>
                  <p className="text-2xl font-bold text-gray-900">8.5h</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Pay</p>
                  <p className="text-2xl font-bold text-gray-900">₱44,775</p>
                  <p className="text-xs text-gray-500">Last Month</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Tracking */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Tracking
            </CardTitle>
            <CardDescription>
              Clock in and out for today's work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button size="lg" className="h-16 bg-green-600 hover:bg-green-700">
                <Play className="w-6 h-6 mr-2" />
                Clock In
              </Button>
              <Button size="lg" variant="outline" className="h-16">
                <Square className="w-6 h-6 mr-2" />
                Clock Out
              </Button>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600">Current Time</p>
              <p className="text-2xl font-bold text-gray-900">{currentTime}</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your attendance history for the past week</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAttendance.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.timeIn}</TableCell>
                      <TableCell className="font-mono text-sm">{record.timeOut}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="font-medium">{record.hours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payslips */}
          <Card>
            <CardHeader>
              <CardTitle>My Payslips</CardTitle>
              <CardDescription>Download your recent payslips</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Basic Pay</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeePayslips.map((payslip, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{payslip.period}</TableCell>
                      <TableCell>₱{payslip.basicPay.toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        ₱{payslip.netPay.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Paid
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  DollarSign,
  Calendar,
  Users,
  Calculator,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { Payslip } from "@/components/payslip"

interface PayrollPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'CLOSED'
  createdAt: string
  totalEarnings: number
  totalDeductions: number
  totalNetPay: number
  employeeCount: number
  payrollItems: PayrollItem[]
}

interface PayrollItem {
  id: string
  basicPay: number
  overtimePay: number
  holidayPay: number
  totalEarnings: number
  totalDeductions: number
  netPay: number
  createdAt: string
  employee: {
    id: string
    employeeId: string
    firstName: string
    lastName: string
    position: string
    salaryRate: number
    salaryType: string
    department?: {
      name: string
    }
  }
  payrollPeriod: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
  }
  deductions: Array<{
    id: string
    amount: number
    deductionType: {
      id: string
      name: string
      description?: string
      isFixed: boolean
    }
  }>
}

interface PaginationData {
  page: number
  limit: number
  total: number
  pages: number
}

export default function PayrollPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([])
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [activeTab, setActiveTab] = useState("periods")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false)
  const [periodsPagination, setPeriodsPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [itemsPagination, setItemsPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    action: () => {},
  })
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingItem, setViewingItem] = useState<PayrollItem | null>(null)
  
  // Payslip state
  const [isPayslipOpen, setIsPayslipOpen] = useState(false)
  const [payslipData, setPayslipData] = useState<any>(null)
  const [periodForm, setPeriodForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
  })
  const [exporting, setExporting] = useState(false)

  const isEmployee = session?.user?.role === 'EMPLOYEE'
  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchPayrollPeriods()
    if (isEmployee) {
      fetchPayrollItems()
    }
  }, [periodsPagination.page, periodsPagination.limit])

  useEffect(() => {
    if (selectedPeriod && isAdmin) {
      fetchPayrollItems(selectedPeriod === 'all' ? undefined : selectedPeriod)
    }
  }, [selectedPeriod, itemsPagination.page, itemsPagination.limit, searchTerm])

  const fetchPayrollPeriods = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', periodsPagination.page.toString())
      params.append('limit', periodsPagination.limit.toString())
      
      const response = await fetch(`/api/payroll/periods?${params}`)
      if (!response.ok) throw new Error('Failed to fetch payroll periods')
      
      const data = await response.json()
      setPayrollPeriods(data.periods || [])
      setPeriodsPagination(data.pagination || periodsPagination)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payroll periods",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPayrollItems = async (payrollPeriodId?: string) => {
    try {
      const params = new URLSearchParams()
      if (payrollPeriodId && payrollPeriodId !== 'all') params.append('payrollPeriodId', payrollPeriodId)
      if (searchTerm) params.append('search', searchTerm)
      params.append('page', itemsPagination.page.toString())
      params.append('limit', itemsPagination.limit.toString())
      
      const response = await fetch(`/api/payroll/items?${params}`)
      if (!response.ok) throw new Error('Failed to fetch payroll items')
      
      const data = await response.json()
      setPayrollItems(data.payrollItems || [])
      setItemsPagination(data.pagination || itemsPagination)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payroll items",
        variant: "destructive",
      })
    }
  }

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payroll period')
      }

      toast({
        title: "Success",
        description: "Payroll period created successfully",
      })

      setIsCreatePeriodOpen(false)
      setPeriodForm({ name: "", startDate: "", endDate: "" })
      fetchPayrollPeriods()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      })
    }
  }

  const handleCalculatePayroll = (periodId: string, periodName: string) => {
    setConfirmDialog({
      open: true,
      title: "Process Payroll",
      description: `Are you sure you want to process payroll for "${periodName}"? This will process all employee attendance and generate payroll items.`,
      action: () => performCalculatePayroll(periodId),
    })
  }

  const handleRecalculatePayroll = (periodId: string, periodName: string) => {
    setConfirmDialog({
      open: true,
      title: "Recalculate Payroll",
      description: `Are you sure you want to recalculate payroll for "${periodName}"? This will update all existing payroll items with current data.`,
      action: () => performCalculatePayroll(periodId),
    })
  }


  const handleCloseEntry = (periodId: string, periodName: string) => {
    setConfirmDialog({
      open: true,
      title: "Close Payroll Period",
      description: `Are you sure you want to close "${periodName}"? Once closed, this payroll period cannot be reopened.`,
      action: () => performCloseEntry(periodId),
    })
  }

  const performCalculatePayroll = async (periodId: string) => {
    setCalculating(true)
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollPeriodId: periodId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process payroll')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: `Payroll processed for ${result.summary.totalEmployees} employees`,
      })

      fetchPayrollPeriods()
      if (selectedPeriod === periodId) {
        fetchPayrollItems(periodId)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      })
    } finally {
      setCalculating(false)
    }
  }

  const performCloseEntry = async (periodId: string) => {
    setCalculating(true)
    try {
      const response = await fetch(`/api/payroll/periods/${periodId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to close payroll entry')
      }

      toast({
        title: "Success",
        description: "Payroll period closed successfully",
      })

      // Refresh data
      fetchPayrollPeriods()
      fetchPayrollItems()
    } catch (error) {
      console.error('Error closing payroll entry:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to close payroll entry",
        variant: "destructive",
      })
    } finally {
      setCalculating(false)
    }
  }

  const handlePeriodsPageChange = (page: number) => {
    setPeriodsPagination(prev => ({ ...prev, page }))
  }

  const handlePeriodsPageSizeChange = (pageSize: number) => {
    setPeriodsPagination(prev => ({ ...prev, limit: pageSize, page: 1 }))
  }

  const handleItemsPageChange = (page: number) => {
    setItemsPagination(prev => ({ ...prev, page }))
  }

  const handleItemsPageSizeChange = (pageSize: number) => {
    setItemsPagination(prev => ({ ...prev, limit: pageSize, page: 1 }))
  }

  const handleViewDetails = (item: PayrollItem) => {
    setViewingItem(item)
    setIsViewDialogOpen(true)
  }

  const handleGeneratePayslip = async (item: PayrollItem) => {
    try {
      const response = await fetch('/api/payroll/generate-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollItemId: item.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate payslip')
      }

      const data = await response.json()
      setPayslipData(data.payslipData)
      setIsPayslipOpen(true)
      
      toast({
        title: "Success",
        description: `Payslip generated for ${item.employee.firstName} ${item.employee.lastName}`,
      })
    } catch (error) {
      console.error('Error generating payslip:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate payslip",
        variant: "destructive",
      })
    }
  }

  const handleExportReport = async (payrollPeriodId: string) => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/payroll/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payrollPeriodId,
          format: 'excel'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export report')
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `payroll_report_${Date.now()}.xlsx`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Payroll report exported successfully",
      })
    } catch (error) {
      console.error('Error exporting report:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export report",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: "secondary" as const, label: "Draft", icon: Clock },
      CLOSED: { variant: "destructive" as const, label: "Closed", icon: AlertTriangle },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Server-side filtering is now handled by the API
  const filteredPayrollItems = payrollItems

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
            <p className="text-muted-foreground">
              Manage payroll periods and employee compensation
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isCreatePeriodOpen} onOpenChange={setIsCreatePeriodOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Period</DialogTitle>
                  <DialogDescription>
                    Set up a new payroll period for processing employee payments
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Period Name</Label>
                    <Input
                      id="name"
                      value={periodForm.name}
                      onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                      placeholder="e.g., October 2024 - 1st Half"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={periodForm.startDate}
                        onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={periodForm.endDate}
                        onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreatePeriodOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Period</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {isAdmin && <TabsTrigger value="periods">Payroll Periods</TabsTrigger>}
            <TabsTrigger value="items">
              {isEmployee ? "My Payslips" : "Payroll Items"}
            </TabsTrigger>
          </TabsList>

          {/* Payroll Periods Tab */}
          {isAdmin && (
            <TabsContent value="periods" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{payrollPeriods.length}</div>
                    <p className="text-xs text-muted-foreground">payroll periods</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Periods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {payrollPeriods.filter(p => p.status === 'DRAFT').length}
                    </div>
                    <p className="text-xs text-muted-foreground">in draft status</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        payrollPeriods.reduce((sum, period) => sum + period.totalNetPay, 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">all periods</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Employees Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {payrollPeriods.reduce((sum, period) => sum + period.employeeCount, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">total payments</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payroll Periods</CardTitle>
                  <CardDescription>
                    Manage payroll periods and calculate employee payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead>Total Earnings</TableHead>
                        <TableHead>Total Deductions</TableHead>
                        <TableHead>Net Pay</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollPeriods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">{period.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(period.startDate).toLocaleDateString()} - {' '}
                              {new Date(period.endDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(period.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{period.employeeCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(period.totalEarnings)}</TableCell>
                          <TableCell>{formatCurrency(period.totalDeductions)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(period.totalNetPay)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedPeriod(period.id)
                                    setActiveTab("items")
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Items
                                </DropdownMenuItem>
                                {period.status === 'DRAFT' && (
                                  <>
                                    {(!period.payrollItems || period.payrollItems.length === 0) ? (
                                      <DropdownMenuItem
                                        onClick={() => handleCalculatePayroll(period.id, period.name)}
                                        disabled={calculating}
                                      >
                                        <Calculator className="mr-2 h-4 w-4" />
                                        Process Payroll
                                      </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleRecalculatePayroll(period.id, period.name)}
                                          disabled={calculating}
                                        >
                                          <RefreshCw className="mr-2 h-4 w-4" />
                                          Recalculate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleCloseEntry(period.id, period.name)}
                                          disabled={calculating}
                                        >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Close Period
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleExportReport(period.id)}
                                  disabled={exporting}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {exporting ? "Exporting..." : "Export Report"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {payrollPeriods.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="text-muted-foreground">
                              No payroll periods found. Create your first period to get started.
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    currentPage={periodsPagination.page}
                    totalPages={periodsPagination.pages}
                    pageSize={periodsPagination.limit}
                    totalItems={periodsPagination.total}
                    onPageChange={handlePeriodsPageChange}
                    onPageSizeChange={handlePeriodsPageSizeChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Payroll Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {isAdmin && (
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select payroll period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    {payrollPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {isEmployee ? "My Payslips" : "Payroll Items"}
                    </CardTitle>
                    <CardDescription>
                      {isEmployee 
                        ? "View your payroll history and download payslips"
                        : `${filteredPayrollItems.length} payroll item${filteredPayrollItems.length !== 1 ? 's' : ''} found`
                      }
                    </CardDescription>
                  </div>
                  {isAdmin && selectedPeriod !== "all" && filteredPayrollItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const period = payrollPeriods.find(p => p.id === selectedPeriod)
                        if (period) {
                          handleRecalculatePayroll(period.id, period.name)
                        }
                      }}
                      disabled={calculating}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalculate All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Basic Pay</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Holiday Pay</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrollItems.map((item) => (
                      <TableRow key={item.id}>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {item.employee.firstName[0]}{item.employee.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {item.employee.firstName} {item.employee.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {item.employee.employeeId} • {item.employee.position}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.payrollPeriod.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(item.payrollPeriod.startDate).toLocaleDateString()} - {' '}
                              {new Date(item.payrollPeriod.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.payrollPeriod.status === 'DRAFT' ? 'secondary' : 'destructive'}>
                            {item.payrollPeriod.status === 'DRAFT' ? 'Processed' : 'Closed'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.basicPay)}</TableCell>
                        <TableCell>{formatCurrency(item.overtimePay)}</TableCell>
                        <TableCell>{formatCurrency(item.holidayPay)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.totalEarnings)}
                        </TableCell>
                        <TableCell>{formatCurrency(item.totalDeductions)}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(item.netPay)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleGeneratePayslip(item)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Payslip
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayrollItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8">
                          <div className="text-muted-foreground">
                            No payroll items found.
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <DataTablePagination
                  currentPage={itemsPagination.page}
                  totalPages={itemsPagination.pages}
                  pageSize={itemsPagination.limit}
                  totalItems={itemsPagination.total}
                  onPageChange={handleItemsPageChange}
                  onPageSizeChange={handleItemsPageSizeChange}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText="Confirm"
          onConfirm={() => {
            confirmDialog.action()
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }}
        />

        {/* View Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payroll Details</DialogTitle>
              <DialogDescription>
                Detailed breakdown of payroll calculations
              </DialogDescription>
            </DialogHeader>
            {viewingItem && (
              <div className="space-y-6">
                {/* Employee Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Employee Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Name</Label>
                      <p className="font-medium">
                        {viewingItem.employee.firstName} {viewingItem.employee.lastName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Employee ID</Label>
                      <p className="font-medium">{viewingItem.employee.employeeId}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Position</Label>
                      <p className="font-medium">{viewingItem.employee.position}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Department</Label>
                      <p className="font-medium">{viewingItem.employee.department?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Payroll Period */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Payroll Period</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Period Name</Label>
                      <p className="font-medium">{viewingItem.payrollPeriod.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <p className="font-medium">{viewingItem.payrollPeriod.status}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Start Date</Label>
                      <p className="font-medium">
                        {new Date(viewingItem.payrollPeriod.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">End Date</Label>
                      <p className="font-medium">
                        {new Date(viewingItem.payrollPeriod.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Pay</span>
                      <span className="font-medium">{formatCurrency(viewingItem.basicPay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overtime Pay</span>
                      <span className="font-medium">{formatCurrency(viewingItem.overtimePay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Holiday Pay</span>
                      <span className="font-medium">{formatCurrency(viewingItem.holidayPay)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total Earnings</span>
                      <span className="font-semibold">{formatCurrency(viewingItem.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Deductions</h3>
                  {viewingItem.deductions.length > 0 ? (
                    <div className="space-y-2">
                      {viewingItem.deductions.map((deduction) => (
                        <div key={deduction.id} className="flex justify-between">
                          <span>{deduction.deductionType.name}</span>
                          <span className="font-medium">{formatCurrency(deduction.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Deductions</span>
                        <span className="font-semibold">{formatCurrency(viewingItem.totalDeductions)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No deductions applied</p>
                  )}
                </div>

                {/* Net Pay */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Net Pay</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(viewingItem.netPay)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => viewingItem && handleGeneratePayslip(viewingItem)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Payslip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payslip Dialog */}
        <Payslip
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          payslipData={payslipData}
        />
      </div>
    </DashboardLayout>
  )
}
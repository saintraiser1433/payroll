import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const generatePayslipSchema = z.object({
  payrollItemId: z.string().min(1, 'Payroll item ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'DEPARTMENT_HEAD', 'EMPLOYEE'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { payrollItemId } = generatePayslipSchema.parse(body)

    // Get payroll item with all related data
    const payrollItem = await prisma.payrollItem.findUnique({
      where: { id: payrollItemId },
      include: {
        employee: {
          include: {
            department: true,
            schedule: true
          }
        },
        payrollPeriod: true,
        deductions: {
          include: {
            deductionType: true
          }
        }
      }
    })

    if (!payrollItem) {
      return NextResponse.json({ error: 'Payroll item not found' }, { status: 404 })
    }

    // For EMPLOYEE role, ensure they can only access their own payroll items
    if (session.user?.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id }
      })
      
      if (!employee || employee.id !== payrollItem.employeeId) {
        return NextResponse.json({ error: 'Unauthorized - You can only access your own payslips' }, { status: 403 })
      }
    }

    // Calculate payslip data
    const payslipData = {
      companyName: 'DBE Beach Resort',
      companyFullName: 'DBE BEACH RESORT - EMPLOYEE PAYROLL MANAGEMENT SYSTEM',
      period: payrollItem.payrollPeriod,
      employee: payrollItem.employee,
      basicPay: payrollItem.basicPay,
      overtimePay: payrollItem.overtimePay,
      grossPay: payrollItem.totalEarnings,
      deductions: payrollItem.deductions,
      totalDeductions: payrollItem.totalDeductions,
      netPay: payrollItem.netPay,
      generatedAt: new Date()
    }

    return NextResponse.json({ payslipData })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error generating payslip:', error)
    return NextResponse.json(
      { error: 'Failed to generate payslip' },
      { status: 500 }
    )
  }
}

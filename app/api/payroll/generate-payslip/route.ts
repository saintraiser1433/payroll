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
    
    if (!session || session.user?.role !== 'ADMIN') {
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

    // Calculate payslip data
    const payslipData = {
      companyName: 'DBEEPM',
      companyFullName: 'DENNIS BEJARASCO EMPLEO EMPLOYEE AND PAYROLL MANAGEMENT SYSTEM',
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

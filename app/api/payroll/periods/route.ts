import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const payrollPeriodSchema = z.object({
  name: z.string().min(1, 'Period name is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
})

// GET /api/payroll/periods - Get all payroll periods
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status
    }

    const [periods, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where,
        skip,
        take: limit,
        include: {
          payrollItems: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  firstName: true,
                  lastName: true,
                  position: true,
                  department: {
                    select: { name: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payrollPeriod.count({ where })
    ])

    // Calculate totals for each period
    const periodsWithTotals = periods.map(period => {
      const totalEarnings = period.payrollItems.reduce((sum, item) => sum + item.totalEarnings, 0)
      const totalDeductions = period.payrollItems.reduce((sum, item) => sum + item.totalDeductions, 0)
      const totalNetPay = period.payrollItems.reduce((sum, item) => sum + item.netPay, 0)

      return {
        ...period,
        totalEarnings,
        totalDeductions,
        totalNetPay,
        employeeCount: period.payrollItems.length
      }
    })

    return NextResponse.json({
      periods: periodsWithTotals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/periods - Create new payroll period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = payrollPeriodSchema.parse(body)

    // Validate date range
    if (validatedData.endDate <= validatedData.startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Check for overlapping periods
    const overlappingPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        OR: [
          {
            AND: [
              { startDate: { lte: validatedData.startDate } },
              { endDate: { gte: validatedData.startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: validatedData.endDate } },
              { endDate: { gte: validatedData.endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: validatedData.startDate } },
              { endDate: { lte: validatedData.endDate } }
            ]
          }
        ]
      }
    })

    if (overlappingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period overlaps with existing period' },
        { status: 400 }
      )
    }

    const period = await prisma.payrollPeriod.create({
      data: validatedData,
      include: {
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                position: true,
                department: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating payroll period:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


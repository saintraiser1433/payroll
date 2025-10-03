import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/payroll/items - Get payroll items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const payrollPeriodId = searchParams.get('payrollPeriodId')
    const employeeId = searchParams.get('employeeId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (payrollPeriodId) {
      where.payrollPeriodId = payrollPeriodId
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (search) {
      where.employee = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ]
      }
    }

    // If user is an employee, only show their own payroll items
    if (session.user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: session.user.id }
      })
      if (employee) {
        where.employeeId = employee.id
      }
    }

    const [payrollItems, total] = await Promise.all([
      prisma.payrollItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              salaryGrade: {
                select: {
                  id: true,
                  grade: true,
                  salaryRate: true
                }
              },
              salaryType: true,
              department: {
                select: { name: true }
              }
            }
          },
          payrollPeriod: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              status: true
            }
          },
          deductions: {
            include: {
              deductionType: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isFixed: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payrollItem.count({ where })
    ])

    return NextResponse.json({
      payrollItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching payroll items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

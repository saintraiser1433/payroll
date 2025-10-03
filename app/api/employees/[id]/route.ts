import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const employeeUpdateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  position: z.string().min(1, 'Position is required').optional(),
  jobDescription: z.string().optional(),
  salaryGradeId: z.string().optional(),
  salaryType: z.enum(['HOURLY', 'DAILY', 'MONTHLY']).optional(),
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  departmentId: z.string().optional(),
  scheduleId: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        schedule: true,
        user: {
          select: { id: true, email: true, role: true }
        },
        attendances: {
          take: 10,
          orderBy: { date: 'desc' }
        },
        payrollItems: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            payrollPeriod: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = employeeUpdateSchema.parse(body)

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee ID already exists (if being updated)
    if (validatedData.employeeId && validatedData.employeeId !== existingEmployee.employeeId) {
      const duplicateEmployeeId = await prisma.employee.findUnique({
        where: { employeeId: validatedData.employeeId }
      })

      if (duplicateEmployeeId) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 400 }
        )
      }
    }

    // Check if email already exists (if being updated)
    if (validatedData.email && validatedData.email !== existingEmployee.email) {
      const duplicateEmail = await prisma.employee.findUnique({
        where: { email: validatedData.email }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: validatedData,
      include: {
        department: true,
        schedule: true,
        user: {
          select: { id: true, email: true, role: true }
        }
      }
    })

    return NextResponse.json(employee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

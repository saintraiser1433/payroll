import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export async function seedDatabase() {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12)
    const admin = await prisma.user.upsert({
      where: { email: "admin@pyrol.com" },
      update: {},
      create: {
        email: "admin@pyrol.com",
        password: adminPassword,
        role: "ADMIN",
      },
    })

    // Create department head user
    const deptHeadPassword = await bcrypt.hash("dept123", 12)
    const deptHeadUser = await prisma.user.upsert({
      where: { email: "depthead@pyrol.com" },
      update: {},
      create: {
        email: "depthead@pyrol.com",
        password: deptHeadPassword,
        role: "DEPARTMENT_HEAD",
      },
    })

    // Create employee user
    const employeePassword = await bcrypt.hash("emp123", 12)
    const employeeUser = await prisma.user.upsert({
      where: { email: "employee@pyrol.com" },
      update: {},
      create: {
        email: "employee@pyrol.com",
        password: employeePassword,
        role: "EMPLOYEE",
      },
    })

    // Create departments
    const itDepartment = await prisma.department.upsert({
      where: { name: "IT" },
      update: {},
      create: {
        name: "IT",
        description: "Information Technology Department",
      },
    })

    const hrDepartment = await prisma.department.upsert({
      where: { name: "HR" },
      update: {},
      create: {
        name: "HR",
        description: "Human Resources Department",
      },
    })

    // Create schedules
    let regularSchedule = await prisma.schedule.findFirst({
      where: { name: "Regular Day Shift" }
    })
    
    if (!regularSchedule) {
      regularSchedule = await prisma.schedule.create({
        data: {
          name: "Regular Day Shift",
          timeIn: "08:00",
          timeOut: "17:00",
          workingDays: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
        },
      })
    }

    // Create salary grades
    const adminSalaryGrade = await prisma.salaryGrade.upsert({
      where: { grade: "A1" },
      update: {},
      create: {
        grade: "A1",
        description: "Administrative Grade 1",
        salaryRate: 80000,
      },
    })

    const empSalaryGrade = await prisma.salaryGrade.upsert({
      where: { grade: "B1" },
      update: {},
      create: {
        grade: "B1",
        description: "Employee Grade 1",
        salaryRate: 50000,
      },
    })

    // Create admin employee profile
    await prisma.employee.upsert({
      where: { employeeId: "ADMIN001" },
      update: {},
      create: {
        employeeId: "ADMIN001",
        firstName: "System",
        lastName: "Administrator",
        email: "admin@pyrol.com",
        phone: "+63 912 345 6789",
        position: "System Administrator",
        salaryType: "MONTHLY",
        hireDate: new Date("2023-01-01"),
        userId: admin.id,
        departmentId: itDepartment.id,
        scheduleId: regularSchedule.id,
        salaryGradeId: adminSalaryGrade.id,
      },
    })

    // Create department head employee profile
    const deptHeadEmployee = await prisma.employee.upsert({
      where: { employeeId: "DEPT001" },
      update: {},
      create: {
        employeeId: "DEPT001",
        firstName: "Jane",
        lastName: "Smith",
        email: "depthead@pyrol.com",
        phone: "+63 912 345 6791",
        position: "IT Department Head",
        salaryType: "MONTHLY",
        hireDate: new Date("2023-02-01"),
        userId: deptHeadUser.id,
        departmentId: itDepartment.id,
        scheduleId: regularSchedule.id,
        salaryGradeId: adminSalaryGrade.id,
      },
    })

    // Update IT department to have a head
    await prisma.department.update({
      where: { id: itDepartment.id },
      data: { headId: deptHeadEmployee.id },
    })

    // Create employee profile
    await prisma.employee.upsert({
      where: { employeeId: "EMP001" },
      update: {},
      create: {
        employeeId: "EMP001",
        firstName: "John",
        lastName: "Doe",
        email: "employee@pyrol.com",
        phone: "+63 912 345 6790",
        position: "Software Developer",
        salaryType: "MONTHLY",
        hireDate: new Date("2023-06-01"),
        userId: employeeUser.id,
        departmentId: itDepartment.id,
        scheduleId: regularSchedule.id,
        salaryGradeId: empSalaryGrade.id,
      },
    })

    // Create deduction types
    await prisma.deductionType.upsert({
      where: { name: "SSS Contribution" },
      update: {},
      create: {
        name: "SSS Contribution",
        description: "Social Security System contribution",
        isFixed: false,
        amount: 4.5, // 4.5%
      },
    })

    await prisma.deductionType.upsert({
      where: { name: "PhilHealth" },
      update: {},
      create: {
        name: "PhilHealth",
        description: "Philippine Health Insurance Corporation",
        isFixed: false,
        amount: 2.75, // 2.75%
      },
    })

    await prisma.deductionType.upsert({
      where: { name: "Pag-IBIG" },
      update: {},
      create: {
        name: "Pag-IBIG",
        description: "Home Development Mutual Fund",
        isFixed: true,
        amount: 100, // Fixed ₱100
      },
    })

    await prisma.deductionType.upsert({
      where: { name: "Withholding Tax" },
      update: {},
      create: {
        name: "Withholding Tax",
        description: "Income tax withholding",
        isFixed: false,
        amount: 15, // 15%
      },
    })

    // Create sample attendance records
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const employees = await prisma.employee.findMany()
    
    for (const employee of employees) {
      // Yesterday's attendance
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: yesterday
          }
        },
        update: {},
        create: {
          employeeId: employee.id,
          date: yesterday,
          timeIn: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0),
          timeOut: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0),
          status: 'PRESENT',
          lateMinutes: 0,
          overtimeMinutes: 0,
          undertimeMinutes: 0,
        }
      })

      // Today's attendance (only time in for some employees)
      const timeInHour = Math.random() > 0.3 ? 8 : 9 // 70% on time, 30% late
      const lateMinutes = timeInHour > 8 ? (timeInHour - 8) * 60 : 0
      
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: today
          }
        },
        update: {},
        create: {
          employeeId: employee.id,
          date: today,
          timeIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), timeInHour, 0),
          status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
          lateMinutes,
          overtimeMinutes: 0,
          undertimeMinutes: 0,
        }
      })
    }

    // Create sample payroll periods and items
    const currentMonth = new Date()
    const lastMonth = new Date(currentMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    // Create payroll period for last month
    const payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        name: `${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Payroll`,
        startDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        endDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
        status: 'CLOSED'
      }
    })

    // Create payroll items for each employee
    for (const employee of employees) {
      const basicPay = employee.salaryGrade?.salaryRate || 25000 // Default salary
      const sssDeduction = basicPay * 0.045 // 4.5%
      const philhealthDeduction = basicPay * 0.0275 // 2.75%
      const pagibigDeduction = basicPay * 0.02 // 2%
      const totalDeductions = sssDeduction + philhealthDeduction + pagibigDeduction
      const netPay = basicPay - totalDeductions

      await prisma.payrollItem.create({
        data: {
          employeeId: employee.id,
          payrollPeriodId: payrollPeriod.id,
          basicPay: basicPay,
          overtimePay: 0,
          holidayPay: 0,
          totalEarnings: basicPay,
          totalDeductions: totalDeductions,
          netPay: netPay
        }
      })
    }

    console.log("Database seeded successfully!")
    console.log("Demo accounts created:")
    console.log("Admin: admin@pyrol.com / admin123")
    console.log("Department Head: depthead@pyrol.com / dept123")
    console.log("Employee: employee@pyrol.com / emp123")
    console.log("Sample attendance records created for testing")
    console.log("Sample payroll data created for testing")

  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seeding failed:", error)
      process.exit(1)
    })
}

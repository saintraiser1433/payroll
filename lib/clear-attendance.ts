import { prisma } from './prisma'

async function clearAttendanceData() {
  try {
    console.log('🗑️  Starting to clear attendance data...')
    
    // Delete all attendance records
    const deletedCount = await prisma.attendance.deleteMany({})
    
    console.log(`✅ Successfully deleted ${deletedCount.count} attendance records`)
    
    // Reset auto-increment if using MySQL/PostgreSQL (not needed for SQLite)
    // For SQLite, the IDs will continue from where they left off
    
    console.log('🎉 Attendance data cleared successfully!')
    
  } catch (error) {
    console.error('❌ Error clearing attendance data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
clearAttendanceData()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })


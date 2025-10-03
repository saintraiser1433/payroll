# PYROL - Employee & Payroll Management System

A comprehensive employee and payroll management system built by **Dennis Bejarasco** using modern web technologies.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript
- **UI**: ShadCN/UI + Tailwind CSS (dark/light mode support)
- **Backend**: Next.js API routes (server actions)
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js (credential provider, role-based)
- **PDF Export**: jsPDF for payslip generation
- **Charts**: Recharts for analytics visualization

## ✨ System Features

### 🔐 Authentication & Roles
- **Admin Role**: Manage employees, attendance, payroll, schedules, deductions
- **Employee Role**: View attendance history, log attendance, view payslips
- JWT session management with NextAuth
- Role-based route protection (middleware)

### 👤 Employee Management
- CRUD operations for employees (name, ID, position, salary rate, etc.)
- Department & schedule assignment
- Profile picture upload support
- Advanced search and filtering
- Employee status management

### 📅 Schedule Management
- Define working schedules (time in/out, working days)
- Multiple shift support (day/night/weekend/flexible)
- Assign schedules to employees
- Calculate working hours automatically

### 🕑 Attendance Management
- Employee time in/out tracking
- Automatic computation of lateness, undertime, overtime
- Admin review & correction capabilities
- Attendance history dashboard with filters
- Real-time attendance monitoring

### 💰 Payroll Management
- Define payroll periods (start date, end date)
- Automated payroll computation per employee:
  - Basic pay calculation
  - Overtime pay computation
  - Cash advances tracking
  - Deductions (SSS, PhilHealth, Pag-IBIG, Tax)
  - Net pay calculation
- Generate payroll records with detailed breakdowns
- Export payslips to PDF
- Payroll history and reporting

### 📊 Reports & Analytics
- Attendance reports per employee/department
- Payroll history and trends
- Employee salary breakdown analysis
- Interactive charts and visualizations
- Key insights and recommendations

## 🏗️ Project Structure

```
pyrol/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── employees/         # Employee management
│   ├── attendance/        # Attendance tracking
│   ├── schedules/         # Schedule management
│   ├── payroll/          # Payroll processing
│   ├── analytics/        # Reports & analytics
│   └── settings/         # System settings
├── components/            # Reusable UI components
│   ├── ui/               # ShadCN/UI components
│   ├── dashboard-layout.tsx
│   └── theme-provider.tsx
├── lib/                  # Utility libraries
│   ├── prisma.ts         # Database client
│   ├── pdf-generator.ts  # PDF generation
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema
└── public/               # Static assets
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pyrol
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/payroll_db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Setup database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 UI Pages

### Admin Dashboard
- **Dashboard**: Analytics overview (attendance, payroll summaries, charts)
- **Employees**: Employee list + CRUD operations + schedule assignment
- **Attendance**: Manage attendance logs + corrections + bulk operations
- **Schedules**: Create and manage work schedules
- **Payroll**: Generate payroll + history + payslip export
- **Analytics**: Attendance reports, payroll analytics, department insights

### Employee Dashboard
- **Dashboard**: Personal attendance stats, upcoming schedules
- **Attendance**: Time in/out interface + attendance history
- **Payroll**: View and download personal payslips
- **Profile**: Update personal information

## 🔄 Workflow

1. **Setup Phase**
   - Admin creates employee profiles
   - Define work schedules
   - Configure deduction types and rates

2. **Daily Operations**
   - Employees log in and punch attendance (time in/out)
   - System automatically computes lateness, overtime, undertime
   - Admin can review and correct attendance logs

3. **Payroll Processing**
   - Admin creates payroll period
   - System calculates salaries based on attendance and rates
   - Generate payslips with detailed breakdowns
   - Employees can view and download payslips

4. **Reporting & Analytics**
   - Monitor attendance patterns and trends
   - Analyze payroll costs and department performance
   - Generate comprehensive reports

## 🛠️ Key Components

### Database Models
- **User**: Authentication and role management
- **Employee**: Employee profiles and information
- **Department**: Organizational structure
- **Schedule**: Work schedule definitions
- **Attendance**: Time tracking records
- **PayrollPeriod**: Payroll processing periods
- **PayrollItem**: Individual employee payroll records
- **DeductionType**: Configurable deduction types

### PDF Generation
- Professional payslip templates
- Company branding and formatting
- Detailed earnings and deductions breakdown
- Download and preview functionality

### Analytics Features
- Interactive charts using Recharts
- Real-time data visualization
- Key performance indicators
- Trend analysis and insights

## 🔧 Configuration

### Deduction Types
The system supports configurable deduction types:
- **SSS Contribution**: 4.5% of basic salary
- **PhilHealth**: 2.75% of basic salary
- **Pag-IBIG**: Fixed ₱100 monthly
- **Withholding Tax**: Progressive tax rates

### Schedule Types
- **Regular Day Shift**: 8:00 AM - 5:00 PM
- **Night Shift**: 10:00 PM - 6:00 AM
- **Flexible Hours**: Configurable start/end times
- **Weekend Shift**: Saturday-Sunday coverage
- **Part-time**: Reduced working hours

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Configure production database
- Set up proper environment variables
- Enable SSL for security
- Configure file upload storage (AWS S3 recommended)

## 📝 License

This project is developed by **Dennis Bejarasco** as an Employee and Payroll Management System.

## 🤝 Contributing

This is a proprietary system developed for payroll management. For support or customization requests, please contact the developer.

---

**Developed by Dennis Bejarasco**  
*Employee & Payroll Management System Specialist*


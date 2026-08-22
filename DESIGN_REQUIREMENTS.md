# OOdo HRMS Design Requirements

This document outlines the detailed design requirements, page structures, calculations, and rules for the **OOdo Human Resource Management System (HRMS)** based on the wireframes and notes from the Excalidraw mockup.

---

## 1. Authentication (Login / Sign Up)

### Login Page
- **Fields:**
  - **Login ID / Email:** Input field for user identification.
  - **Password:** Password input field.
- **Actions:**
  - **SIGN IN:** Primary action button.
  - **Sign Up Link:** "Don't have an Account? Sign Up" redirects the user to the Sign Up page.

### Sign Up Page
- **Fields:**
  - **Company Name:** Input field, with an associated **Upload Logo** option.
  - **Name:** Input field for the admin's name.
  - **Email:** Input field for the admin's email.
  - **Phone:** Input field for the contact number.
  - **Password:** Password input with a show/hide toggle.
  - **Confirm Password:** Password input with a show/hide toggle.
- **Actions:**
  - **Sign Up:** Primary action button to create the company and admin account.
  - **Sign In Link:** "Already have an account? Sign In" redirects back to the login page.

### Login ID Generation Logic
The system automatically generates a unique Login ID for each newly created employee using the following pattern:
$$\text{Login ID} = [\text{CompanyInitials}][\text{EmployeeInitials}][\text{YearOfJoining}][\text{SerialNumber}]$$

- **Example:** `OIJODO20220001`
- **Breakdown:**
  - **Company Initials (e.g., `OI`):** First letters of the company name (e.g., *Odoo India*).
  - **Employee Initials (e.g., `JODO`):** First two letters of the employee's first name and first two letters of the last name (e.g., *John Doe*).
  - **Year of Joining (e.g., `2022`):** 4-digit calendar year the employee joined.
  - **Serial Number (e.g., `0001`):** 4-digit zero-padded sequential number of the employee joining in that specific year.

### Administrative Rules
- **Self-registration is disabled for normal employees.** Only Administrators or HR Officers can register new employees.
- Upon employee creation, the system automatically:
  1. Generates the unique **Login ID** using the logic defined above.
  2. Creates a temporary initial password.
- Created employees log in with these credentials and are prompted to change their password on first login.

---

## 2. Employee Directory (Dashboard)

### Navigation Bar
- **Logo:** Display of the uploaded Company Logo.
- **Links:** Navigation menu containing:
  - `Employees` (Directory)
  - `Attendance`
  - `Time Off`
- **Systray Widget (Status Indicator):**
  - Displays a status dot representing the current user's check-in status:
    - **Red:** Checked Out.
    - **Green:** Checked In.
  - Clicking the widget toggles check-in status:
    - **Check IN** (when checked out) $\rightarrow$ updates status dot to Green.
    - **Check Out** (when checked in) $\rightarrow$ displays elapsed time "Since [Time]" and updates status dot to Red.
- **User Profile Dropdown:**
  - Display of user's avatar.
  - Dropdown options:
    - **My Profile:** Opens the current user's profile view.
    - **Log Out:** Logs out of the application.

### Employee Directory View
- **Controls:**
  - **NEW:** Action button (Admin/HR only) to open the employee creation form.
  - **Search:** Input field to filter employee cards by name, ID, or department.
- **Employee Cards (Grid Layout):**
  - Each card displays the employee's **Avatar** and **Name**.
  - A status indicator dot is shown in the top-right corner of each card:
    - **Green:** Present (Checked In).
    - **Airplane Icon:** On Leave (Approved Time Off).
    - **Yellow:** Absent (Not checked in, no active time-off approved).
  - **Interaction:** Clicking any card opens the corresponding employee profile in view-only mode (fields are locked unless edited by an authorized user).

---

## 3. Employee Profile (Form View)

### Profile Header Info
- Displays the Employee's **Avatar** (with an edit/pencil overlay for the owner or admins to update the photo), **Name**, and key metadata: *Login ID, Email, Mobile, Company, Department, Manager, Location*.

### Profile Tabs
1. **Resume:** Visible to all employees.
2. **Private Info:** Restricted to the Profile Owner and Admin/HR.
3. **Salary Info:** **Restricted to Admin/HR only.**
4. **Security:** Restricted to the Profile Owner (for password updates).

### Tab Content: Resume
- **Left Column (Personal Narrative):**
  - **About:** Editable text block.
  - **What I love about my job:** Editable text block.
  - **My interests and hobbies:** Editable text block.
- **Right Column (Skills & Credentials):**
  - **Skills:** Checklist/tags of skills with an "+ Add Skills" action.
  - **Certifications:** Checklist/tags of certifications with an "+ Add Certification" action.

### Tab Content: Private Info
- **Left Column (Personal Details):**
  - *Date of Birth, Residing Address, Nationality, Personal Email, Gender, Marital Status, Date of Joining*.
- **Right Column (Bank Details):**
  - *Account Number, Bank Name, IFSC Code, PAN No, UAN No, Employee Code*.

### Tab Content: Salary Info (Admin Only)
- **Schedule:**
  - Number of working days in a week.
  - Break time (hours).
- **Wage Details:**
  - **Monthly Wage:** Input field.
  - **Yearly Wage:** Auto-calculated value ($\text{Monthly Wage} \times 12$).
- **Salary Components:**
  Automatically computed dynamically based on the **Monthly Wage**:
  - **Basic Salary:** $50\%$ of Monthly Wage.
  - **House Rent Allowance (HRA):** $50\%$ of Basic Salary ($25\%$ of Monthly Wage).
  - **Standard Allowance:** $16.67\%$ of Basic Salary ($\sim 8.33\%$ of Monthly Wage).
  - **Performance Bonus:** $8.33\%$ of Basic Salary ($\sim 4.16\%$ of Monthly Wage).
  - **Leave Travel Allowance (LTA):** $8.33\%$ of Basic Salary ($\sim 4.16\%$ of Monthly Wage).
  - **Fixed Allowance:** Remaining amount to sum to $100\%$ of Monthly Wage:
    $$\text{Fixed Allowance} = \text{Monthly Wage} - (\text{Basic} + \text{HRA} + \text{Standard} + \text{Bonus} + \text{LTA})$$
- **Provident Fund (PF) Contribution:**
  - **Employee PF:** $12\%$ of Basic Salary.
  - **Employer PF:** $12\%$ of Basic Salary.
- **Tax Deductions:**
  - **Professional Tax:** Fixed deduction of `200.00` per month (deducted from Gross salary).

---

## 4. Attendance Management

### General Rules
- Attendance records serve as the source of truth for payroll payslip generation.
- The system determines the total **payable days** based on check-ins, check-outs, and approved paid leaves.
- Missing check-ins or unapproved/unpaid leaves dynamically reduce the number of payable days during payslip computation.
- By default, standard users see their own monthly day-wise log, while administrators see all company logs.

### Admin / HR / Time Off Officer View
- **Controls:**
  - Search bar to search records by employee.
  - Date navigation: `<-` and `->` buttons to cycle days.
  - Date picker dropdown.
  - View toggle (default: `Day` view listing all employees).
- **Data Table Columns:**
  - **Emp:** Employee Name & ID.
  - **Check In:** Timestamp of check-in.
  - **Check Out:** Timestamp of check-out.
  - **Work Hours:** Auto-calculated difference between check-in and check-out.
  - **Extra Hours:** Overtime calculation (hours worked beyond the standard 8-hour shift).

### Employee View
- **Controls:**
  - Month navigation: `<-` and `->` buttons.
  - Month picker dropdown.
  - **Summary Metrics Cards:**
    - Present Days Count
    - Approved Leaves Count
    - Total Expected Working Days
- **Data Table Columns:**
  - *Date, Check In, Check Out, Work Hours, Extra Hours*.

---

## 5. Time Off Management

### General Rules
- Regular employees can view only their personal requests.
- Admins/HR Officers oversee requests for all employees and manage approvals.
- Supported leave types:
  - **Paid Time Off**
  - **Sick Leave** (requires a medical certificate file attachment)
  - **Unpaid Leave**

### Admin / HR Officer View
- **Tabs:** Toggle between **Time Off** requests queue and **Allocation** (assigning leave balances).
- **Summary Metrics:** Total collective leave metrics.
- **Data Table Columns:**
  - **Name:** Employee Name.
  - **Start Date:** Initial day of leave.
  - **End Date:** Final day of leave.
  - **Time Off Type:** Category of leave requested.
  - **Status / Actions:** Approvals queue displaying inline **Approve** (green checkmark) and **Reject** (red cross) buttons.

### Employee View
- **Controls:**
  - **NEW:** Opens the Time Off Request popup.
- **Summary Metrics:**
  - Paid Time Off: `[X] Days Available`
  - Sick Time Off: `[Y] Days Available`
- **Interactive Calendar Dashboard:**
  - A full-year (12-month) visual calendar grid.
  - Dates are color-coded based on status:
    - **Blue:** Approved.
    - **Yellow (Pending):** To Approve.
    - **Red:** Refused.
  - **Interaction:** Clicking/dragging on calendar dates opens the **Time Off Request** popup with dates pre-populated.
  - **Sidebar:**
    - Color legend.
    - Year's list of public holidays.

### Time Off Request Popup
- **Trigger:** Triggered by the "NEW" button or calendar date selection.
- **Fields:**
  - **Employee:** Pre-filled read-only value of the applicant's name.
  - **Time Off Type:** Dropdown selector (*Paid Time Off*, *Sick Leave*, *Unpaid Leave*).
  - **Validity Period:** Start Date and End Date.
  - **Allocation:** Auto-calculated duration in decimal format (e.g., `01.00 Days`).
  - **Attachment:** File uploader (only displayed and mandatory for *Sick Leave* requests).
- **Actions:**
  - **Submit:** Dispatches the request to the HR approval queue.
  - **Discard:** Closes the dialog box.

require("dotenv").config();
const mongoose     = require("mongoose");
const User         = require("../models/User");
const FormTemplate = require("../models/FormTemplate");
const connectDB    = require("./db");

// ── Users ─────────────────────────────────────────────────────────────────────
const users = [
  // Students
  { name:"Arjun Sharma",     email:"student@college.edu",   password:"student123",   role:"student",            dept:"Computer Science", year:"3rd Year", rollNo:"CS21B047", mentor:"Dr. Priya Nair", avatar:"AS" },
  { name:"Priya Patel",      email:"student2@college.edu",  password:"student123",   role:"student",            dept:"Electronics",      year:"2nd Year", rollNo:"EC22B012", mentor:"Dr. Ramu",       avatar:"PP" },
  // Faculty
  { name:"Dr. Kavitha Rao",  email:"faculty@college.edu",   password:"faculty123",   role:"faculty",            dept:"Computer Science", designation:"Associate Professor", employeeId:"FAC001", avatar:"KR" },
  { name:"Prof. Suresh Iyer",email:"faculty2@college.edu",  password:"faculty123",   role:"faculty",            dept:"Electronics",      designation:"Assistant Professor",  employeeId:"FAC002", avatar:"SI" },
  // Mentor/HOD/Admin
  { name:"Dr. Priya Nair",   email:"mentor@college.edu",    password:"mentor123",    role:"mentor",             dept:"Computer Science", avatar:"PN" },
  { name:"Prof. Rajan Kumar",email:"hod@college.edu",       password:"hod123",       role:"hod",                dept:"Computer Science", avatar:"RK" },
  { name:"Mrs. Sunita Rao",  email:"admin@college.edu",     password:"admin123",     role:"college_admin",      avatar:"SR" },
  { name:"Mr. Vikram Mehta", email:"placement@college.edu", password:"placement123", role:"placement_director", avatar:"VM" },
  { name:"Dr. Anand Pillai", email:"director@college.edu",  password:"director123",  role:"college_director",   avatar:"AP" },
];

// ── Student Forms ─────────────────────────────────────────────────────────────
const studentForms = [
  // Academic
  { name:"Leave Application",          category:"Leave",       icon:"📅", color:"#2563eb", popular:true,  time:"1-2 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["From Date","To Date","Reason","Contact Number"],                      description:"Apply for leave from classes" },
  { name:"On Duty (OD) Request",       category:"Leave",       icon:"🏢", color:"#7c3aed", popular:true,  time:"Same Day",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Date","Event Name","Venue","Duration"],                               description:"Request OD for events or activities" },
  { name:"Medical Leave Certificate",  category:"Leave",       icon:"🏥", color:"#059669", popular:false, time:"Same Day",   portalType:"student", signatories:["Mentor"],                                  fields:["From Date","To Date","Hospital Name","Doctor Name"],                  description:"Submit medical leave with doctor certificate" },
  { name:"Internship Permission Form", category:"Placement",   icon:"🏗️", color:"#e85d26", popular:true,  time:"3-4 days",   portalType:"student", signatories:["Mentor","HOD","Placement Director"],       fields:["Company Name","Role","Duration","Location","Stipend"],                description:"Permission for internship during semester" },
  { name:"Internship NOC Letter",      category:"Placement",   icon:"💼", color:"#e85d26", popular:true,  time:"3-4 days",   portalType:"student", signatories:["HOD","Placement Director"],                fields:["Company Name","Duration","Location","Start Date"],                    description:"No Objection Certificate for internship" },
  { name:"Placement Registration",     category:"Placement",   icon:"🚀", color:"#2563eb", popular:true,  time:"1-2 days",   portalType:"student", signatories:["Mentor","Placement Director"],              fields:["CGPA","Backlogs","Skills","Preferred Role"],                          description:"Register for campus placement drives" },
  { name:"Industrial Visit Form",      category:"Placement",   icon:"🏭", color:"#059669", popular:false, time:"2-3 days",   portalType:"student", signatories:["Mentor","HOD","Placement Director"],       fields:["Company","Visit Date","Purpose","Transport Mode"],                    description:"Permission for industrial visits" },
  { name:"Project Topic Approval",     category:"Exam",        icon:"🔬", color:"#7c3aed", popular:false, time:"3-5 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Project Title","Domain","Tech Stack","Team Members"],                 description:"Get your project topic approved by mentor" },
  { name:"Exam Registration",          category:"Exam",        icon:"✍️", color:"#ec4899", popular:false, time:"2-3 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Semester","Subjects","Hall Ticket Number"],                           description:"Register for end-semester exams" },
  { name:"Exam Revaluation Request",   category:"Exam",        icon:"📝", color:"#ec4899", popular:false, time:"10-15 days", portalType:"student", signatories:["HOD","College Director"],                  fields:["Subject","Exam Date","Roll Number","Current Marks","Reason"],         description:"Request re-evaluation of answer sheet" },
  // Administrative
  { name:"Bonafide Certificate",       category:"Certificate", icon:"🎓", color:"#e85d26", popular:true,  time:"3-5 days",   portalType:"student", signatories:["HOD","College Director"],                  fields:["Purpose","Destination","Duration"],                                   description:"Official certificate confirming student enrollment" },
  { name:"Transfer Certificate",       category:"Certificate", icon:"📜", color:"#7c3aed", popular:false, time:"7-10 days",  portalType:"student", signatories:["HOD","College Director"],                  fields:["Reason","Date of Leaving","Course Completed"],                        description:"Transfer certificate for college change" },
  { name:"Character Certificate",      category:"Certificate", icon:"⭐", color:"#f59e0b", popular:false, time:"3-5 days",   portalType:"student", signatories:["HOD","College Director"],                  fields:["Purpose","Required By","Destination"],                                description:"Certificate of good conduct" },
  { name:"ID Card Replacement",        category:"Certificate", icon:"🪪", color:"#2563eb", popular:false, time:"2-3 days",   portalType:"student", signatories:["College Admin"],                           fields:["Reason for Loss","Police Complaint No","Photo Attached"],             description:"Request duplicate ID card" },
  { name:"Bus Pass Application",       category:"Certificate", icon:"🚌", color:"#059669", popular:false, time:"3-4 days",   portalType:"student", signatories:["College Admin","College Director"],         fields:["Route","From Stop","To Stop","Duration"],                             description:"Apply for college bus pass" },
  { name:"Scholarship Application",    category:"Certificate", icon:"🏆", color:"#f59e0b", popular:false, time:"7-10 days",  portalType:"student", signatories:["Mentor","HOD","College Director"],          fields:["Scholarship Name","Category","Family Income","Achievements"],         description:"Apply for merit or need-based scholarship" },
  { name:"Fee Payment Request",        category:"Fee",         icon:"💰", color:"#059669", popular:false, time:"5-7 days",   portalType:"student", signatories:["HOD","College Director"],                  fields:["Fee Type","Amount","Reason","Parent Contact"],                        description:"Fee payment extension or installment" },
  { name:"Course Registration",        category:"Fee",         icon:"📚", color:"#7c3aed", popular:true,  time:"2-3 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Course Name","Course Code","Reason"],                                 description:"Register for additional courses or semester" },
  // Hostel
  { name:"Hostel Admission Form",      category:"Hostel",      icon:"🏠", color:"#06b6d4", popular:false, time:"5-7 days",   portalType:"student", signatories:["College Admin","College Director"],         fields:["Room Preference","Reason","Duration","Parent Contact"],               description:"Apply for hostel room allotment" },
  { name:"Hostel Leave Request",       category:"Hostel",      icon:"🏃", color:"#f59e0b", popular:false, time:"Same Day",   portalType:"student", signatories:["College Admin"],                           fields:["Leave Date","Return Date","Reason","Parent Contact"],                 description:"Request permission for hostel leave" },
  // Activity
  { name:"Event Participation Form",   category:"Activity",    icon:"🎪", color:"#ec4899", popular:false, time:"1-2 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Event Name","Date","Venue","Role"],                                   description:"Permission to participate in events" },
  { name:"Workshop Registration",      category:"Activity",    icon:"🛠️", color:"#2563eb", popular:false, time:"1-2 days",   portalType:"student", signatories:["Mentor"],                                  fields:["Workshop Name","Date","Organizer","Duration"],                        description:"Register for workshops or seminars" },
  { name:"Club Activity Registration", category:"Activity",    icon:"🎭", color:"#7c3aed", popular:false, time:"Same Day",   portalType:"student", signatories:["Mentor"],                                  fields:["Club Name","Activity","Date","Role"],                                 description:"Participate in club activities" },
  // Library
  { name:"Library Membership Form",    category:"Library",     icon:"📖", color:"#059669", popular:false, time:"1-2 days",   portalType:"student", signatories:["College Admin"],                           fields:["Membership Type","Duration"],                                         description:"Apply for library membership" },
  { name:"Book Issue Request",         category:"Library",     icon:"📕", color:"#f59e0b", popular:false, time:"Same Day",   portalType:"student", signatories:["College Admin"],                           fields:["Book Title","Author","ISBN","Duration Needed"],                       description:"Request to issue specific books" },
  { name:"Research Lab Access",        category:"Activity",    icon:"🔬", color:"#e85d26", popular:false, time:"2-3 days",   portalType:"student", signatories:["Mentor","HOD"],                            fields:["Lab Name","Purpose","Duration","Supervisor Name"],                    description:"Request access to research laboratories" },
];

// ── Faculty Forms ─────────────────────────────────────────────────────────────
const facultyForms = [
  // ── Leave & Duty ─────────────────────────────────────────────────────────
  { name:"Casual Leave Application",      category:"Leave",      icon:"📅", color:"#2563eb", popular:true,  time:"1-2 days",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["From Date","To Date","No. of Days","Reason","Arrangement Made"],                             description:"Apply for casual leave from duty" },
  { name:"Medical Leave Application",     category:"Leave",      icon:"🏥", color:"#059669", popular:false, time:"Same Day",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["From Date","To Date","Doctor Name","Hospital Name","Medical Certificate No."],               description:"Medical leave with supporting certificate" },
  { name:"On Duty (OD) Request",          category:"Leave",      icon:"🏢", color:"#7c3aed", popular:true,  time:"Same Day",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Date","Purpose","Venue","Duration","Organised By"],                                          description:"OD for official duties outside campus" },
  { name:"Emergency Leave",               category:"Leave",      icon:"🚨", color:"#dc2626", popular:false, time:"Same Day",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Date","Reason","Emergency Type","Contact Number","Returning Date"],                          description:"Urgent emergency leave application" },

  // ── Academic Activity ────────────────────────────────────────────────────
  { name:"Conference Participation Request", category:"Academic", icon:"🎤", color:"#e85d26", popular:true,  time:"3-5 days",  portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Conference Name","Date","Venue","Paper Title","Funding Required","Registration Fee"],         description:"Request to participate and present at conferences" },
  { name:"Workshop / FDP Permission",     category:"Academic",   icon:"🎓", color:"#7c3aed", popular:true,  time:"2-3 days",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Program Name","Organizer","Date","Duration","Location","Mode (Online/Offline)"],             description:"Permission to attend FDP or workshop" },
  { name:"Seminar Participation Request", category:"Academic",   icon:"🎙️", color:"#2563eb", popular:false, time:"1-2 days",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Seminar Name","Date","Venue","Topic","Organizer"],                                           description:"Request to attend or present at seminar" },
  { name:"Research Project Proposal",     category:"Academic",   icon:"🔬", color:"#7c3aed", popular:false, time:"7-10 days",  portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Research Title","Domain","Funding Source","Duration","Co-Investigators","Objectives"],       description:"Submit research project proposal for institutional approval" },
  { name:"Internal Marks Submission",     category:"Academic",   icon:"📊", color:"#f59e0b", popular:true,  time:"Same Day",   portalType:"faculty", signatories:["HOD"],                                       fields:["Subject","Batch","Semester","Submission Type","Marks File Reference"],                       description:"Submit internal assessment marks to department" },
  { name:"Attendance Submission",         category:"Academic",   icon:"📌", color:"#059669", popular:true,  time:"Same Day",   portalType:"faculty", signatories:["HOD"],                                       fields:["Subject","Batch","Semester","Month","Total Classes","Classes Held"],                         description:"Submit monthly student attendance records" },
  { name:"Course Plan Upload",            category:"Academic",   icon:"📋", color:"#e85d26", popular:false, time:"1-2 days",   portalType:"faculty", signatories:["HOD"],                                       fields:["Subject","Semester","Batch","Academic Year","Plan Document Reference"],                      description:"Upload course or lesson plan for the semester" },
  { name:"Project Evaluation Form",       category:"Academic",   icon:"📝", color:"#ec4899", popular:false, time:"1-2 days",   portalType:"faculty", signatories:["HOD"],                                       fields:["Project Title","Student Names","Roll Numbers","Evaluation Date","Marks Awarded","Remarks"],  description:"Submit student project evaluation records" },

  // ── Administrative Requests ───────────────────────────────────────────────
  { name:"Equipment Request Form",        category:"Admin",      icon:"🖥️", color:"#2563eb", popular:false, time:"5-7 days",  portalType:"faculty", signatories:["HOD","College Director","College Admin"],    fields:["Equipment Name","Model/Spec","Quantity","Purpose","Estimated Cost","Vendor if Known"],       description:"Request purchase of new equipment" },
  { name:"Lab Resource Request",          category:"Admin",      icon:"🧪", color:"#059669", popular:false, time:"3-5 days",   portalType:"faculty", signatories:["HOD","College Admin"],                       fields:["Lab Name","Resource Needed","Quantity","Justification","Priority Level"],                    description:"Request lab consumables or resources" },
  { name:"Software Requirement Request",  category:"Admin",      icon:"💻", color:"#7c3aed", popular:false, time:"5-7 days",   portalType:"faculty", signatories:["HOD","College Director","College Admin"],    fields:["Software Name","Version","No. of Licenses","Purpose","Estimated Cost"],                     description:"Request licensed software for department" },
  { name:"Infrastructure Maintenance",    category:"Admin",      icon:"🔧", color:"#374151", popular:false, time:"3-5 days",   portalType:"faculty", signatories:["HOD","College Admin"],                       fields:["Location","Issue Description","Priority","Estimated Impact","Required By Date"],            description:"Request infrastructure repair or maintenance" },

  // ── Financial Claims ──────────────────────────────────────────────────────
  { name:"Travel Allowance Claim",        category:"Financial",  icon:"✈️", color:"#f59e0b", popular:true,  time:"5-7 days",  portalType:"faculty", signatories:["HOD","College Director","College Admin"],    fields:["Destination","Purpose","Travel Date","Return Date","Mode of Travel","Amount Claimed","Bills Attached"], description:"Claim travel allowance for official duty" },
  { name:"Research Expense Claim",        category:"Financial",  icon:"🔬", color:"#7c3aed", popular:false, time:"7-10 days",  portalType:"faculty", signatories:["HOD","College Director","College Admin"],    fields:["Research Project Name","Expense Type","Amount","Date","Bill Number","Purpose"],             description:"Claim expenses incurred for research activities" },
  { name:"Event Expense Reimbursement",   category:"Financial",  icon:"💰", color:"#059669", popular:false, time:"7-10 days",  portalType:"faculty", signatories:["HOD","College Director","College Admin"],    fields:["Event Name","Date","Expense Items","Total Amount","Bills Attached","Account Details"],      description:"Reimburse expenses incurred for institutional events" },

  // ── HR & Career Progression ───────────────────────────────────────────────
  { name:"Salary Increment Request",      category:"HR",         icon:"💵", color:"#059669", popular:false, time:"15-30 days", portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Current Designation","Years of Service","Current Salary","Reason","Supporting Achievements"], description:"Request for annual salary increment" },
  { name:"Promotion Request Form",        category:"HR",         icon:"🚀", color:"#e85d26", popular:false, time:"15-30 days", portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Current Designation","Applying For","Years in Current Role","Publications","Achievements"],  description:"Apply for promotion to next designation" },
  { name:"Performance Review Submission", category:"HR",         icon:"⭐", color:"#f59e0b", popular:false, time:"3-5 days",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Academic Year","Teaching Load","Research Output","Student Feedback Score","Self Assessment"], description:"Submit annual performance self-review" },
  { name:"Contract Renewal Request",      category:"HR",         icon:"📜", color:"#2563eb", popular:false, time:"15-30 days", portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Contract End Date","Renewal Period","Current Role","Reason for Renewal","Achievements"],     description:"Request renewal of employment contract" },
  { name:"Service Certificate Request",   category:"HR",         icon:"🏅", color:"#7c3aed", popular:true,  time:"3-5 days",   portalType:"faculty", signatories:["HOD","College Director"],                    fields:["Purpose","Required By","Designation","Period of Service","Destination"],                     description:"Request official service certificate from institution" },
];

const allForms = [...studentForms, ...facultyForms];

const seed = async () => {
  await connectDB();
  console.log("\n🌱 Seeding database...\n");

  await User.deleteMany({});
  await FormTemplate.deleteMany({});

  for (const u of users) {
    await User.create(u);
    console.log(`  ✅ User: ${u.email}  [${u.role}]`);
  }

  await FormTemplate.insertMany(allForms);
  console.log(`\n  ✅ ${allForms.length} form templates inserted`);
  console.log(`      (${studentForms.length} student + ${facultyForms.length} faculty)`);
  console.log("\n🎉 Seed complete!\n");
  console.log("Demo credentials:");
  console.log("  Student  : student@college.edu / student123");
  console.log("  Faculty  : faculty@college.edu / faculty123");
  console.log("  Mentor   : mentor@college.edu  / mentor123");
  console.log("  HOD      : hod@college.edu     / hod123");
  console.log("  Admin    : admin@college.edu   / admin123");
  console.log("  Placement: placement@college.edu / placement123");
  console.log("  Director : director@college.edu  / director123\n");
  process.exit(0);
};

seed().catch(err => { console.error("❌ Seed error:", err); process.exit(1); });
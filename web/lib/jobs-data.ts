export type ActiveJob = {
  id: string;
  title: string;
};

export type JobSection = {
  label: string;
  value: string;
};

export type VacancySplit = {
  key: string;
  value: string;
};

export type ProcessStep = {
  step: string;
  statusDate: string;
};

export type JobDetail = {
  id: string;
  title: string;
  departmentName: string;
  totalVacancy: string;
  examAgency: string;
  level: string;
  openingDate: string;
  closingDate: string;
  examDate?: string;
  eligibility: JobSection[];
  salary: JobSection[];
  examCentres: string[];
  officialApplyLink: string;
  officialNotificationLink: string;
  categoryVacancy: VacancySplit[];
  stateVacancy?: VacancySplit[];
  processFlow: ProcessStep[];
};

export const ACTIVE_HOME_JOBS: ActiveJob[] = [
  { id: "rrc-wr-apprentice-2026", title: "RRC WR Apprentice Online Form 2026" },
  { id: "india-post-gds-correction-2026", title: "India Post GDS Correction / Edit Form 2026" },
  { id: "hpsc-pgt-computer-science-2026", title: "HPSC PGT Computer Science Online Form 2026" },
  { id: "up-anganwadi-worker-2026", title: "UP Anganwadi Worker Online Form 2026" },
  { id: "ssc-cpo-si-2025", title: "SSC CPO SI 2025 Vacancy Details" },
  { id: "rbi-assistant-2026", title: "RBI Assistant Online Form 2026" },
  { id: "btsc-dairy-field-officer-2026", title: "BTSC Dairy Field Officer / Technical Officer Online Form 2026" },
  { id: "jharkhand-jpsc-civil-services-2026", title: "Jharkhand JPSC Civil Services Pre Online Form 2026" },
  { id: "aiims-norcet-10th-2026", title: "AIIMS NORCET 10th Online Form 2026" },
  { id: "indian-army-agniveer-rally-2026", title: "Indian Army Agniveer Rally Recruitment Online Form 2026" },
  { id: "sample-ssc-gd-2026", title: "SSC GD Constable 2026" },
  { id: "sample-rrb-alp-2026", title: "RRB ALP 2026" },
  { id: "sample-up-police-constable-2026", title: "UP Police Constable 2026" },
  { id: "rrb-alp-2026", title: "RRB ALP 2026" },
  { id: "rrb-technician-2026", title: "RRB Technician 2026" },
  { id: "rrb-group-d-2026", title: "RRB Group D 2026" },
  { id: "ibps-po-2026", title: "IBPS PO 2026" },
  { id: "ibps-clerk-2026", title: "IBPS Clerk 2026" },
  { id: "sbi-po-2026", title: "SBI PO 2026" },
  { id: "sbi-clerk-2026", title: "SBI Clerk 2026" },
  { id: "up-police-constable-2026", title: "UP Police Constable 2026" },
  { id: "up-police-si-2026", title: "UP Police SI 2026" },
  { id: "bpsc-tre-2026", title: "BPSC TRE 2026" },
  { id: "uppsc-ro-aro-2026", title: "UPPSC RO ARO 2026" },
  { id: "upsssc-pet-2026", title: "UPSSSC PET 2026" },
  { id: "rpsc-ras-2026", title: "RPSC RAS 2026" },
  { id: "mppeb-group-2-2026", title: "MP Group 2 2026" },
  { id: "hssc-cet-2026", title: "HSSC CET 2026" },
  { id: "cg-vyapam-2026", title: "CG Vyapam 2026" },
  { id: "navy-agniveer-2026", title: "Navy Agniveer 2026" },
  { id: "airforce-agniveer-2026", title: "Airforce Agniveer 2026" },
  { id: "coast-guard-navik-2026", title: "Coast Guard Navik 2026" },
  { id: "cisf-constable-2026", title: "CISF Constable 2026" },
  { id: "bsf-tradesman-2026", title: "BSF Tradesman 2026" },
  { id: "crpf-constable-2026", title: "CRPF Constable 2026" },
  { id: "itbp-constable-2026", title: "ITBP Constable 2026" },
  { id: "ssb-head-constable-2026", title: "SSB Head Constable 2026" },
  { id: "assam-rifles-2026", title: "Assam Rifles Technical 2026" },
  { id: "delhi-police-mts-2026", title: "Delhi Police MTS 2026" },
  { id: "bpsc-cce-2026", title: "BPSC CCE 2026" },
];

export const ADMISSION_ITEMS: string[] = [
  "CUET UG Admission 2026",
  "CUET PG Admission 2026",
  "JEE Main Counselling 2026",
  "NEET UG Counselling 2026",
  "UP BEd Admission 2026",
  "Bihar BEd Admission 2026",
  "Rajasthan PTET Admission 2026",
  "MP D.El.Ed Admission 2026",
  "DSSSB Nursery Teacher Admission 2026",
  "Delhi University UG Admission 2026",
  "BHU UG Admission 2026",
  "Allahabad University Admission 2026",
  "JNU Admission 2026",
  "IIT JAM Admission 2026",
  "NIT MCA Admission 2026",
  "Polytechnic Admission UP 2026",
  "ITI Admission UP 2026",
  "Nursing Admission 2026",
  "Paramedical Admission 2026",
  "BSc Agriculture Admission 2026",
  "Law Entrance Admission 2026",
  "MBA Admission State CET 2026",
  "BBA/BCA Admission 2026",
  "Pharmacy Admission 2026",
  "GNM ANM Admission 2026",
  "Teacher Training Admission 2026",
  "Open University Admission 2026",
];

export const ADMIT_CARD_ITEMS: string[] = [
  "SSC CGL Tier 1 Admit Card",
  "SSC CHSL Tier 1 Admit Card",
  "SSC MTS Admit Card",
  "RRB ALP CBT 1 Admit Card",
  "RRB Technician Admit Card",
  "RRB Group D Admit Card",
  "IBPS PO Pre Admit Card",
  "IBPS Clerk Pre Admit Card",
  "SBI PO Pre Admit Card",
  "SBI Clerk Pre Admit Card",
  "UP Police Constable Admit Card",
  "UP Police SI Admit Card",
  "UPPSC RO ARO Admit Card",
  "UPSSSC PET Admit Card",
  "BPSC TRE Admit Card",
  "RPSC RAS Pre Admit Card",
  "MP Group 2 Admit Card",
  "HSSC CET Admit Card",
  "CG Vyapam Admit Card",
  "Navy Agniveer Admit Card",
  "Airforce Agniveer Admit Card",
  "Coast Guard Navik Admit Card",
  "CRPF Constable Admit Card",
  "ITBP Constable Admit Card",
  "Assam Rifles Admit Card",
  "Delhi Police MTS Admit Card",
  "BPSC CCE Admit Card",
];

export const RESULT_ITEMS: string[] = [
  "SSC CGL Tier 1 Result",
  "SSC CHSL Tier 1 Result",
  "SSC MTS Result",
  "RRB ALP CBT 1 Result",
  "RRB Technician Result",
  "RRB Group D Result",
  "IBPS PO Pre Result",
  "IBPS Clerk Pre Result",
  "SBI PO Pre Result",
  "SBI Clerk Pre Result",
  "UP Police Constable Result",
  "UP Police SI Result",
  "UPPSC RO ARO Result",
  "UPSSSC PET Result",
  "BPSC TRE Result",
  "RPSC RAS Pre Result",
  "MP Group 2 Result",
  "HSSC CET Result",
  "CG Vyapam Result",
  "Navy Agniveer Result",
  "Airforce Agniveer Result",
  "Coast Guard Navik Result",
  "CRPF Constable Result",
  "ITBP Constable Result",
  "Assam Rifles Result",
  "Delhi Police MTS Result",
  "BPSC CCE Result",
];

export const NOTICE_ITEMS: string[] = [
  "SSC CGL Exam Date Notice",
  "SSC CHSL Correction Window Notice",
  "RRB ALP Shift Timing Notice",
  "RRB Group D City Intimation Notice",
  "IBPS PO Document Notice",
  "SBI Clerk Joining Notice",
  "UP Police Physical Test Notice",
  "UPPSC RO ARO Update Notice",
  "UPSSSC PET Re-schedule Notice",
  "BPSC TRE Counselling Notice",
  "RPSC RAS Interview Notice",
  "MP Group 2 Calendar Notice",
  "HSSC CET Helpdesk Notice",
  "CG Vyapam New Notice",
  "Navy Agniveer Merit Notice",
  "Airforce Agniveer Phase 2 Notice",
  "Coast Guard Navik Medical Notice",
  "CISF Constable Trade Test Notice",
  "BSF Tradesman Physical Test Notice",
  "CRPF Exam Pattern Notice",
  "Delhi Police Schedule Notice",
  "State PSC Interview Notice",
  "Assam Rifles Document Notice",
  "ITBP Exam City Notice",
  "BPSC CCE Mains Notice",
  "UP Police Final Notice",
  "RRB Technician DV Notice",
];

export const JOB_DETAIL_DATA: Record<string, JobDetail> = {
  "sample-ssc-gd-2026": {
    id: "sample-ssc-gd-2026",
    title: "SSC GD Constable 2026",
    departmentName: "Staff Selection Commission (SSC)",
    totalVacancy: "39,481 (tentative)",
    examAgency: "SSC",
    level: "Central Government",
    openingDate: "12 January 2026",
    closingDate: "10 February 2026",
    eligibility: [
      { label: "Minimum Qualification", value: "Class 10th pass from recognized board" },
      { label: "Age Limit", value: "18 to 23 years (age relaxation as per rules)" },
      { label: "Physical Standard", value: "As per SSC GD notification" },
    ],
    salary: [
      { label: "Pay Level", value: "Level 3 (Rs 21,700 to Rs 69,100)" },
      { label: "Allowances", value: "DA, HRA, Transport allowance as applicable" },
    ],
    examCentres: ["Delhi", "Lucknow", "Patna", "Bhopal", "Kolkata", "Guwahati"],
    officialApplyLink: "https://ssc.nic.in/",
    officialNotificationLink: "https://ssc.nic.in/",
    categoryVacancy: [
      { key: "General", value: "Notified in detailed PDF" },
      { key: "OBC", value: "Notified in detailed PDF" },
      { key: "SC", value: "Notified in detailed PDF" },
      { key: "ST", value: "Notified in detailed PDF" },
      { key: "EWS", value: "Notified in detailed PDF" },
    ],
    processFlow: [
      { step: "Computer Based Examination", statusDate: "Expected: March 2026" },
      { step: "Physical Efficiency Test / PST", statusDate: "Not decided yet" },
      { step: "Medical Examination", statusDate: "Not decided yet" },
      { step: "Final Merit List", statusDate: "Not decided yet" },
    ],
  },
  "sample-rrb-alp-2026": {
    id: "sample-rrb-alp-2026",
    title: "RRB ALP 2026",
    departmentName: "Railway Recruitment Board",
    totalVacancy: "5,696 (tentative)",
    examAgency: "Railway Recruitment Board (RRB)",
    level: "Central Government",
    openingDate: "06 January 2026",
    closingDate: "05 February 2026",
    eligibility: [
      { label: "Qualification", value: "10th + ITI / Diploma in relevant trade" },
      { label: "Age Limit", value: "18 to 30 years (as per notification)" },
      { label: "Medical Standard", value: "A-1/B-1 standards depending on post" },
    ],
    salary: [
      { label: "Basic Pay", value: "Rs 19,900 (Level 2)" },
      { label: "Other Benefits", value: "DA, HRA, TA and railway benefits" },
    ],
    examCentres: ["Mumbai", "Chennai", "Ahmedabad", "Prayagraj", "Bengaluru"],
    officialApplyLink: "https://indianrailways.gov.in/",
    officialNotificationLink: "https://indianrailways.gov.in/",
    categoryVacancy: [
      { key: "General", value: "As per RRB zone notice" },
      { key: "OBC", value: "As per RRB zone notice" },
      { key: "SC", value: "As per RRB zone notice" },
      { key: "ST", value: "As per RRB zone notice" },
      { key: "EWS", value: "As per RRB zone notice" },
    ],
    stateVacancy: [
      { key: "Uttar Pradesh", value: "As per zone allotment" },
      { key: "Maharashtra", value: "As per zone allotment" },
      { key: "Tamil Nadu", value: "As per zone allotment" },
    ],
    processFlow: [
      { step: "CBT 1", statusDate: "Expected: April 2026" },
      { step: "CBT 2", statusDate: "Not decided yet" },
      { step: "CBAT / Skill Test", statusDate: "Not decided yet" },
      { step: "Document Verification + Medical", statusDate: "Not decided yet" },
    ],
  },
  "sample-up-police-constable-2026": {
    id: "sample-up-police-constable-2026",
    title: "UP Police Constable 2026",
    departmentName: "Uttar Pradesh Police Recruitment & Promotion Board",
    totalVacancy: "60,244 (expected cycle)",
    examAgency: "UPPRPB",
    level: "State Government",
    openingDate: "29 December 2025",
    closingDate: "31 January 2026",
    eligibility: [
      { label: "Qualification", value: "12th pass from recognized board" },
      { label: "Age Limit", value: "18 to 25 years (relaxation as per state rules)" },
      { label: "Physical Test", value: "Running and measurement as per UPPRPB criteria" },
    ],
    salary: [
      { label: "Pay Scale", value: "Pay Matrix Level 3" },
      { label: "In-hand (approx)", value: "As per UP state police pay + allowances" },
    ],
    examCentres: ["Lucknow", "Kanpur", "Prayagraj", "Varanasi", "Agra", "Gorakhpur"],
    officialApplyLink: "https://uppbpb.gov.in/",
    officialNotificationLink: "https://uppbpb.gov.in/",
    categoryVacancy: [
      { key: "General", value: "As per notification" },
      { key: "OBC", value: "As per notification" },
      { key: "SC", value: "As per notification" },
      { key: "ST", value: "As per notification" },
      { key: "EWS", value: "As per notification" },
    ],
    stateVacancy: [{ key: "Uttar Pradesh", value: "All districts combined as per final notice" }],
    processFlow: [
      { step: "Written Examination", statusDate: "Expected: February/March 2026" },
      { step: "Physical Standard Test", statusDate: "Not decided yet" },
      { step: "Physical Efficiency Test", statusDate: "Not decided yet" },
      { step: "Document Verification + Medical", statusDate: "Not decided yet" },
    ],
  },
};

export function getJobTitleById(id: string): string | undefined {
  return ACTIVE_HOME_JOBS.find((item) => item.id === id)?.title;
}

export function buildGenericJobDetail(id: string, title: string): JobDetail {
  return {
    id,
    title,
    departmentName: "To be announced",
    totalVacancy: "Not decided yet",
    examAgency: "To be announced",
    level: "To be announced",
    openingDate: "Not decided yet",
    closingDate: "Not decided yet",
    examDate: "Not decided yet",
    eligibility: [
      { label: "Minimum Qualification", value: "Not decided yet" },
      { label: "Age Limit", value: "Not decided yet" },
      { label: "Other Criteria", value: "Will be updated after official release" },
    ],
    salary: [
      { label: "Pay Scale", value: "Not decided yet" },
      { label: "Allowances", value: "As per government rules" },
    ],
    examCentres: ["Not decided yet"],
    officialApplyLink: "",
    officialNotificationLink: "",
    categoryVacancy: [
      { key: "General", value: "Not decided yet" },
      { key: "OBC", value: "Not decided yet" },
      { key: "SC", value: "Not decided yet" },
      { key: "ST", value: "Not decided yet" },
      { key: "EWS", value: "Not decided yet" },
    ],
    processFlow: [
      { step: "Written Examination", statusDate: "Not decided yet" },
      { step: "Physical / Skill Test", statusDate: "Not decided yet" },
      { step: "Document Verification", statusDate: "Not decided yet" },
      { step: "Final Merit", statusDate: "Not decided yet" },
    ],
  };
}

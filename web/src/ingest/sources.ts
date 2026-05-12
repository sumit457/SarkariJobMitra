export type SourceKey =
  | "ssc_nic_notices"
  | "ssc_gov_noticeboard"
  | "ssc_gov_calendar"
  | "sbi_current_openings"
  | "indiapost_vacancies"
  | "indiapost_gds"
  | "upsc_active_exams"
  | "upsc_forthcoming_exams"
  | "upsc_exam_calendar";

export const DEFAULT_SOURCES: Array<{
  key: SourceKey;
  name: string;
  listingUrl: string;
  type: "listing_html" | "listing_table" | "single_page";
  isActive?: boolean;
}> = [
  {
    key: "ssc_nic_notices",
    name: "SSC (nic) Notices",
    listingUrl: "https://ssc.nic.in/portal/notices",
    type: "listing_html",
    // Keep as fallback only; primary SSC notices come from ssc.gov.in notice-board.
    isActive: false,
  },
  {
    key: "ssc_gov_noticeboard",
    name: "SSC (gov) Notice Board",
    listingUrl: "https://ssc.gov.in/home/notice-board",
    type: "listing_html",
  },
  {
    key: "ssc_gov_calendar",
    name: "SSC (gov) Examination Calendar",
    listingUrl: "https://ssc.gov.in/for-candidates/examination-calendar",
    type: "listing_html",
  },
  {
    key: "sbi_current_openings",
    name: "SBI Current Openings",
    listingUrl: "https://sbi.bank.in/web/careers/current-openings",
    type: "listing_html",
  },
  {
    key: "indiapost_vacancies",
    name: "India Post Vacancies",
    listingUrl: "https://www.indiapost.gov.in/vacancies",
    type: "listing_table",
  },
  {
    key: "indiapost_gds",
    name: "India Post GDS Online Engagement",
    listingUrl: "https://www.indiapost.gov.in/gdsonlineengagement",
    type: "single_page",
  },
  {
    key: "upsc_active_exams",
    name: "UPSC Active Exams",
    listingUrl: "https://upsc.gov.in/examinations/active-exams",
    type: "listing_html",
  },
  {
    key: "upsc_forthcoming_exams",
    name: "UPSC Forthcoming Exams",
    listingUrl: "https://upsc.gov.in/examinations/forthcoming-exams",
    type: "listing_html",
  },
  {
    key: "upsc_exam_calendar",
    name: "UPSC Exam Calendar",
    listingUrl: "https://upsc.gov.in/examinations/exam-calendar",
    type: "listing_table",
  },
];

export type SourceKey =
  | "ssc_nic_notices"
  | "ssc_gov_noticeboard"
  | "indiapost_vacancies"
  | "indiapost_gds";

export const DEFAULT_SOURCES: Array<{
  key: SourceKey;
  name: string;
  listingUrl: string;
  type: "listing_html" | "listing_table" | "single_page";
}> = [
  {
    key: "ssc_nic_notices",
    name: "SSC (nic) Notices",
    listingUrl: "https://ssc.nic.in/portal/notices",
    type: "listing_html",
  },
  {
    key: "ssc_gov_noticeboard",
    name: "SSC (gov) Notice Board",
    listingUrl: "https://ssc.gov.in/home/notice-board",
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
];

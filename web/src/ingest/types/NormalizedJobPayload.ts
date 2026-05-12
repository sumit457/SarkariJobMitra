export type NormalizedJobPayload = {
  title: string | null;
  organization: string | null;
  advertisement_number: string | null;
  post_name: string | null;
  total_vacancies: number | null;
  state: string | null;
  category: string | null;
  qualification_summary: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  official_notification_url: string | null;
  official_pdf_url: string | null;
  apply_url: string | null;

  important_dates: Record<string, unknown> | null;
  application_fee: Record<string, unknown> | null;
  age_limit: Record<string, unknown> | null;
  vacancy_details: Record<string, unknown> | null;
  qualification_details: Record<string, unknown> | null;
  selection_process: string | null;
  salary: string | null;
  how_to_apply: string | null;
  important_links: Record<string, unknown> | null;

  field_confidences: Record<string, number> | null;
  extraction_sources: Record<string, unknown> | null;
};

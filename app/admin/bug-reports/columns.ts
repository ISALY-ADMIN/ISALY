/** Colonnes communes aux deux vues bug_reports (principale et archives). */
export const BUG_REPORT_COLUMNS = `
  id, description, page_url, status, severity, created_at, updated_at,
  user_agent, browser_context, ai_diagnosis, ai_plan, ai_report, commit_sha,
  screenshot_url,
  profiles:user_id (first_name, last_name, email)
`

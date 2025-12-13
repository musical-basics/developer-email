/**
 * Renders a template by replacing all {{key}} placeholders with actual values from the assets object.
 * @param html - The raw HTML template string containing {{variable}} placeholders
 * @param assets - An object mapping variable names to their replacement values
 * @returns The processed HTML string with all placeholders replaced
 */
export function renderTemplate(html: string, assets: Record<string, string>): string {
  let result = html

  // Loop through all asset keys and replace {{key}} with the actual value
  for (const [key, value] of Object.entries(assets)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(pattern, value || "")
  }

  return result
}

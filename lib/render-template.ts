/**
 * Renders a template by replacing all {{key}} placeholders with actual values from the assets object.
 * @param html - The raw HTML template string containing {{variable}} placeholders
 * @param assets - An object mapping variable names to their replacement values
 * @returns The processed HTML string with all placeholders replaced
 */
export function renderTemplate(html: string, assets: Record<string, string>): string {
    let result = html

    // 1. Standard Replacement
    for (const [key, value] of Object.entries(assets)) {
        // Skip _fit variables for direct replacement loop (handled below or naturally)
        if (key.endsWith("_fit")) continue

        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g")
        result = result.replace(pattern, value || "")

        // 2. Magic: If this key has a corresponding _fit variable, try to inject it
        const fitValue = assets[`${key}_fit`]
        if (fitValue) {
            // Logic: Find <img> tags that used this variable in 'src' and try to patch 'style'
            // We do this by looking for the REPLACED url.
            // Wait, searching for the URL is risky if multiple images share it.
            // Better: We should have done this BEFORE replacing the variable? 
            // OR: We can use a regex that looks for the pattern before replacement.
            // Let's restart the logic for this key.

            // Re-read: We can't do it after replacement easily.
            // So, let's look for the pattern `{{key}}` in the ORIGINAL html (or current result before replace).
            // Actually, we can do a smart replace where we look for `<img ... src="{{key}}" ... style="...">`
            // But HTML attributes are unordered.
            // This is hard with regex. 

            // Alternative:
            // Since we just replaced `{{key}}` with `value` (the URL).
            // That doesn't help with style.
        }
    }

    // NEW APPROACH: Two-Pass
    // Pass 1: Handle "Fit" injection for Image Variables
    for (const [key, value] of Object.entries(assets)) {
        const fitKey = `${key}_fit`
        const fitValue = assets[fitKey]

        if (fitValue) {
            // Look for <img ... src="{{key}}" ... >
            // We want to inject/replace object-fit in the style attribute.
            // Regex explanation:
            // <img[^>]*       Start of img tag
            // src=["']\{\{key\}\}["']  src attribute with variable
            // [^>]*           Other attributes
            // >               End of tag

            // This is too complex to reliably parse/replace in one go due to attribute order.
            // However, we can handle the common case: `style="..."` exists.

            // Strategy: Find strings that look like `<img ... src="{{key}}"` 
            // and then look for `style="` nearby?

            // Actually, let's keep it simple.
            // If the user hasn't put `{{key_fit}}` in their style, we try to force it.
            // BUT, if we just blindly modify `renderTemplate`, we might break things.

            // Let's try a safer regex that targets the specific structure user has?
            // User: `style="width: 100%; height: 300px; object-fit: cover;"`
            // We can look for `object-fit: \w+` inside a style attribute that is inside a tag with `src="{{key}}"`.

            // We will match the whole IMG tag containing the src variable.
            const imgTagRegex = new RegExp(`(<img[^>]*src=["']\\{\\{${key}\\}\\}["'][^>]*>)`, 'gi')

            result = result.replace(imgTagRegex, (match) => {
                // 'match' is the full <img> tag (assuming no > inside attributes, which is standard HTML)

                // Check if style exists
                if (match.match(/style=["'][^"']*["']/i)) {
                    // Update existing style
                    return match.replace(/(style=["'][^"']*)object-fit:\s*[\w-]+;?([^"']*["'])/i, `$1object-fit: ${fitValue};$2`)
                        .replace(/(style=["'])(?!.*object-fit)([^"']*["'])/i, `$1object-fit: ${fitValue}; $2`)
                    // The second replace is for when object-fit is NOT present but style IS.
                    // However, the first replace might have already handled it. 
                    // Let's be careful.

                    // Actually, simpler: Parse the style attribute value.
                    return match.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, styleContent) => {
                        let newStyle = styleContent
                        if (newStyle.includes('object-fit:')) {
                            newStyle = newStyle.replace(/object-fit:\s*[\w-]+/i, `object-fit: ${fitValue}`)
                        } else {
                            newStyle = `${newStyle}; object-fit: ${fitValue}`
                        }
                        return `style=${quote}${newStyle}${quote}`
                    })
                } else {
                    // No style attribute, add one
                    // Insert before the closing /> or >
                    if (match.endsWith('/>')) {
                        return match.slice(0, -2) + ` style="object-fit: ${fitValue};" />`
                    } else {
                        return match.slice(0, -1) + ` style="object-fit: ${fitValue};">`
                    }
                }
            })
        }
    }

    // Pass 2: Standard Replacement (Existing Logic)
    for (const [key, value] of Object.entries(assets)) {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g")
        result = result.replace(pattern, value || "")
    }

    return result
}

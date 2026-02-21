import * as cheerio from "cheerio"

export interface ParsedBlock {
    type: "text" | "image" | "button" | "divider" | "social" | "footer" | "logo"
    content?: string
    src?: string
    href?: string
    alt?: string
    style?: string
    width?: string
    children?: ParsedBlock[]
}

export interface ParsedEmail {
    title: string
    previewText: string
    blocks: ParsedBlock[]
    images: { filename: string; originalSrc: string; alt: string }[]
    links: { text: string; href: string }[]
    socialLinks: { platform: string; href: string; icon: string }[]
    footerHtml: string
    rawHtml: string
}

/**
 * Parses Mailchimp HTML exports into structured content blocks.
 * Strips Mailchimp-specific markup (MSO conditionals, archive bar, tracking)
 * and extracts meaningful content sections.
 */
export function parseMailchimpHtml(html: string): ParsedEmail {
    const $ = cheerio.load(html)

    // Extract metadata
    const title =
        $("title").text() || $('meta[property="og:title"]').attr("content") || "Untitled Email"
    const previewText = $(".mcnPreviewText").text().trim()

    // Remove Mailchimp archive elements
    $("#awesomewrap").remove()
    $(".mcnPreviewText").remove()
    $("script").remove()
    $("link[rel=stylesheet]").remove()

    // Remove MSO conditional comments
    const cleanedHtml = html.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, "")

    const blocks: ParsedBlock[] = []
    const images: ParsedEmail["images"] = []
    const links: ParsedEmail["links"] = []
    const socialLinks: ParsedEmail["socialLinks"] = []

    // Extract images
    $("img.mceImage, img.mceLogo, img.imageDropZone").each((_, el) => {
        const $el = $(el)
        const src = $el.attr("src") || ""
        const alt = $el.attr("alt") || ""
        const width = $el.attr("width") || ""
        const parentLink = $el.closest("a").attr("href") || ""

        const filename = src.split("/").pop() || src
        images.push({ filename, originalSrc: src, alt })

        const isLogo = $el.hasClass("mceLogo")
        blocks.push({
            type: isLogo ? "logo" : "image",
            src,
            alt,
            href: parentLink,
            width,
        })
    })

    // Extract text blocks
    $(".mceText").each((_, el) => {
        const $el = $(el)
        const innerHtml = $el.html()?.trim()
        if (innerHtml && innerHtml.length > 10) {
            blocks.push({
                type: "text",
                content: innerHtml,
            })
        }
    })

    // Extract buttons
    $(".mceButtonLink").each((_, el) => {
        const $el = $(el)
        const href = $el.attr("href") || ""
        const text = $el.text().trim()
        const style = $el.attr("style") || ""

        if (text) {
            blocks.push({
                type: "button",
                content: text,
                href,
                style,
            })
            links.push({ text, href })
        }
    })

    // Extract social follow icons
    $(".mceSocialFollowIcon a").each((_, el) => {
        const $el = $(el)
        const href = $el.attr("href") || ""
        const img = $el.find("img")
        const alt = img.attr("alt") || ""
        const icon = img.attr("src") || ""

        const platform = alt.replace(" icon", "").toLowerCase()
        socialLinks.push({ platform, href, icon })
    })

    // Extract footer
    const footerSection = $(".mceFooterSection")
    const footerHtml = footerSection.html()?.trim() || ""

    return {
        title,
        previewText,
        blocks,
        images,
        links,
        socialLinks,
        footerHtml,
        rawHtml: cleanedHtml,
    }
}

/**
 * Generates a content summary for the AI model, describing the structure
 * of the parsed email in plain language.
 */
export function generateContentSummary(parsed: ParsedEmail): string {
    const sections: string[] = []

    sections.push(`# Email: "${parsed.title}"`)
    if (parsed.previewText) {
        sections.push(`Preview text: "${parsed.previewText}"`)
    }
    sections.push("")

    sections.push(`## Content Structure (${parsed.blocks.length} blocks):`)
    parsed.blocks.forEach((block, i) => {
        switch (block.type) {
            case "image":
                sections.push(
                    `${i + 1}. IMAGE: "${block.alt || "no alt"}" (${block.width}px wide) ${block.href ? `→ links to: ${block.href}` : ""}`
                )
                break
            case "logo":
                sections.push(`${i + 1}. LOGO IMAGE: ${block.src}`)
                break
            case "text":
                const preview = (block.content || "").replace(/<[^>]+>/g, "").substring(0, 100)
                sections.push(`${i + 1}. TEXT BLOCK: "${preview}..."`)
                break
            case "button":
                sections.push(`${i + 1}. CTA BUTTON: "${block.content}" → ${block.href}`)
                break
        }
    })

    sections.push("")
    sections.push(`## Images (${parsed.images.length} total):`)
    parsed.images.forEach((img, i) => {
        sections.push(`  ${i + 1}. ${img.filename} (alt: "${img.alt}")`)
    })

    sections.push("")
    sections.push(`## Social Links: ${parsed.socialLinks.map((s) => s.platform).join(", ")}`)

    return sections.join("\n")
}

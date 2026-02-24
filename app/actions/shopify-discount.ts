"use server"

export async function generateShopifyDiscount(percentage: number = 5) {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const shopifyToken = process.env.SHOPIFY_ADMIN_TOKEN;

    if (!shopifyDomain || !shopifyToken) {
        return { success: false, error: "Missing Shopify API credentials in environment variables" };
    }

    const cleanDomain = shopifyDomain.replace('.myshopify.com', '') + '.myshopify.com';

    // Generate a random 6-character string
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const discountCode = `VIP${percentage}-${uniqueSuffix}`;

    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // Exactly 48 hours

    const payload = {
        price_rule: {
            title: discountCode,
            target_type: "line_item",
            target_selection: "all",
            allocation_method: "across",
            value_type: "percentage",
            value: `-${percentage}.0`,
            customer_selection: "all",
            usage_limit: 1, // Only allows 1 successful checkout!
            starts_at: startsAt,
            ends_at: endsAt
        }
    };

    try {
        // 1. Create the Price Rule
        const prRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/price_rules.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shopifyToken
            },
            body: JSON.stringify(payload)
        });

        if (!prRes.ok) throw new Error(`Shopify Price Rule Error: ${await prRes.text()}`);
        const prData = await prRes.json();
        const priceRuleId = prData.price_rule.id;

        // 2. Attach the actual Discount Code string to the Price Rule
        const dcRes = await fetch(`https://${cleanDomain}/admin/api/2024-01/price_rules/${priceRuleId}/discount_codes.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': shopifyToken
            },
            body: JSON.stringify({
                discount_code: { code: discountCode }
            })
        });

        if (!dcRes.ok) throw new Error("Failed to create the discount code in Shopify.");

        return { success: true, code: discountCode };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

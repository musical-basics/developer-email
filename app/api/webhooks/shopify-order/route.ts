import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Verify the request actually came from Shopify using HMAC
function verifyShopifyWebhook(body: string, hmacHeader: string | null): boolean {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret || !hmacHeader) return false;

    const hash = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");

    return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(hmacHeader)
    );
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const hmac = request.headers.get("x-shopify-hmac-sha256");

        // Verify HMAC signature (skip in dev if no secret configured)
        if (process.env.SHOPIFY_WEBHOOK_SECRET) {
            if (!verifyShopifyWebhook(rawBody, hmac)) {
                console.error("[Shopify Webhook] Invalid HMAC signature");
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const order = JSON.parse(rawBody);

        // Extract customer info from the order
        const customer = order.customer || {};
        const shippingAddress = order.shipping_address || order.billing_address || {};

        const email = (customer.email || order.email || order.contact_email || "").trim().toLowerCase();

        if (!email) {
            console.warn("[Shopify Webhook] Order received with no email, skipping");
            return NextResponse.json({ success: true, skipped: true, reason: "no_email" });
        }

        const firstName = customer.first_name || shippingAddress.first_name || "";
        const lastName = customer.last_name || shippingAddress.last_name || "";
        const phone = customer.phone || shippingAddress.phone || order.phone || null;
        const city = shippingAddress.city || null;
        const province = shippingAddress.province || null;
        const country = shippingAddress.country || shippingAddress.country_name || null;
        const countryCode = shippingAddress.country_code || null;
        const address1 = shippingAddress.address1 || null;
        const address2 = shippingAddress.address2 || null;
        const zip = shippingAddress.zip || null;

        // Extract order details for logging
        const orderName = order.name || order.order_number || "Unknown";
        const totalPrice = order.total_price || "0.00";
        const currency = order.currency || "USD";

        console.log(`[Shopify Webhook] Processing order ${orderName} for ${email} ($${totalPrice} ${currency})`);

        // Check if subscriber already exists
        const { data: existingUser } = await supabase
            .from("subscribers")
            .select("id, tags")
            .eq("email", email)
            .single();

        // Merge the "Purchased" tag
        const newTag = "Purchased";
        let mergedTags: string[] = [newTag];
        if (existingUser?.tags) {
            mergedTags = Array.from(new Set([...existingUser.tags, newTag]));
        }

        // Upsert subscriber with actual table columns
        const { data, error } = await supabase
            .from("subscribers")
            .upsert({
                email,
                first_name: firstName,
                last_name: lastName,
                tags: mergedTags,
                status: "active",
                country: country,
                country_code: countryCode,
                phone_number: phone,
                shipping_address1: address1,
                shipping_address2: address2,
                shipping_city: city,
                shipping_zip: zip,
                shipping_province: province,
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) {
            console.error("[Shopify Webhook] Supabase error:", error);
            throw error;
        }

        console.log(`[Shopify Webhook] ${existingUser ? "Updated" : "Created"} subscriber ${email} with Purchased tag (Order: ${orderName})`);

        return NextResponse.json({
            success: true,
            subscriber_id: data.id,
            is_new: !existingUser,
            order_name: orderName,
        });

    } catch (error: any) {
        console.error("[Shopify Webhook] Error:", error);
        // Always return 200 to Shopify so they don't retry endlessly
        return NextResponse.json(
            { error: error.message },
            { status: 200 }
        );
    }
}

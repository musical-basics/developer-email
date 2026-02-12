import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Admin client to update status
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // Handle array or single object if Resend changes structure, but typically it sends one event object
        const events = Array.isArray(payload) ? payload : [payload];

        for (const event of events) {
            const { type, data } = event;

            if (type === "email.bounced") {
                const email = data.to[0];
                console.log(`Processing bounce for ${email}`);
                if (email) {
                    const { error } = await supabase
                        .from("subscribers")
                        .update({ status: "bounced" })
                        .eq("email", email);

                    if (error) console.error("Failed to update bounce status:", error);
                }
            }
            else if (type === "email.complained") {
                const email = data.to[0];
                console.log(`Processing complaint for ${email}`);
                if (email) {
                    const { error } = await supabase
                        .from("subscribers")
                        .update({ status: "unsubscribed" }) // Treat complaint as unsubscribe
                        .eq("email", email);

                    if (error) console.error("Failed to update complaint status:", error);
                }
            }
        }

        return NextResponse.json({ received: true });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

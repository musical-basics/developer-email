import { createClient } from "@/lib/supabase/server";

export default async function UnsubscribePage({
    searchParams,
}: {
    searchParams: Promise<{ s?: string; c?: string }>;
}) {
    const resolvedParams = await searchParams; // Next.js 15+ async searchParams
    const subscriberId = resolvedParams.s;

    if (!subscriberId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500">Invalid unsubscribe link.</p>
                </div>
            </div>
        );
    }

    const supabase = await createClient();

    // 1. Update the subscriber status
    const { error } = await supabase
        .from("subscribers")
        .update({ status: "unsubscribed" })
        .eq("id", subscriberId);

    if (error) {
        console.error("Unsubscribe error:", error);
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p className="text-red-500 mb-2">Something went wrong.</p>
                    <p className="text-sm text-gray-500">Please try again later or contact support.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribed Successfully</h1>
                <p className="text-gray-600 mb-6">
                    You have been removed from our mailing list. You won't receive any further emails from us.
                </p>
                <a href="/" className="text-sm text-blue-600 hover:underline">
                    Return to homepage
                </a>
            </div>
        </div>
    );
}

// lib/chains/registry.ts
// Metadata about each chain for the management UI

import { CHAIN_TEMPLATES } from "./templates";

export interface ChainStep {
    templateKey: keyof typeof CHAIN_TEMPLATES;
    label: string;
    waitAfter?: string; // e.g. "2 days", "7 days"
}

export interface ChainDefinition {
    id: string;
    name: string;
    description: string;
    trigger: string;
    triggerEvent: string;
    steps: ChainStep[];
    branching?: {
        description: string;
        branches: { label: string; condition: string; action: string }[];
    };
}

export const CHAIN_REGISTRY: ChainDefinition[] = [
    {
        id: "dreamplay-onboarding-chain",
        name: "DreamPlay Onboarding",
        description: "The main sales funnel. Introduces DreamPlay, announces the crowdfund, then branches based on engagement.",
        trigger: "New subscriber signup (webhook)",
        triggerEvent: "chain.dreamplay.start",
        steps: [
            { templateKey: "dp_intro", label: "The Intro", waitAfter: "2 days" },
            { templateKey: "dp_crowdfund", label: "Crowdfund Announcement", waitAfter: "2 days" },
        ],
        branching: {
            description: "After 2 emails, checks subscriber engagement to decide the next step.",
            branches: [
                {
                    label: "High Interest",
                    condition: "Clicked a link in either email",
                    action: "Tags subscriber \"DreamPlay High Interest\" → sends urgency email (dp_urgency)"
                },
                {
                    label: "Low Interest",
                    condition: "Opened but didn't click",
                    action: "Tags subscriber \"DreamPlay Low Interest\" → hands off to Educational Chain"
                },
                {
                    label: "Ghosted",
                    condition: "Didn't open either email",
                    action: "Hands off to Educational Chain"
                },
            ]
        }
    },
    {
        id: "educational-drip-chain",
        name: "Educational Drip",
        description: "Weekly piano tips with dynamic frequency capping. Slows down to monthly after 3 consecutive misses.",
        trigger: "Handed off from DreamPlay chain (low interest / ghosted)",
        triggerEvent: "chain.educational.start",
        steps: [
            { templateKey: "edu_1", label: "Self-Taught Mistakes", waitAfter: "7 days (dynamic)" },
            { templateKey: "edu_2", label: "Memorization Framework", waitAfter: "7 days (dynamic)" },
            { templateKey: "edu_3", label: "Scales Debate", waitAfter: "7 days (dynamic)" },
            { templateKey: "edu_4", label: "Playing Fast", waitAfter: "7 days (dynamic)" },
            { templateKey: "edu_5", label: "Warm-Up Exercise" },
        ],
    }
];

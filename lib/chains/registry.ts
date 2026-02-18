// lib/chains/registry.ts
// Type definitions for email chains — data now lives in the database
// These types are kept for reference and use by Inngest functions

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

// NOTE: Chain definitions are now stored in the database (email_chains table).
// The CHAIN_REGISTRY constant has been removed. Use the getChains() server action instead.
// Inngest functions still reference CHAIN_TEMPLATES directly for email content.

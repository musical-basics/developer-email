// lib/chains/templates.ts

export const CHAIN_TEMPLATES = {
    dp_intro: {
        campaign_id: "5e3bba26-563d-4ee2-a9c7-cd7ef879220e",
        subject: "I've been keeping a secret...",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>Hi ${firstName},</p>
                <p>I have a confession to make. I spent 3 decades of my life playing on pianos that were simply too big for my hands.</p>
                <p>Then I discovered that standard keys are actually too wide for 87% of women and 24% of men. So, I decided to fix it.</p>
                <p><a href="https://dreamplaypianos.com/premium-offer">Click here to see the first prototype.</a></p>
                <p>Best,<br/>Lionel</p>
            </div>
        `
    },
    dp_crowdfund: {
        campaign_id: "8814b256-f5a3-49d8-b72d-a70a5218f1dc",
        subject: "The DreamPlay One is live.",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>${firstName}, the response has been overwhelming.</p>
                <p>The manufacturing molds are ready. We are officially opening up the Founder's Batch of the DreamPlay One.</p>
                <p><a href="https://dreamplaypianos.com/premium-offer">Secure your spot in Batch 1 here.</a></p>
                <p>Best,<br/>Lionel</p>
            </div>
        `
    },
    dp_urgency: {
        campaign_id: "f6a04df1-9709-4102-9ba8-5e87b782d47b",
        subject: "DreamPlay prices are doubling soon.",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>${firstName}, just a heads up.</p>
                <p>We are moving into official retail production. This means the DreamPlay One is moving to its retail MSRP of $1,199.</p>
                <p><a href="https://dreamplaypianos.com/premium-offer">Lock in the early $599 price here before it doubles.</a></p>
                <p>Best,<br/>Lionel</p>
            </div>
        `
    },
    educational_weekly: {
        campaign_id: "fa982d4c-59e0-4769-8000-63363864e88e",
        subject: "Your weekly piano insight",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>Hi ${firstName},</p>
                <p>Here is your weekly tip on piano technique and musicality...</p>
                <p>(We will dynamically inject educational content here later!)</p>
                <p>Best,<br/>Lionel</p>
            </div>
        `
    },
    edu_1: {
        campaign_id: "1929198d-c001-42a4-8f9c-e172eaf24721",
        subject: "The biggest mistake self-taught pianists make",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>Hi ${firstName}, welcome to the academy.</p>
                <p>Over the next few weeks, I'm going to share the techniques I learned performing at Carnegie Hall.</p>
                <p>Today's tip: Stop playing from your fingers. Play from your back. Here's why...</p>
            </div>
        `
    },
    edu_2: {
        campaign_id: "db485711-c70b-44c1-aa61-570f2b4b4678",
        subject: "How to memorize a 10-page piece",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>${firstName}, memory isn't about your fingers. It's about theory.</p>
                <p>Here is my framework for harmonic memorization...</p>
            </div>
        `
    },
    edu_3: {
        campaign_id: "9cd1c147-ae9e-44dd-86ab-4bc9547397b9",
        subject: "Why scales are a waste of time (sometimes)",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>Hi ${firstName},</p>
                <p>Don't shoot the messenger, but running up and down C Major won't make you Chopin.</p>
            </div>
        `
    },
    edu_4: {
        campaign_id: "a2d17d7b-abcc-4253-8da4-8ca6a570b4c4",
        subject: "The secret to playing fast without tension",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>${firstName}, speed is a byproduct of relaxation, not effort.</p>
            </div>
        `
    },
    edu_5: {
        campaign_id: "7d688767-99b6-4c00-9818-19bfe1a4fb99",
        subject: "My favorite warm-up exercise",
        generateHtml: (firstName: string) => `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #111;">
                <p>Hi ${firstName},</p>
                <p>Before you tackle that Chopin Ballade, you need to warm up your wrists correctly.</p>
            </div>
        `
    }
};

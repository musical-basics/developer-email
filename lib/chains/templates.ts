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
    }
};

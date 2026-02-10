// Project data
const projects = [
    {
        id: 1,
        name: "Create Unbound",
        category: "modpacks",
        subcategory: "tech",
        status: "soon",
        logo: "images/unboundlogo.webp",
        description: "COMING SOON",
        version: "Neoforge 26.1",
        features: ["Create", "Coming Soon", "Automation"],
        screenshots: ["images/unboundlogo.webp"],
        downloadUrl: "#",
        downloads: "-",
        lastUpdate: "-"
    },
    {
        id: 2,
        name: "{Additions}",
        category: "modpacks",
        subcategory: "vanilla+",
        status: "updated",
        logo: "https://cdn.modrinth.com/data/62BJPui0/b9c7d20546212d230ce6dbc228d87abe1f5d5247_96.webp",
        description: "Are you ready for the ultimate Vanilla+ Experience? Additions is the perfect Vanilla+ Modpack for you! It has great performance, Overhauled Biomes, Overhauled Nether + END, Over 150+ New Food and Crops, New Mobs and more...",
        version: "Fabric 1.21.1-1.21.10",
        features: ["150+ New Foods & Crops", "Overhauled Biomes", "Enhanced Nether & End", "New Mobs", "Performance Optimized", "QOL Improvements"],
        screenshots: [
            "https://media.forgecdn.net/attachments/912/951/2024-07-10_15.png",
            "https://media.forgecdn.net/attachments/912/955/2024-07-10_15.png",
            "https://media.forgecdn.net/attachments/912/952/2024-07-10_15.png"
        ],
        modrinthUrl: "https://modrinth.com/modpack/additions-fabric",
        downloadUrl: "https://www.curseforge.com/minecraft/modpacks/fabis-additions",
        downloads: "8K+",
        lastUpdate: "2025-07-31"
    },
    {
        id: 3,
        name: "Create F&M 3",
        category: "modpacks",
        subcategory: "tech",
        status: "discontinued",
        logo: "https://media.forgecdn.net/attachments/1203/147/fm3logonew-png.png",
        description: "Create F&M 3 is the latest evolution of the Create: F&M series, bringing unparalleled mechanical automation and engineering creativity to Minecraft.",
        version: "Neoforge 1.21.1",
        features: ["Community Server", "Create Mod Ecosystem", "Deep Dark Dimension", "Quest System", "New Terrain Generation", "Advanced Automation"],
        screenshots: [
            "https://media.forgecdn.net/attachments/1116/125/2025-03-04_21-22-27-png.png",
            "https://media.forgecdn.net/attachments/1159/442/create_stuff-png.png"
        ],
        downloadUrl: "https://www.curseforge.com/minecraft/modpacks/create-fm3",
        downloads: "15K+",
        lastUpdate: "2025-07-22"
    },
    {
        id: 4,
        name: "Create F&M 2",
        category: "modpacks",
        subcategory: "tech",
        status: "discontinued",
        logo: "https://media.forgecdn.net/avatars/thumbnails/1132/43/64/64/638691888215133405.png",
        description: "Create F&M2 is perfect for the Create mod experience with beautiful landscapes and new terrain generation.",
        version: "Forge 1.20.1",
        features: ["Create Mod", "Create Add-ons", "Immersive Aircraft", "Farmers Delight"],
        screenshots: ["https://media.forgecdn.net/attachments/907/43/2024-07-03_16.png"],
        downloadUrl: "https://www.curseforge.com/minecraft/modpacks/create-f-m-2",
        modrinthUrl: "https://modrinth.com/modpack/create-fm-2",
        downloads: "2K+",
        lastUpdate: "2024-07-03"
    },
    {
        id: 5,
        name: "Fabi's Lootr",
        category: "resourcepacks",
        status: "updated",
        logo: "https://media.forgecdn.net/attachments/1206/422/lootr-png.png",
        description: "New textures for the Lootr mod.",
        version: "1.20.1+",
        features: ["Lootr Chest Reskin", "Lootr Barrel Reskin"],
        screenshots: [
            "https://cdn.modrinth.com/data/cached_images/49a06ad5bbbff69935e092dee42189c5a47ee27b.png",
            "https://cdn.modrinth.com/data/cached_images/ae32144429b2759c1bf64613fa9d20e2d8f655c0.png"
        ],
        downloadUrl: "https://www.curseforge.com/minecraft/texture-packs/fabi-s-lootr",
        modrinthUrl: "https://modrinth.com/resourcepack/fabis-lootr",
        downloads: "15K+",
        lastUpdate: "2025-07-15"
    }
];

// Status configuration
const statusConfig = {
    discontinued: { label: "🚫 Discontinued", class: "status-discontinued" },
    beta: { label: "⚠️ Beta", class: "status-beta" },
    soon: { label: "Coming Soon", class: "status-soon" },
    active: { label: "✅ Active", class: "status-active" },
    updated: { label: "🆕 Recently Updated", class: "status-updated" }
};

// Changelog data
const changelogs = {
    "{Additions}": [
        {
            version: "21.8.2",
            date: "2025-07-31",
            changes: ["Added stunning new particle effects", "Introduced 25+ new food items", "Added 3 new biomes"]
        }
    ],
    "Create F&M 3": [
        {
            version: "[Deep Production] 3.3",
            date: "2025-07-21",
            changes: ["🌑 New Deep Dark Dimension", "🎂 New 'Blaze Cake' variants", "📋 50+ new quests"]
        }
    ]
};

// Roadmap data
const roadmapItems = [
    {
        id: 1,
        title: "Create Unbound - Full Release",
        description: "The ultimate Create mod experience with new features and performance optimizations.",
        status: "in-progress",
        category: "modpacks",
        priority: "high",
        progress: 0,
        estimatedDate: "Q2 2026",
        features: [
            "Advanced Create automation chains",
            "Performance optimization for large factories",
            "Integration with  Create addons",
            "Modrinth and Curseforge as a same Version"
        ],
        updates: [
            {
                date: "2026-01-15",
                text: "Waiting for 26.1 release of the create mod"
            }
        ]
    },
    {
        id: 2,
        title: "{Additions} Rebound",
        description: "A Vanilla+ modpack",
        status: "planned",
        category: "modpacks",
        priority: "medium",
        progress: 0,
        estimatedDate: "2026",
        features: [
            "Vanilla+ mods"
        ],
        updates: []
    },
        {
        id: 3,
        title: "Project Leuna - Reborn (Roblox)",
        description: "A Roblox roleplay game",
        status: "in-progress",
        category: "roblox",
        priority: "low",
        progress: 2,
        estimatedDate: "2026/2027",
        features: [
            "Roleplay Elements",
            "Replica of the german city Leuna"
        ],
        updates: [
            {
                date: "2026-01-28",
                text: "Started work on the game again since 2024"
            },
            {
                date: "2026-01-29",
                text: "Added Stamina System"
            },
            {
                date: "2026-01-30",
                text: "Added Main Menu and Map updates"
            },
            {
                date: "2026-02-05",
                text: "Reworked the entire Roleplay Framework"
            }        
        ]
    },
    {
        id: 4,
        title: "Create: Project Arcane",
        description: "A Create Modpack based on create and magic mods",
        status: "onhold",
        category: "modpacks",
        priority: "low",
        progress: 0,
        estimatedDate: "2026/2027",
        features: [
            "Advanced Create automation with magic"
        ],
        updates: []
    }
];

// Roadmap status configuration
const roadmapStatusConfig = {
    completed: {
        label: "✅ Completed",
        class: "bg-gradient-to-r from-green-500 to-emerald-600",
        icon: "✅"
    },
    "in-progress": {
        label: "🚧 In Progress",
        class: "bg-gradient-to-r from-blue-500 to-cyan-600",
        icon: "🚧"
    },
    planned: {
        label: "📋 Planned",
        class: "bg-gradient-to-r from-purple-500 to-pink-600",
        icon: "📋"
    },
    onhold: {
        label: "⏸️ On Hold",
        class: "bg-gradient-to-r from-yellow-500 to-orange-600",
        icon: "⏸️"
    }
};

// Roadmap priority configuration
const priorityConfig = {
    high: { label: "High Priority", class: "text-red-400", icon: "🔥" },
    medium: { label: "Medium Priority", class: "text-yellow-400", icon: "⚡" },
    low: { label: "Low Priority", class: "text-blue-400", icon: "💡" }
};

// Blog/News data
const blogPosts = [
    {
        id: 1,
        title: "Hytale Community Server is now open!",
        slug: "hytale-server-opening",
        category: "announcement",
        date: "2026-02-03",
        author: "Itzz_Fabi",
        excerpt: "Our Hytale community server is now open!",
        content: `
            <h3>Join us!</h3>
            <p>The Server is now open!</p>

            <h3>Important Information</h3>
            <ul>
                <li><strong>Server IP:</strong> 176.9.102.179:25571</li>
                <li><strong>Ingame use /help</strong> - For viewing important commands</li>
                <li><strong>Claiming Mod</strong> - You can claim chunks. Use /help and search for simpleclaims</li>
            </ul>

            <p>Come join us!</p>
        `,
        image: "images/news/hytale.webp",
        tags: ["News", "Community", "Hytale"]
    },
    {
        id: 2,
        title: "Welcome to FabiMvurice Interactive",
        slug: "welcome-to-fmstudios",
        category: "news",
        date: "2026-02-02",
        author: "Itzz_Fabi",
        excerpt: "Happy New Year! We're kicking off 2026 with exciting plans for our Minecraft modpack community.",
        content: `
            <p>Happy New Year from the entire FabiMvurice Interactive team! We're thrilled to kick off 2026 with some exciting plans for our Minecraft modpack community.</p>

            <h3>Looking Back at 2025</h3>
            <p>Last year was incredible for us. We released multiple updates for {Additions} and Create F&M 3, reaching over 25K+ combined downloads across our projects!</p>

            <h3>What's Coming in 2026</h3>
            <ul>
                <li><strong>Create Unbound</strong> - Our most ambitious project yet</li>
                <li><strong>{Additions} Rebound</strong> - A fresh take on Vanilla+</li>
                <li><strong>Project Leuna - Reborn</strong> - Expanding beyond Minecraft into Roblox</li>
            </ul>

            <p>Thank you for being part of our community. Here's to an amazing 2026!</p>
        `,
        image: "images/fmlogo.png",
        tags: ["News", "Community", "2026"]
    }
];

// Blog category configuration
const blogCategoryConfig = {
    announcement: { label: "Announcement", class: "bg-gradient-to-r from-purple-500 to-pink-600", icon: "📢" },
    update: { label: "Update", class: "bg-gradient-to-r from-green-500 to-emerald-600", icon: "🆕" },
    news: { label: "News", class: "bg-gradient-to-r from-blue-500 to-cyan-600", icon: "📰" },
    guide: { label: "Guide", class: "bg-gradient-to-r from-orange-500 to-amber-600", icon: "📖" }
};

// Kinetic Hosting Partner Data
const kineticHosting = {
    name: "Kinetic Hosting",
    tagline: "Premium Minecraft Server Hosting",
    description: "Our official hosting partner for all FabiMvurice Interactive modpacks. Get powerful servers optimized for modded Minecraft with instant setup and 24/7 human support.",
    affiliateUrl: "https://billing.kinetichosting.net/aff.php?aff=855",
    features: [
        {
            icon: "rocket",
            title: "Instant Modpack Installation",
            description: "One-click installation for popular modpacks including Create, Fabric, and Forge packs. Get your server running in minutes."
        },
        {
            icon: "memory",
            title: "High RAM Plans",
            description: "Plans up to 32GB RAM perfect for heavy modpacks like Create Unbound and tech-focused packs with large factories."
        },
        {
            icon: "support",
            title: "24/7 Human Support",
            description: "Real humans available around the clock. No AI bots - get actual help when you need it most."
        },
        {
            icon: "panel",
            title: "Custom Game Panel",
            description: "Easy-to-use control panel with built-in mod/plugin installers, file manager, and server console."
        },
        {
            icon: "performance",
            title: "Premium Hardware",
            description: "High-performance NVMe SSDs and latest-gen processors for smooth gameplay even with 200+ mods."
        },
        {
            icon: "price",
            title: "Affordable Pricing",
            description: "Starting at just $0.87/GB - up to 70% cheaper than competitors without sacrificing quality."
        }
    ],
    stats: [
        { value: "44+", label: "Games Supported" },
        { value: "24/7", label: "Human Support" },
        { value: "99.9%", label: "Uptime Guarantee" },
        { value: "$0.87", label: "Per GB/Month" }
    ],
    whyWeChose: "We partnered with Kinetic Hosting because they understand modded Minecraft. Their servers handle our Create modpacks flawlessly, and their support team actually knows what they're doing. When our community members have issues, they get real help - not automated responses."
};

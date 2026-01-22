// Project data
const projects = [
    {
        id: 1,
        name: "Create Unbound",
        category: "modpacks",
        subcategory: "tech",
        status: "soon",
        logo: "https://media.forgecdn.net/avatars/1459/645/638947343050937463.png",
        description: "COMING SOON",
        version: "Neoforge 1.21.1",
        features: ["Create", "Coming Soon", "Revolutionary Automation"],
        screenshots: ["https://media.forgecdn.net/avatars/1459/645/638947343050937463.png"],
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
        name: "Fabí s Lootr",
        category: "resourcepacks",
        status: "updated",
        logo: "https://media.forgecdn.net/attachments/1206/422/lootr-png.png",
        description: "Transform your Lootr chests and barrels with high-quality, realistic textures.",
        version: "1.20.1+",
        features: ["Lootr Chest Reskin", "Lootr Barrel Reskin", "Realistic Design"],
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

// Team members data
const teamMembers = [
    {
        id: 1,
        name: "Itzz_Fabi",
        rank: "Founder & Lead Developer",
        image: "https://i.imgur.com/r15H56Q.jpeg",
        description: "Fabi had the original Idea to make Minecraft Modpacks. In 2023 he an Maurice decided to make some modpacks.",
        social: { discord: "itzz_fabi237", instagram: "https://www.instagram.com/fabimvurice.interactive/#" }
    },
    {
        id: 2,
        name: "Mvurice",
        rank: "Founder",
        image: "https://i.imgur.com/rE2mi9F.jpeg",
        description: "Maurice is one of the original Founders with Fabi.",
        social: { instagram: "https://www.instagram.com/fabimvurice.interactive/#", discord: "mvurice.kk" }
    },
    {
        id: 3,
        name: "Moped_Junge",
        rank: "Co-Owner",
        image: "https://i.imgur.com/aZcdHkp.jpeg",
        description: "Moped Junge was there from the very beginning and became co-owner when Create Unbound was released.",
        social: { discord: "moped_junge", instagram: "https://www.instagram.com/2_takt_jeremy" }
    },
    {
        id: 4,
        name: "ItzErrorz",
        rank: "Support",
        image: "https://i.imgur.com/SbOvaHd.png",
        description: "ItzErrorz was a player of the Create F&M 3 Modpack and joined the team.",
        social: {}
    }
];

// Status configuration
const statusConfig = {
    discontinued: { label: "🚫 Discontinued", class: "status-discontinued" },
    beta: { label: "⚠️ Beta", class: "status-beta" },
    soon: { label: "🔜 Coming Soon", class: "status-soon" },
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

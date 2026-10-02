---
title: Create Encased (Fly Port)
type: Mods
status: Released
version: "26.2"
loader: Fabric
tagline: This is a unofficial port of the "Create Encased" mod for the new 26.2 version
summary: This is a unofficial port of the "Create Encased" mod for the new 26.2 version
image: ../../assets/projects/encased_port.png
accent: "oklch(0.74 0.14 65)"
featured: true
order: 1
links:
  - label: Modrinth
    url: "https://modrinth.com/mod/create-encased-fly-port"
  - label: CurseForge
    url: "https://www.curseforge.com/minecraft/mc-mods/create-encased-fly-port"
---

This is an unofficial port of [Create Encased](https://www.curseforge.com/minecraft/mc-mods/create-encased) by iglee42 to [Create Fly](https://github.com/ZurrTum/Create-Fly) on Fabric, Minecraft 26.2.

iglee42 is not involved in this port and doesn't support it, so please don't send them bug reports for it. Report issues [here](https://github.com/FmStudios-MC/create-encased-fly/issues) instead.

## What it does

Create's machines, shafts, cogwheels and fluid blocks in every casing.

*   **Casings**: andesite, brass, copper, railway, shadow steel, refined radiance, industrial iron and weathered iron, plus new creative and zinc casings. Each set brings its own encased shafts and cogwheels, gearboxes, presses, mixers, depots, chain drives, chain conveyors, gearshifts, clutches, deployers, fans, harvesters, saws, drills, ploughs, rollers, portable storage interfaces and belt casings (as far as the original mod made them for that casing).
*   **Shafts and cogwheels** in every wood type, brass, copper, zinc, andesite, glass and blackstone, and each of them encased in every casing.
*   **Fluid blocks** in andesite, brass and zinc: pipes, glass pipes, pumps, smart pipes, valves, valve handles, tanks, hose pulleys, item drains, portable fluid interfaces, steam engines, whistles and spouts.
*   **New blocks**: configurable gearbox, automatic clutch, creative cogwheel.
*   Right-click a machine with another casing to swap its casing, or a shaft or cogwheel with a material to swap its material. Both can be turned off in the config.

743 blocks in all. Every variant works like the Create block it's made from: same stress, same behaviour on contraptions, same pipes and fluid transfer, same JEI categories and ponder scenes.

## Requirements

*   Minecraft 26.2
*   Fabric Loader 0.19.3+
*   Fabric API 0.160.0+26.2 or newer
*   Create Fly 26.2-rc-2-6.0.9-1 or newer
*   JEI is optional

Install it on both client and server.

## Config

`config/createcasing/common.json`: casing and material swapping, the configurable gearbox's shaft rules, breaking wooden and glass shafts, and per-block stress values. The stress values are only used when `encasedBlocksUsesOwnKeys` is on; otherwise every block uses the value of the Create block it's based on.

## Differences from the NeoForge version

*   The KubeJS and Slice and Dice / Farmer's Delight integrations are not included, because those mods have no Fabric 26.2 release. That also means no slicers.
*   There's no REI integration, only JEI.
*   Pick-block on an encased shaft or cogwheel always gives you the casing. Minecraft 26.2 no longer tells the block where you're looking, so it can't pick the shaft part.
*   The side textures of the shadow steel and refined radiance encased cogwheels were missing in the original and are fixed here.

Block and item IDs are the same as in the original, so recipes and datapacks written for it keep working.

## Status

Beta. Everything works in my testing, but with 743 blocks not every one has seen real play yet. If something breaks, open an issue with your mod versions and the log.

## Credits and licence

Create Encased was made by iglee42. Create Fly is by ZurrTum.

The original code is © 2025 iglee42 under the MIT licence, which this port keeps: [LICENSE](https://github.com/FmStudios-MC/create-encased-fly/blob/master/LICENSE).

Source: [GitHub](https://github.com/FmStudios-MC/create-encased-fly)
---
title: Create New Age (Fly Port)
type: Mods
status: Released
version: "26.2"
loader: Fabric
tagline: This is a unofficial port of the popular "Create New Age" mod for 26.2
summary: This is a unofficial port of the popular "Create New Age" mod for 26.2
image: ../../assets/projects/fabric_logo_2048_scharf.png
accent: "oklch(0.74 0.14 65)"
featured: true
order: 2
links:
  - label: Modrinth
    url: "https://modrinth.com/mod/create-fly-new-age"
  - label: CurseForge
    url: "https://www.curseforge.com/minecraft/mc-mods/create-new-age-fly-port"
---

This is an unofficial port of [Create: New Age](https://gitlab.com/antarcticgardens/create-new-age) by Antarctic Gardens to [Create Fly](https://modrinth.com/mod/create-fly) on Fabric, Minecraft 26.2.

Antarctic Gardens own all rights to Create: New Age. They are not involved in this port and don't support it, so please don't send them bug reports for it. Report issues [here](https://github.com/FmStudios-MC/create-new-age-fly/issues) instead.

## What's in it

Everything from Create: New Age 1.2.1:

- Generator coils, magnets and carbon brushes to make energy from rotation
- Electrical connectors and wires (copper, overcharged iron, gold and diamond)
- Electric motors and motor extensions
- Energisers for making overcharged materials
- Heat pipes, heat pumps, solar heating plates, heaters and the stirling engine
- Thorium, nuclear fuel and reactors
- Street lights and lamp posts
- Ponder scenes
- The optional "monkey edition" recipe datapack

## Requirements

- Minecraft 26.2
- Fabric Loader 0.19.3+
- [Fabric API](https://modrinth.com/mod/fabric-api) 0.160.0+26.2 or newer
- [Create Fly](https://modrinth.com/mod/create-fly) 26.2-rc-2-6.0.9-1 or newer

Optional: [JEI](https://modrinth.com/mod/jei) for the energising recipes, [CC: Tweaked](https://modrinth.com/mod/cc-tweaked) for motor, energiser and carbon brush peripherals.

Install it on both client and server.

## Differences from the NeoForge version

Energy uses [Team Reborn Energy](https://github.com/TechReborn/Energy) instead of NeoForge's energy system, so it works with other Fabric energy mods. It's bundled in the jar.

Config files are `config/create_new_age-server.toml` and `config/create_new_age-client.toml`, with the same options as the original.

## Status

Beta. It has been stable in my testing, but it hasn't seen much real play yet. If something breaks, open an issue with your mod versions and the log.

## Credits and licence

Create: New Age was made by Antarctic Gardens, with models, textures and translations from the people listed in [CREDITS.md](https://github.com/FmStudios-MC/create-new-age-fly/blob/main/CREDITS.md). Create Fly is by ZurrTum.

The original is © 2023 Antarctic Gardens under a BSD-style licence, which this port keeps: [LICENSE](https://github.com/FmStudios-MC/create-new-age-fly/blob/main/LICENSE).

Source: [GitHub](https://github.com/FmStudios-MC/create-new-age-fly)

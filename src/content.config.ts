import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Category drives the Work filter
      type: z.enum([
        "Modpacks",
        "Mods",
        "Resource Packs",
        "Roblox",
        "Programs",
      ]),
      status: z.enum(["Released", "In development"]),
      version: z.string().optional(),
      loader: z.string().optional(),
      tagline: z.string(),
      summary: z.string(),
      image: image(),
      // Foreground art that sits on a solid colour (logos) vs. should fill the frame
      links: z
        .array(z.object({ label: z.string(), url: z.string() }))
        .default([]),
      featured: z.boolean().default(false),
      accent: z.string().optional(),
      order: z.number().default(99),
    }),
});

export const collections = { projects };

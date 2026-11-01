import { defineCollection } from "astro:content";
import { z } from "astro/zod";
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
      // Optional until a project has real art; a marked placeholder shows instead.
      image: image().optional(),
      links: z
        .array(z.object({ label: z.string(), url: z.string() }))
        .default([]),
      featured: z.boolean().default(false),
      order: z.number().default(99),
    }),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Drives ordering (newest first) and the displayed dateline
      date: z.coerce.date(),
      // Free-form labels. Defining a tag is writing it on a post.
      tags: z.array(z.string()).default([]),
      summary: z.string(),
      // Optional cover art, rendered through Astro <Image> when present
      image: image().optional(),
      author: z.string().default("FabiMvurice Interactive"),
      featured: z.boolean().default(false),
      // Kept out of the build until ready
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, news };

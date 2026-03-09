import { readFileSync } from "fs";
import { resolve } from "path";
import { putCategory, putNominee } from "./db/categories.js";
import type { Category, Nominee } from "./types/index.js";

const dataPath = resolve(import.meta.dirname, "../../data/2026-nominees.json");
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log(`Seeding ${data.categories.length} categories for ${data.ceremony}...`);

for (const cat of data.categories) {
  const category: Category = {
    categoryId: cat.categoryId,
    name: cat.name,
    displayOrder: cat.displayOrder,
    showImages: cat.showImages ?? false,
    winnerId: null,
    locked: false,
    resolvedAt: null,
  };

  await putCategory(category);
  console.log(`  ${cat.name} (${cat.nominees.length} nominees)`);

  for (let i = 0; i < cat.nominees.length; i++) {
    const nom = cat.nominees[i];
    const nominee: Nominee = {
      nomineeId: nom.nomineeId,
      categoryId: cat.categoryId,
      name: nom.name,
      subtitle: nom.subtitle,
      imageUrl: nom.imageUrl,
      displayOrder: i + 1,
    };
    await putNominee(nominee);
  }
}

console.log("Done!");

import { Hono } from "hono";
import { getCategories, getCategory, getNominees } from "../db/categories.js";

const app = new Hono();

// List all categories with nominees
app.get("/", async (c) => {
  const categories = await getCategories();

  // Fetch nominees for each category in parallel
  const withNominees = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      nominees: await getNominees(cat.categoryId),
    }))
  );

  return c.json(withNominees);
});

// Get single category with nominees
app.get("/:categoryId", async (c) => {
  const categoryId = c.req.param("categoryId");
  const category = await getCategory(categoryId);
  if (!category) return c.json({ error: "Not found" }, 404);

  const nominees = await getNominees(categoryId);
  return c.json({ ...category, nominees });
});

export default app;

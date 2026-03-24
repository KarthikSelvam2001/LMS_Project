import { Router, type IRouter } from "express";
import { Category, Course } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const courseCount = await Course.countDocuments({ categoryId: cat._id });
        return {
          id: cat._id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          isActive: cat.isActive,
          courseCount,
        };
      })
    );
    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const cat = await Category.create({ name, description, icon });
    res.status(201).json({ ...cat.toObject(), id: cat._id, courseCount: 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to create category" });
  }
});

export default router;

import { PrismaClient } from "@prisma/client";
const globalDB = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalDB.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDB.prisma = db;
export const projectInclude = {
  column: true,
  category: true,
  tags: true,
  tasks: {
    include: { subtasks: true, tags: true },
    orderBy: { position: "asc" as const },
  },
  notes: true,
  milestones: true,
};
export async function snapshot() {
  const [projects, columns, categories, activities] = await Promise.all([
    db.project.findMany({
      include: projectInclude,
      orderBy: { position: "asc" },
    }),
    db.column.findMany({ orderBy: { position: "asc" } }),
    db.category.findMany(),
    db.activity.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return { projects, columns, categories, activities };
}

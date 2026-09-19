import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const date = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
async function main() {
  if (await db.project.count()) return;
  const names = [
    "Ideas",
    "Planning",
    "In Progress",
    "Blocked",
    "Testing / Review",
    "Completed",
  ];
  const colors = [
    "#9695a5",
    "#c09750",
    "#8070dc",
    "#df836c",
    "#6d9ccc",
    "#65a78c",
  ];
  const columns = await Promise.all(
    names.map((name, position) =>
      db.column.create({ data: { name, position, color: colors[position] } }),
    ),
  );
  const cats = await Promise.all(
    [
      "School",
      "Cybersecurity",
      "AI",
      "Home Lab",
      "Software Development",
      "Networking",
      "Career",
      "Financial",
      "Personal",
      "Other",
    ].map((name) => db.category.create({ data: { name } })),
  );
  const seeds = [
    [
      "Personal finance tracker",
      "A clearer picture of spending, saving, and everything in between.",
      "Financial",
      0,
      "Low",
      21,
      ["research", "personal"],
      ["Explore budget methods", "Sketch dashboard", "Choose data sources"],
      0,
    ],
    [
      "Homelab monitoring",
      "One dashboard for server health, uptime, and useful alerts.",
      "Home Lab",
      0,
      "Medium",
      16,
      ["homelab", "docker"],
      ["Evaluate Grafana", "List metrics", "Design alert rules"],
      0,
    ],
    [
      "Cybersecurity career plan",
      "Build the skills and portfolio for the next chapter.",
      "Career",
      1,
      "High",
      12,
      ["career", "security"],
      [
        "Update resume",
        "Improve LinkedIn",
        "Build portfolio",
        "Identify target roles",
        "Track applications",
        "Study security tools",
      ],
      2,
    ],
    [
      "Portfolio refresh",
      "A thoughtful home for my work, experiments, and ideas.",
      "Software Development",
      1,
      "Medium",
      18,
      ["design", "personal"],
      [
        "Gather case studies",
        "Design homepage",
        "Build project pages",
        "Deploy website",
      ],
      1,
    ],
    [
      "PC Parts enterprise network",
      "Design and deploy a secure network for the entire company.",
      "Networking",
      2,
      "High",
      3,
      ["networking", "capstone"],
      [
        "Configure router interfaces",
        "Configure VLANs",
        "Configure management VLAN 99",
        "Configure DHCP",
        "Configure DNS",
        "Configure Active Directory",
        "Configure firewall",
        "Build company website",
        "Test workstation connectivity",
        "Document topology",
      ],
      6,
    ],
    [
      "AI home lab",
      "A local-first AI workspace. Private, powerful, and always available.",
      "AI",
      2,
      "Medium",
      7,
      ["AI", "docker", "homelab"],
      [
        "Configure Ollama",
        "Deploy OpenWebUI",
        "Configure Docker containers",
        "Configure Hermes agents",
        "Test local models",
        "Configure remote access",
        "Configure startup services",
      ],
      3,
    ],
    [
      "Security+ study plan",
      "Make steady progress toward the certification exam.",
      "Cybersecurity",
      2,
      "High",
      14,
      ["security", "learning"],
      [
        "Network fundamentals",
        "Threat analysis",
        "Identity management",
        "Practice exam",
        "Review weak areas",
      ],
      2,
    ],
    [
      "NAS backup automation",
      "Reliable, automated backups for the things that matter.",
      "Home Lab",
      3,
      "Critical",
      -2,
      ["automation", "waiting"],
      [
        "Set retention policy",
        "Order replacement drive",
        "Configure backup job",
        "Test recovery",
      ],
      1,
    ],
    [
      "Docker development setup",
      "A reproducible environment for every new project.",
      "Software Development",
      4,
      "Medium",
      2,
      ["docker", "automation"],
      [
        "Write Dockerfiles",
        "Configure compose",
        "Test volumes",
        "Document setup",
      ],
      3,
    ],
    [
      "Spring semester planner",
      "A little structure for a more focused semester.",
      "School",
      5,
      "Low",
      -5,
      ["school"],
      ["Import schedule", "Organize courses", "Create weekly routine"],
      3,
    ],
  ] as const;
  for (const [position, s] of seeds.entries()) {
    const [name, description, category, col, priority, due, tags, tasks, done] =
      s;
    const p = await db.project.create({
      data: {
        name,
        description,
        columnId: columns[col].id,
        categoryId: cats.find((c) => c.name === category)!.id,
        priority,
        dueDate: date(due),
        startDate: date(-14),
        position,
        pinned: col === 2,
        tags: {
          connectOrCreate: tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        tasks: {
          create: tasks.map((title, i) => ({
            title,
            status: i < done ? "Done" : i === done ? "In Progress" : "To Do",
            priority,
            dueDate: date(due + i - 2),
            position: i,
            completedAt:
              i < done ? new Date(Date.now() - (done - i) * 86400000) : null,
          })),
        },
        notes: {
          create: {
            title: "Getting started",
            content: `# ${name}\n\n## Objective\n${description}\n\n## Next steps\n- [ ] Review the scope\n- [ ] Capture decisions here\n\nKeep the next step small and actionable.`,
          },
        },
        milestones: {
          create: {
            name: "First working version",
            description: "Core scope complete and ready to review.",
            dueDate: date(due),
            progress: Math.round((done / tasks.length) * 100),
            status: col === 5 ? "Completed" : "Upcoming",
          },
        },
      },
    });
    await db.activity.create({
      data: {
        projectId: p.id,
        action: col === 5 ? "Project completed" : "Project created",
        metadata: name,
      },
    });
  }
}
main().finally(() => db.$disconnect());

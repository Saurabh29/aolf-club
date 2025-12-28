import "dotenv/config";
import { createRole, createPage, setRolePagePermission, getPageByName } from "../src/server/db/repositories/permission.repository";

export async function seed() {
  const pages = ["Dashboard", "Locations", "Tasks", "ServeHub", "Users"];
  const roles = ["Admin", "Teacher", "Volunteer"];

  // Create pages
  for (const p of pages) {
    try {
      const created = await createPage({ pageName: p, description: `${p} page` });
      console.log(`Created page: ${p} (${created.pageId})`);
    } catch (e: any) {
      // Try to fetch existing page by name to get the pageId
      const existing = await getPageByName(p);
      if (existing) {
        console.log(`Page ${p} already exists: (${existing.pageId})`);
      } else {
        console.log(`Page ${p} may already exist: ${e.message}`);
      }
    }
  }

  // Create roles
  for (const r of roles) {
    try {
      await createRole({ roleName: r, description: `${r} role` });
      console.log(`Created role: ${r}`);
    } catch (e: any) {
      console.log(`Role ${r} may already exist: ${e.message}`);
    }
  }

  // Permissions mapping
  const allowAll = ["Dashboard", "Locations", "Tasks", "ServeHub", "Users"];
  const volunteerPages = ["Dashboard", "Tasks", "ServeHub"];

  // Admin and Teacher: allow all
  for (const page of allowAll) {
    // Resolve pageId by looking up the page by name
    const existing = await getPageByName(page);
    const pageId = existing?.pageId ?? null;
    if (!pageId) {
      console.log(`Warning: pageId not found for ${page}; skipping permission setup`);
      continue;
    }
    await setRolePagePermission("Admin", pageId, page, { access: "ALLOW" });
    await setRolePagePermission("Teacher", pageId, page, { access: "ALLOW" });
    console.log(`Allowed ${page} for Admin and Teacher`);
  }

  // Volunteer: allow only some pages
  for (const page of allowAll) {
    const perm = volunteerPages.includes(page) ? "ALLOW" : "DENY";
    const existing = await getPageByName(page);
    const pageId = existing?.pageId ?? null;
    if (!pageId) {
      console.log(`Warning: pageId not found for ${page}; skipping Volunteer permission`);
      continue;
    }
    await setRolePagePermission("Volunteer", pageId, page, { access: perm as "ALLOW" | "DENY" });
    console.log(`Set Volunteer ${page} -> ${perm}`);
  }

  console.log("Seeding complete.");
}

// If the script is run directly (not imported), execute seed()
if (process.argv[1] && process.argv[1].endsWith("seed-roles-permissions.ts")) {
  seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}

export default seed;

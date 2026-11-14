import { eq } from "drizzle-orm";
import { emptyPracticeSettings, type PracticeSettings } from "@azime/contracts";
import { db } from "../db/index.js";
import { PracticeSettings as PracticeSettingsTable } from "../db/schema.js";

// Pass the transaction when inside one, so it doesn't take a second connection.
export async function getPracticeSettings(
  executor: Pick<typeof db, "select"> = db
): Promise<PracticeSettings> {
  const [row] = await executor
    .select({ settings: PracticeSettingsTable.settings })
    .from(PracticeSettingsTable)
    .where(eq(PracticeSettingsTable.id, 1));
  return row?.settings ?? emptyPracticeSettings();
}

export async function savePracticeSettings(settings: PracticeSettings) {
  await db
    .insert(PracticeSettingsTable)
    .values({ id: 1, settings })
    .onConflictDoUpdate({
      target: PracticeSettingsTable.id,
      set: { settings, updatedAt: new Date() },
    });
  return settings;
}

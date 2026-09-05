// One-time migration: rename the `project` field to `subject` on existing
// todos/notes documents, to match the Project -> Subject rename.
// Run once with: node api/scripts/migrateProjectToSubject.js
require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const todosResult = await db
    .collection("todos")
    .updateMany({ project: { $exists: true } }, { $rename: { project: "subject" } });
  const notesResult = await db
    .collection("notes")
    .updateMany({ project: { $exists: true } }, { $rename: { project: "subject" } });

  console.log(`todos updated: ${todosResult.modifiedCount}`);
  console.log(`notes updated: ${notesResult.modifiedCount}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

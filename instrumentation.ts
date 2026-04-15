export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeDatabase } = await import("@/lib/db");

    try {
      await initializeDatabase();
      console.log("✓ Database initialized successfully");
    } catch (error) {
      console.error("✗ Database initialization failed:", error);
    }
  }
}

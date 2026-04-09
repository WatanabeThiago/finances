import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export async function POST() {
  try {
    await initializeDatabase();
    return NextResponse.json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}

import type * as Party from "partykit/server";
import Database from "better-sqlite3";
import { Clerk } from "@clerk/backend";

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

interface StoredFileDataV1 {
  id: string;
  name: string;
  rootMixtureId: string;
  ingredientDb: string;
  accessTime: number;
  version: string;
  // Add other fields from StoredFileDataV1 as needed
}

export default class UserRoom implements Party.Server {
  db: Database.Database;
  userId: string | null = null;

  constructor(public room: Party.Room) {
    this.db = new Database(room.storage.getAlarm() ? undefined : ":memory:");
    this.createSchema();
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const token = new URL(ctx.request.url).searchParams.get("token");
    if (!token) {
      conn.close(1000, "Authentication token missing");
      return;
    }

    try {
      const claims = await clerk.verifyToken(token);
      if (!claims.sub) {
        conn.close(1000, "Invalid token: User ID missing");
        return;
      }

      const roomIdParts = this.room.id.split("-");
      const userIdFromRoom = roomIdParts[1];

      if (claims.sub !== userIdFromRoom) {
        conn.close(1000, "Unauthorized: User ID mismatch");
        return;
      }

      this.userId = claims.sub;
      conn.state = { userId: this.userId };
      console.log(`User ${this.userId} connected to room ${this.room.id}`);

      // Send all existing data to the newly connected client
      this.sendAllData(conn);

    } catch (error) {
      console.error("Authentication error:", error);
      conn.close(1000, "Authentication failed");
      return;
    }
  }

  createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT,
        rootMixtureId TEXT,
        ingredientDb TEXT,
        accessTime INTEGER,
        version TEXT
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stars (
        fileId TEXT PRIMARY KEY,
        starred BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
      );
    `);
  }

  async onMessage(message: string, sender: Party.Connection) {
    const parsedMessage = JSON.parse(message);
    const { type, payload } = parsedMessage;
    const userId = (sender.state as { userId: string })?.userId;

    if (!userId) {
      sender.send(JSON.stringify({ error: "User not authenticated" }));
      return;
    }
    // Ensure operations are for the authenticated user's room.
    // This is already implicitly handled by PartyKit's room isolation,
    // but good to be mindful of if we were to access cross-room data.

    switch (type) {
      case "updateFile":
        this.updateFile(payload);
        break;
      case "deleteFile":
        this.deleteFile(payload.id);
        break;
      case "addStar":
        this.addStar(payload.id);
        break;
      case "deleteStar":
        this.deleteStar(payload.id);
        break;
      case "getAllData": // Client explicitly requests all data
        this.sendAllData(sender);
        return; // Don't broadcast, just send to sender
      default:
        sender.send(JSON.stringify({ error: `Unknown message type: ${type}` }));
        return;
    }

    // After any modification, broadcast updated data to all clients in the room
    this.broadcastAllData();
  }

  updateFile(file: StoredFileDataV1) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO files (id, name, rootMixtureId, ingredientDb, accessTime, version) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      file.id,
      file.name,
      file.rootMixtureId,
      file.ingredientDb,
      file.accessTime,
      file.version
    );
  }

  deleteFile(fileId: string) {
    // Foreign key constraint with ON DELETE CASCADE should handle stars table
    const stmt = this.db.prepare("DELETE FROM files WHERE id = ?");
    stmt.run(fileId);
  }

  addStar(fileId: string) {
    // Ensure file exists before starring
    const fileExists = this.db.prepare("SELECT id FROM files WHERE id = ?").get(fileId);
    if (!fileExists) {
      console.warn(`Attempted to star non-existent file: ${fileId}`);
      // Optionally send an error back to the client
      // this.room.broadcast(JSON.stringify({ error: `File ${fileId} not found for starring.` }));
      return;
    }
    const stmt = this.db.prepare("INSERT OR REPLACE INTO stars (fileId, starred) VALUES (?, TRUE)");
    stmt.run(fileId);
  }

  deleteStar(fileId: string) {
    const stmt = this.db.prepare("DELETE FROM stars WHERE fileId = ?");
    stmt.run(fileId);
  }

  getAllFiles(): StoredFileDataV1[] {
    const stmt = this.db.prepare("SELECT * FROM files");
    return stmt.all() as StoredFileDataV1[];
  }

  getAllStars(): { fileId: string }[] {
    const stmt = this.db.prepare("SELECT fileId FROM stars WHERE starred = TRUE");
    return stmt.all() as { fileId: string }[];
  }

  sendAllData(connection: Party.Connection) {
    const files = this.getAllFiles();
    const stars = this.getAllStars();
    connection.send(JSON.stringify({ type: "allData", files, stars }));
  }

  broadcastAllData() {
    const files = this.getAllFiles();
    const stars = this.getAllStars();
    this.room.broadcast(JSON.stringify({ type: "allData", files, stars }));
  }

  async onClose(conn: Party.Connection) {
    const userId = (conn.state as { userId: string })?.userId;
    if (userId) {
      console.log(`User ${userId} disconnected from room ${this.room.id}`);
    } else {
      console.log(`A connection closed in room ${this.room.id} (user not fully authenticated or state cleared).`);
    }
  }

  async onError(conn: Party.Connection, err: Error) {
    const userId = (conn.state as { userId: string })?.userId;
    console.error(`Error in room ${this.room.id} for user ${userId || 'unknown'}:`, err.message);
    // Depending on the error, you might want to send a message to the client
    // or even close the connection.
    conn.send(JSON.stringify({ error: "An internal server error occurred." }));
  }

  // Optional: Clean up database connection when room is unused
  // async onStop() {
  //   if (this.db) {
  //     this.db.close();
  //   }
  // }
}

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = new Database("findit.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

const adminPassword = bcrypt.hashSync("admin123", 10);

db.prepare(`
  INSERT OR IGNORE INTO users
  (name, email, password, role)
  VALUES (?, ?, ?, ?)
`).run(
  "FindIt Admin",
  "admin@findit.com",
  adminPassword,
  "admin"
);

db.prepare(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    claimant_name TEXT NOT NULL,
    claimant_contact TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id)
  )
`).run();

// Simple AI-style similarity matching
function calculateMatchScore(lostItem, foundItem) {
  let score = 0;

  // Category match
  if (
    lostItem.category.toLowerCase() ===
    foundItem.category.toLowerCase()
  ) {
    score += 30;
  }

  // Location match
  if (
    lostItem.location.toLowerCase() ===
    foundItem.location.toLowerCase()
  ) {
    score += 30;
  }

  // Name similarity
  const lostName = lostItem.name.toLowerCase();
  const foundName = foundItem.name.toLowerCase();

  const nameWords = lostName.split(/\s+/);

  const matchingNameWords = nameWords.filter((word) =>
    foundName.includes(word)
  );

  if (nameWords.length > 0) {
    score +=
      (matchingNameWords.length / nameWords.length) * 20;
  }

  // Description similarity
  const lostDescription =
    lostItem.description.toLowerCase();

  const foundDescription =
    foundItem.description.toLowerCase();

  const descriptionWords =
    lostDescription.split(/\s+/);

  const matchingDescriptionWords =
    descriptionWords.filter((word) =>
      foundDescription.includes(word)
    );

  if (descriptionWords.length > 0) {
    score +=
      (matchingDescriptionWords.length /
        descriptionWords.length) *
      20;
  }

  return Math.round(score);
}

app.get("/", (req, res) => {
  res.json({ message: "FindIt AI backend is running!" });
});
// Test route
app.get("/", (req, res) => {
  res.json({
    message: "FindIt AI backend is running!"
  });
});

// Get all items
app.get("/api/items", (req, res) => {
  const items = db
    .prepare("SELECT * FROM items ORDER BY id DESC")
    .all();

  res.json(items);
});
// Find possible matches for a lost item
app.get("/api/matches/:itemId", (req, res) => {
  const itemId = Number(req.params.itemId);

  const lostItem = db
    .prepare("SELECT * FROM items WHERE id = ? AND type = 'lost'")
    .get(itemId);

  if (!lostItem) {
    return res.status(404).json({
      error: "Lost item not found."
    });
  }

  const foundItems = db
    .prepare("SELECT * FROM items WHERE type = 'found'")
    .all();

  const matches = foundItems
    .map((foundItem) => ({
      ...foundItem,
      matchScore: calculateMatchScore(lostItem, foundItem)
    }))
    .filter((item) => item.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    lostItem,
    matches
  });
});
// Create an item
app.post("/api/items", (req, res) => {
  const {
    type,
    name,
    category,
    description,
    location
  } = req.body;

  if (!type || !name || !category || !description || !location) {
    return res.status(400).json({
      error: "All fields are required."
    });
  }

  const result = db.prepare(`
    INSERT INTO items
    (type, name, category, description, location)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    type,
    name,
    category,
    description,
    location
  );

  const item = db
    .prepare("SELECT * FROM items WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(item);
});

// Submit a claim for a found item
app.post("/api/claims", (req, res) => {
  const {
    item_id,
    claimant_name,
    claimant_contact,
    reason
  } = req.body;

  if (
    !item_id ||
    !claimant_name ||
    !claimant_contact ||
    !reason
  ) {
    return res.status(400).json({
      error: "All claim fields are required."
    });
  }

  const item = db
    .prepare(
      "SELECT * FROM items WHERE id = ? AND type = 'found'"
    )
    .get(item_id);

  if (!item) {
    return res.status(404).json({
      error: "Found item not found."
    });
  }

  const result = db.prepare(`
    INSERT INTO claims
    (item_id, claimant_name, claimant_contact, reason)
    VALUES (?, ?, ?, ?)
  `).run(
    item_id,
    claimant_name,
    claimant_contact,
    reason
  );

  const claim = db
    .prepare("SELECT * FROM claims WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(claim);
});

// Get all claims for admin
app.get("/api/claims", (req, res) => {
  const claims = db.prepare(`
    SELECT
      claims.*,
      items.name AS item_name,
      items.category,
      items.location,
      items.description
    FROM claims
    JOIN items ON claims.item_id = items.id
    ORDER BY claims.id DESC
  `).all();

  res.json(claims);
});

// Get claims for a specific student
app.get("/api/claims/student/:name", (req, res) => {
  const studentName = req.params.name;

  const claims = db.prepare(`
    SELECT
      claims.*,
      items.name AS item_name,
      items.category,
      items.location,
      items.description
    FROM claims
    JOIN items ON claims.item_id = items.id
    WHERE LOWER(claims.claimant_name) = LOWER(?)
    ORDER BY claims.id DESC
  `).all(studentName);

  res.json(claims);
});

// Approve or reject a claim
app.patch("/api/claims/:id", (req, res) => {
  const claimId = Number(req.params.id);
  const { status } = req.body;

  if (!["approved", "rejected" , "returned"].includes(status)) {
    return res.status(400).json({
      error: "Status must be approved or rejected."
    });
  }

  const claim = db
    .prepare("SELECT * FROM claims WHERE id = ?")
    .get(claimId);

  if (!claim) {
    return res.status(404).json({
      error: "Claim not found."
    });
  }

  db.prepare(`
    UPDATE claims
    SET status = ?
    WHERE id = ?
  `).run(status, claimId);

  const updatedClaim = db
    .prepare("SELECT * FROM claims WHERE id = ?")
    .get(claimId);

  res.json(updatedClaim);
});

// Register a new user
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Name, email and password are required."
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO users
      (name, email, password)
      VALUES (?, ?, ?)
    `).run(name, email, hashedPassword);

    const user = db
      .prepare(`
        SELECT id, name, email, role
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    console.error("Registration error:", error);

    res.status(500).json({
      error: "Could not create account."
    });
  }
});

// Login user
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required."
    });
  }

  const user = db
    .prepare(`
      SELECT id, name, email, password, role
      FROM users
      WHERE email = ?
    `)
    .get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      error: "Invalid email or password."
    });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
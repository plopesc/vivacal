#!/usr/bin/env node
/**
 * Viding Valladolid schedule scraper.
 *
 * Fetches weekly list-view HTML from valladolid-viding.viding.es, parses each
 * activity into the shared Activity schema, writes one JSON file per week to
 * public/data/activities-YYYY-MM-DD.json, prunes files older than the previous
 * two weeks, and regenerates public/data/manifest.json.
 *
 * Usage: node scripts/scrape.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

import {
  ACTIVITY_CATEGORY_MAP,
  getCategoryForActivity,
  normalizeActivityName,
} from "./lib/categories.mjs";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const BASE_URL =
  "https://valladolid-viding.viding.es/ActividadesColectivas/ActividadesColectivasHorarioSemanal";
const USER_AGENT = "Mozilla/5.0";
const MAX_WEEKS = 4;
const FETCH_DELAY_MS = 500;
const RETENTION_DAYS = 14;
const EMPTY_MARKER = "No se han encontrado clases colectivas disponibles";

const SPANISH_DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

// ---------- date helpers ----------
function getCurrentMonday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildUrl(mondayDate) {
  const mm = String(mondayDate.getMonth() + 1).padStart(2, "0");
  const dd = String(mondayDate.getDate()).padStart(2, "0");
  const yyyy = mondayDate.getFullYear();
  const fecha = encodeURIComponent(`${mm}/${dd}/${yyyy} 00:00:00`);
  return `${BASE_URL}?integration=False&fecha=${fecha}&publico=True&cambiovista=lista`;
}

function activityId(a) {
  return crypto
    .createHash("sha1")
    .update(`${a.name}|${a.date}|${a.startTime}|${a.room}|${a.instructor}`)
    .digest("hex")
    .slice(0, 12);
}

// ---------- parsing ----------
/**
 * Parse a week of list-view HTML. Each activity is encoded as a button with
 * class `botonClaseColectiva` carrying a `data-json` attribute that contains
 * the fully-structured activity payload from the site's backend. That payload
 * is the authoritative source for every field we need, so there is no fragile
 * text scraping beyond locating the buttons.
 */
function parseWeekHtml(html, weekStartDate) {
  if (html.includes(EMPTY_MARKER)) {
    return { empty: true, activities: [] };
  }
  const $ = cheerio.load(html);
  const buttons = $(".botonClaseColectiva");
  const activities = [];
  const unknownNames = new Set();

  buttons.each((_i, el) => {
    const raw = $(el).attr("data-json");
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.warn(`Skipping activity with unparseable data-json: ${err.message}`);
      return;
    }

    const rawName = String(payload.Nombre ?? "").trim();
    if (!rawName) return;

    // Difficulty is the count of trailing asterisks (0-3) before stripping.
    const starMatch = rawName.match(/\*+$/);
    const stars = starMatch ? starMatch[0].length : 0;
    const difficulty = Math.max(0, Math.min(3, stars));
    const name = rawName.replace(/\*+$/, "").trim();

    // HoraInicio / HoraFin arrive as local wall-clock strings without offset,
    // e.g. "2026-04-13T06:35:00". Treat them as naive local times.
    const start = parseNaiveDate(payload.HoraInicio);
    const end = parseNaiveDate(payload.HoraFin);
    if (!start || !end) return;

    const date = toYMD(start);
    const dayOfWeek = SPANISH_DAYS[start.getDay()];
    const startTime = toHM(start);
    const endTime = toHM(end);
    const duration = Math.max(0, Math.round((end - start) / 60000));

    const instructor = String(payload.NombreTrabajador ?? "").trim();
    const room = String(payload.nombreZona ?? "").trim();
    const max = Number(payload.Capacidad ?? 0) || 0;
    const current = Number(payload.ReservasHechas ?? 0) || 0;

    const normalized = normalizeActivityName(name);
    const category = getCategoryForActivity(name);
    if (category === "otros" && !(normalized in ACTIVITY_CATEGORY_MAP)) {
      unknownNames.add(name);
    }

    const activity = {
      id: "",
      name,
      category,
      date,
      dayOfWeek,
      startTime,
      endTime,
      duration,
      instructor,
      room,
      capacity: { current, max },
      difficulty,
    };
    activity.id = activityId(activity);
    activities.push(activity);
  });

  for (const n of unknownNames) {
    console.warn(`[warn] unknown activity name mapped to 'otros': ${n}`);
  }

  // Keep stable order: by date then startTime.
  activities.sort((a, b) =>
    a.date === b.date
      ? a.startTime.localeCompare(b.startTime)
      : a.date.localeCompare(b.date),
  );

  return { empty: false, activities };
}

function parseNaiveDate(s) {
  if (!s) return null;
  const m = String(s).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] ?? 0),
  );
}

function toHM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---------- IO ----------
function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function pruneOldWeekFiles(currentMonday) {
  const cutoff = toYMD(addDays(currentMonday, -RETENTION_DAYS));
  if (!fs.existsSync(DATA_DIR)) return;
  const existing = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("activities-") && f.endsWith(".json"));
  for (const f of existing) {
    const m = f.match(/^activities-(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    if (m[1] < cutoff) {
      fs.unlinkSync(path.join(DATA_DIR, f));
      console.log(`Pruned stale week file: ${f}`);
    }
  }
}

function writeWeekFile(weekStart, activities) {
  const filename = path.join(DATA_DIR, `activities-${toYMD(weekStart)}.json`);
  const body = { weekStart: toYMD(weekStart), activities };
  fs.writeFileSync(filename, JSON.stringify(body, null, 2));
  return filename;
}

function writeManifest() {
  const weeks = fs
    .readdirSync(DATA_DIR)
    .map((f) => {
      const m = f.match(/^activities-(\d{4}-\d{2}-\d{2})\.json$/);
      return m ? m[1] : null;
    })
    .filter(Boolean)
    .sort();
  const manifest = {
    lastUpdated: new Date().toISOString(),
    earliestWeek: weeks[0] ?? null,
    latestWeek: weeks[weeks.length - 1] ?? null,
    weeks,
  };
  fs.writeFileSync(
    path.join(DATA_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  return manifest;
}

async function fetchWeekHtml(weekStart) {
  const url = buildUrl(weekStart);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(
      `Fetch failed for week ${toYMD(weekStart)}: HTTP ${res.status}`,
    );
  }
  return await res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- main ----------
async function main() {
  ensureDataDir();
  const currentMonday = getCurrentMonday();
  console.log(`Current Monday: ${toYMD(currentMonday)}`);

  pruneOldWeekFiles(currentMonday);

  let totalActivities = 0;
  let weeksWritten = 0;
  for (let i = 0; i < MAX_WEEKS; i++) {
    const weekStart = addDays(currentMonday, i * 7);
    const label = toYMD(weekStart);
    if (i > 0) await sleep(FETCH_DELAY_MS);
    console.log(`\nFetching week ${label}...`);
    const html = await fetchWeekHtml(weekStart);
    const parsed = parseWeekHtml(html, weekStart);
    if (parsed.empty) {
      console.log(`Week ${label} returned the empty marker. Stopping.`);
      break;
    }
    if (i === 0 && parsed.activities.length === 0) {
      console.error(
        "FATAL: current week returned 0 activities - parser likely broken or site changed.",
      );
      process.exit(1);
    }
    if (parsed.activities.length === 0) {
      console.log(`Week ${label} has no activities. Stopping.`);
      break;
    }
    const file = writeWeekFile(weekStart, parsed.activities);
    console.log(
      `Wrote ${parsed.activities.length} activities -> ${path.relative(process.cwd(), file)}`,
    );
    totalActivities += parsed.activities.length;
    weeksWritten += 1;
  }

  const manifest = writeManifest();
  console.log(
    `\nManifest written: ${manifest.weeks.length} week(s) retained, earliest=${manifest.earliestWeek}, latest=${manifest.latestWeek}`,
  );
  console.log(
    `Done. Fetched ${weeksWritten} week(s), ${totalActivities} activities total.`,
  );
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});

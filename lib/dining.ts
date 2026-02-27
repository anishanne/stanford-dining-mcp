import * as cheerio from "cheerio";

const BASE_URL = "https://rdeapps.stanford.edu/dininghallmenu/Menu.aspx";

export interface MenuItem {
  name: string;
  glutenFree: boolean;
  vegetarian: boolean;
  vegan: boolean;
  kosher: boolean;
  halal: boolean;
}

export interface DiningOptions {
  locations: { value: string; label: string }[];
  dates: { value: string; label: string }[];
  mealTypes: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PageTokens {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
  cookie: string;
}

async function getPageTokens(): Promise<PageTokens> {
  const res = await fetch(BASE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch dining page: ${res.status}`);

  // Preserve session cookie for the subsequent POST
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c: string) => c.split(";")[0])
    .join("; ");

  const html = await res.text();
  const $ = cheerio.load(html);

  return {
    viewState: ($('input[name="__VIEWSTATE"]').val() as string) ?? "",
    viewStateGenerator:
      ($('input[name="__VIEWSTATEGENERATOR"]').val() as string) ?? "",
    eventValidation:
      ($('input[name="__EVENTVALIDATION"]').val() as string) ?? "",
    cookie,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getDiningOptions(): Promise<DiningOptions> {
  const tokens = await getPageTokens();
  // Re-use the same fetch to extract options (they're on the initial GET)
  const res = await fetch(BASE_URL, {
    cache: "no-store",
    headers: { Cookie: tokens.cookie },
  });
  if (!res.ok) throw new Error(`Failed to fetch dining page: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const locations: { value: string; label: string }[] = [];
  $("#MainContent_lstLocations option").each((_, el) => {
    const value = $(el).val() as string;
    const label = $(el).text().trim();
    if (value) locations.push({ value, label });
  });

  const dates: { value: string; label: string }[] = [];
  $("#MainContent_lstDay option").each((_, el) => {
    const value = $(el).val() as string;
    const label = $(el).text().trim();
    if (value) dates.push({ value, label });
  });

  return {
    locations,
    dates,
    mealTypes: ["Breakfast", "Lunch", "Dinner", "Brunch"],
  };
}

export async function getDiningMenu(
  location: string,
  date: string,
  mealType: string
): Promise<MenuItem[]> {
  const tokens = await getPageTokens();

  // ASP.NET requires ctl00$MainContent$ prefix for the control names
  const form = new URLSearchParams({
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE: tokens.viewState,
    __VIEWSTATEGENERATOR: tokens.viewStateGenerator,
    __EVENTVALIDATION: tokens.eventValidation,
    "ctl00$MainContent$lstLocations": location,
    "ctl00$MainContent$lstDay": date,
    "ctl00$MainContent$lstMealType": mealType,
    "ctl00$MainContent$btnRefresh": "Refresh",
  });

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: tokens.cookie,
    },
    body: form.toString(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`POST failed: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const items: MenuItem[] = [];

  $("li.clsMenuItem").each((_, li) => {
    const $li = $(li);
    const name = $li.find(".clsLabel_Name").text().trim();
    if (!name) return;

    const cls = $li.attr("class") ?? "";
    items.push({
      name,
      glutenFree: cls.includes("clsGF_Row"),
      vegan: cls.includes("clsVGN_Row"),
      vegetarian: cls.includes("clsV_Row"),
      halal: cls.includes("clsHALAL_Row"),
      kosher: cls.includes("clsKOSHER_Row"),
    });
  });

  return items;
}

export function formatMenu(
  location: string,
  date: string,
  mealType: string,
  items: MenuItem[]
): string {
  if (items.length === 0) {
    return (
      `No menu found for **${location}** on ${date} (${mealType}).\n` +
      "The dining hall may be closed or this meal may not be served."
    );
  }

  const lines: string[] = [`## ${location}`, `**${mealType}** — ${date}\n`];

  for (const item of items) {
    const badges: string[] = [];
    if (item.vegan) badges.push("Vegan");
    else if (item.vegetarian) badges.push("V");
    if (item.glutenFree) badges.push("GF");
    if (item.kosher) badges.push("Kosher");
    if (item.halal) badges.push("Halal");

    const badgeStr = badges.length ? ` [${badges.join(", ")}]` : "";
    lines.push(`- ${item.name}${badgeStr}`);
  }

  return lines.join("\n");
}

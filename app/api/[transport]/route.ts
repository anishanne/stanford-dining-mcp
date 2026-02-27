import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getDiningOptions, getDiningMenu, formatMenu } from "@/lib/dining";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_dining_options",
      {
        title: "Get Dining Options",
        description:
          "Get available Stanford dining halls, upcoming dates, and meal types.",
        inputSchema: {},
      },
      async () => {
        const opts = await getDiningOptions();

        const lines = [
          "## Stanford Dining Options\n",
          "### Dining Halls",
          ...opts.locations.map(
            (l) => `- **${l.label}** (value: \`${l.value}\`)`
          ),
          "",
          "### Available Dates",
          ...opts.dates.map((d) => `- ${d.label} (value: \`${d.value}\`)`),
          "",
          "### Meal Types",
          ...opts.mealTypes.map((m) => `- ${m}`),
          "",
          "Use `get_dining_menu` with the **value** strings above.",
        ];

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      }
    );

    server.registerTool(
      "get_dining_menu",
      {
        title: "Get Dining Menu",
        description:
          "Get the menu for a Stanford dining hall on a specific date and meal. " +
          "Call get_dining_options first to see valid location values and available dates.",
        inputSchema: {
          location: z
            .string()
            .describe(
              "Dining hall value from get_dining_options, e.g. 'Arrillaga' or 'FlorenceMoore'"
            ),
          date: z
            .string()
            .describe("Date in M/D/YYYY format, e.g. '2/26/2026'"),
          meal_type: z
            .enum(["Breakfast", "Lunch", "Dinner", "Brunch"])
            .describe("Meal type"),
        },
      },
      async ({ location, date, meal_type }) => {
        const items = await getDiningMenu(location, date, meal_type);
        const text = formatMenu(location, date, meal_type, items);
        return { content: [{ type: "text" as const, text }] };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST };

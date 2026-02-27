export default function Home() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Stanford Dining MCP Server</h1>
      <p>
        MCP endpoint: <code>/api/mcp</code>
      </p>
      <h2>Tools</h2>
      <ul>
        <li>
          <code>get_dining_options</code> — list dining halls, dates, and meal
          types
        </li>
        <li>
          <code>get_dining_menu</code> — fetch the menu for a hall / date / meal
        </li>
      </ul>
    </main>
  );
}

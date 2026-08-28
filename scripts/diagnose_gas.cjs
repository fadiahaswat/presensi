async function diagnose() {
  const url = "https://script.google.com/macros/s/AKfycbynVevPWfXU1u6ylxyM6Fn8-NRqBsnz2N4LJHrv6FNru5zqD0DrmH5Slw-_cZ1aJO3nOw/exec";
  
  console.log("=== DIAGNOSTIC TESTS ===");

  // 1. GET actions
  const getActions = ["ping", "get_all", "get_delta", "get_table", "sync", "read", "health"];
  for (const act of getActions) {
    try {
      const res = await fetch(`${url}?action=${act}`);
      const json = await res.json();
      console.log(`GET ?action=${act}:`, json);
    } catch (e) {
      console.log(`GET ?action=${act} ERROR:`, e.message);
    }
  }

  // 2. POST actions variations
  // Let's test different body payload formats
  const variations = [
    { action: "ping" },
    { action: "multi_table_upsert", tables: {} },
    { action: "batch_upsert", table: "Logbook", records: [] },
    { type: "ping" },
    { type: "sync" },
    { action: "sync", data: {} },
    { action: "save", data: {} },
    { action: "upsert", table: "Logbook", records: [] },
    { action: "insert", table: "Logbook", data: [] }
  ];

  for (const v of variations) {
    try {
      // POST with JSON string
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(v)
      });
      const json = await res.json();
      console.log(`POST ${JSON.stringify(v)}:`, json);
    } catch (e) {
      console.log(`POST ${JSON.stringify(v)} ERROR:`, e.message);
    }
  }

  // 3. POST with URL parameter ?action=...
  for (const act of ["multi_table_upsert", "batch_upsert", "sync", "save"]) {
    try {
      const res = await fetch(`${url}?action=${act}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ records: [] })
      });
      const json = await res.json();
      console.log(`POST ?action=${act} body={records:[]}:`, json);
    } catch (e) {
      console.log(`POST ?action=${act} ERROR:`, e.message);
    }
  }
}

diagnose();

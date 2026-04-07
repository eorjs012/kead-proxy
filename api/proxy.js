export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch("http://121.161.240.244:58081/api/v1/screen/stream-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.authorization || ""
      },
      body: JSON.stringify(req.body)
    });

    res.writeHead(response.status, {
      "Content-Type": "text/event-stream",
      "Access-Control-Allow-Origin": "*"
    });

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

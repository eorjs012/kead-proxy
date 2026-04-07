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

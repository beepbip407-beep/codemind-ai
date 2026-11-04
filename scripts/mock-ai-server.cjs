/**
 * Servidor mock compatible con OpenAI para verificar CodeMind AI end-to-end
 * durante el desarrollo (no forma parte de la app en producción).
 */
const http = require("http");

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        data: [
          { id: "mock-gpt-mini" },
          { id: "mock-gpt-large" },
          { id: "mock-coder" },
        ],
      })
    );
    return;
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      const sys = (parsed.messages || []).find((m) => m.role === "system");
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      const parts = ["Hola", " — ", "respuesta", " de", " prueba", " ```python\nprint('ok')\n```"];
      let i = 0;
      const timer = setInterval(() => {
        if (i >= parts.length) {
          res.write("data: [DONE]\n\n");
          res.end();
          clearInterval(timer);
          return;
        }
        res.write(
          `data: ${JSON.stringify({
            choices: [{ delta: { content: parts[i] } }],
          })}\n\n`
        );
        i++;
      }, 60);
      res.on("close", () => clearInterval(timer));
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(3099, () => console.log("mock listo en 3099"));

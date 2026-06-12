import { createCompleteSeriesServer } from "./server/cpanel-server.mjs";

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

const server = createCompleteSeriesServer();

server.on("error", (error) => {
  console.error("Complete Series failed to start.", error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Complete Series is listening on ${host}:${port}`);
});

import pino from "pino";
import { Writable } from "stream";
import { loggerOptions } from "../src/utils/logger";

// Logger avec la configuration de l'application, qui écrit dans un tableau au lieu de la sortie standard.
const capture = () => {
  const lines: any[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  return { lines, log: pino({ ...loggerOptions, level: "info" }, stream) };
};

describe("Logger", () => {
  it("masque les secrets dans les en-têtes et les objets journalisés", () => {
    const { lines, log } = capture();

    log.info(
      {
        req: { headers: { authorization: "Bearer abc", "x-app-secret": "s3cret" } },
        body: { password: "Password1!", refreshToken: "rt", email: "user@test.com" },
      },
      "request"
    );

    expect(lines[0].req.headers).toEqual({
      authorization: "[redacted]",
      "x-app-secret": "[redacted]",
    });
    expect(lines[0].body).toEqual({
      password: "[redacted]",
      refreshToken: "[redacted]",
      email: "user@test.com",
    });
  });

  it("est silencieux pendant les tests", () => {
    expect(loggerOptions.level).toBe("silent");
  });
});

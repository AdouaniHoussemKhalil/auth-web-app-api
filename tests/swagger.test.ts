import { specs } from "../src/app/swagger/swagger";

describe("Documentation Swagger", () => {
  it("documente les routes des trois domaines", () => {
    const paths = Object.keys(specs.paths);

    expect(paths.filter((path) => path.startsWith("/consumers/"))).toHaveLength(16);
    expect(paths.filter((path) => path.startsWith("/tenants/"))).toHaveLength(11);
    expect(paths.filter((path) => path.startsWith("/config/"))).toHaveLength(5);
  });
});

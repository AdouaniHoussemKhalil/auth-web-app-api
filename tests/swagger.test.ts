import { specs } from "../src/app/swagger/swagger";

describe("Documentation Swagger", () => {
  it("documente les routes des trois domaines", () => {
    const paths = Object.keys(specs.paths);

    expect(paths.filter((path) => path.startsWith("/consumers/"))).toHaveLength(17);
    expect(paths.filter((path) => path.startsWith("/tenants/"))).toHaveLength(14);
    expect(paths.filter((path) => path.startsWith("/config/"))).toHaveLength(6);
  });

  it("documente les suppressions de compte", () => {
    const paths = specs.paths as Record<string, Record<string, unknown>>;

    expect(paths["/consumers/auth/me/{id}"]).toHaveProperty("delete");
    expect(paths["/tenants/{tenantId}"]).toHaveProperty("delete");
    expect(paths["/tenants/{tenantId}"]).toHaveProperty("put");
    expect(paths["/tenants/{tenantId}/app/{appId}/consumers/{consumerId}"]).toHaveProperty(
      "delete"
    );
    expect(paths["/tenants/{tenantId}/app/{appId}/consumers/{consumerId}"]).toHaveProperty("patch");
  });
});

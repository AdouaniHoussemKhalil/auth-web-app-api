import { IConsumer } from "../../models/Consumer";
import { ITenant } from "../../models/Tenant";

// Contenu public des JWT, reconstruit depuis la base à chaque émission.
export const consumerTokenPayload = (user: IConsumer) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  scopes: user.scopes,
});

export const tenantTokenPayload = (tenant: ITenant) => ({
  tenantId: tenant.id,
  firstName: tenant.firstName,
  lastName: tenant.lastName,
  email: tenant.email,
  role: tenant.role,
  scopes: tenant.scopes,
});

import { Router } from "express";
import { tenantProtectedActionsAuthToken } from "../../middleware/security/tenantProtectedActionsAuthToken";
import { asyncHandler } from ".";
import getConsumersQuery from "../../queries/tenants/getConsumersQuery";
import getConsumerByIdQuery from "../../queries/tenants/getConsumerByIdQuery";
import { registerSchema } from "../../validation/users/registerSchema";
import registerHandler from "../../handlers/tenants/registerHandler";
import validate from "../../middleware/validation/validateSchema";
import { loginByCodeMFASchema } from "../../validation/users/loginByCodeMFASchema";
import loginHandler from "../../handlers/tenants/loginHandler";
import { googleRegister } from "../../handlers/tenants/googleRegisterHandler";
import { googleLoginSchema } from "../../validation/users/googleLoginSchema";



const tenantsRoutes = Router();


tenantsRoutes.get(
  "/tenants/list-consumers",
  tenantProtectedActionsAuthToken,
  asyncHandler(getConsumersQuery)
);

tenantsRoutes.get(
  "/tenants/list-consumers/:id",
  tenantProtectedActionsAuthToken,
  asyncHandler(getConsumerByIdQuery)
);

tenantsRoutes.post(
    "/tenants/register",
    validate(registerSchema),
    asyncHandler(registerHandler)
);

tenantsRoutes.post(
    "/tenants/login",
    validate(loginByCodeMFASchema),
    asyncHandler(loginHandler)
);


tenantsRoutes.post(
  "/tenants/google-register",
  validate(googleLoginSchema),
  asyncHandler(googleRegister)
)

export default tenantsRoutes;

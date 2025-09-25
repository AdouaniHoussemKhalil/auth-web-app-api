import { pick } from "lodash"

export const getUserData = (fullUser: any) => {
    return pick(fullUser, [
        "firstName",
        "lastName",
        "email",
        "role",
        "_id",
    ]);
};
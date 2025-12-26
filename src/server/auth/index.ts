import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { env } from "../config/env"

export const authConfig: StartAuthJSConfig = {
    secret: env.AUTH_SECRET,
    providers: [
        github({
            clientId: env.GITHUB_CLIENT_ID!,
            clientSecret: env.GITHUB_CLIENT_SECRET!,
            authorization: { params: { scope: "read:user user:email" } }
        })
    ],
    debug: true,
    basePath: new URL(env.AUTH_URL!).pathname
};
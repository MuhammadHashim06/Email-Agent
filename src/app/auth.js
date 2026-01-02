import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { connectToDatabase, User } from './lib/db.mjs';

async function refreshAccessToken(token) {
    try {
        if (!token.refreshToken) {
            console.error("No refresh token available. User must sign in again.");
            return {
                ...token,
                error: "MissingRefreshTokenError",
            };
        }

        const url = "https://oauth2.googleapis.com/token";

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID,
                client_secret: process.env.AUTH_GOOGLE_SECRET,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        })

        const refreshedTokens = await response.json()

        if (!response.ok) {
            console.error("Google Token Refresh Error Details:", refreshedTokens);
            throw refreshedTokens
        }

        console.log("Successfully refreshed access token");

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        }
    } catch (error) {
        console.error("Error refreshing access token:", error)

        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

async function saveTokenToDb(email, tokenData) {
    if (!email) return;
    try {
        await connectToDatabase();
        await User.findOneAndUpdate(
            { email },
            {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                accessTokenExpires: tokenData.accessTokenExpires,
                lastSeen: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`[DB] Saved token for ${email}`);
    } catch (error) {
        console.error("[DB] Failed to save token:", error);
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            authorization: {
                params: {
                    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.modify openid profile",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                console.log("Initial sign-in: Refresh token present?", !!account.refresh_token);
                const newToken = {
                    accessToken: account.access_token,
                    accessTokenExpires: Date.now() + account.expires_in * 1000,
                    refreshToken: account.refresh_token,
                    user,
                };
                await saveTokenToDb(user.email, newToken);
                return newToken;
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < token.accessTokenExpires) {
                return token
            }

            // Access token has expired, try to update it
            const refreshed = await refreshAccessToken(token);
            if (token.user?.email) {
                await saveTokenToDb(token.user.email, refreshed);
            }
            return refreshed;
        },
        async session({ session, token }) {
            session.user = token.user
            session.accessToken = token.accessToken
            session.error = token.error

            return session
        },
    },
})

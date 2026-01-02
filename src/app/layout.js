
import { Geist, Geist_Mono } from "next/font/google"; // Adjust if fonts are different or keep existing
import "./globals.css";

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export const metadata = {
    title: "Gmail Clone",
    description: "A Gmail clone built with Next.js and Google OAuth",
};

export default function RootLayout({
    children,
}) {
    return (
        <html lang="en">
            <body
                className={`${geist.variable} ${geistMono.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}

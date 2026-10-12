import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Professional Toolkit · Your next step",description:"Import public pages, review professional content and plan your next move with transparent tools."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

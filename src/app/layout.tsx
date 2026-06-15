import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Kickoff Tournament Manager",
  description: "Create and manage your own sports leagues, fixtures, and standings.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

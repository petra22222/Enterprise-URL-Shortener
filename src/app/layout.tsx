// FILE: src/app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Enterprise URL Shortener",
  description: "Enterprise-Grade Link Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
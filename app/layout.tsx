import "./globals.css";
export const metadata = {
  title: "Orbit — Your project command center",
  description: "A little clarity. A lot of progress.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

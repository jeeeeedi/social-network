import type { Metadata } from "next";
import "./index.css";

export const metadata: Metadata = {
  title: "Social Network",
  description: "Connect with friends and share your thoughts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Quiz Live — Live Quiz Arena",
  description: "Quiz trực tiếp phong cách Kahoot, dùng điện thoại để trả lời và bảng xếp hạng realtime."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}

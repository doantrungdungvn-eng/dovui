import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Đố Vui Online Free",
  description: "Đố Vui Online Free — chơi đố vui trực tiếp, trả lời bằng điện thoại và xem bảng xếp hạng."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}

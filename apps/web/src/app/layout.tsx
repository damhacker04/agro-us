import type { Metadata } from "next";
import { Fredoka, Poppins } from "next/font/google";
import "./global.css";

// Konfigurasi Font Fredoka untuk Judul
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
});

// Konfigurasi Font Poppins untuk Teks Utama
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "AgroUs | B2B Logistics SaaS",
  description: "Platform rantai pasok agrikultur B2B dengan Verified Timeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Memasukkan variabel font ke tag body agar bisa dipanggil oleh Tailwind */}
      <body className={`${poppins.variable} ${fredoka.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
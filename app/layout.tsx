import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ToastProvider from '@/components/providers/ToastProvider'; 
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "The IDEA IQ",
  description: "Innovation for Every Aspect of Life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Toastprovider />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}

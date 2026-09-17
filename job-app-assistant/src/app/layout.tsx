import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Job App Assistant',
  description: 'Tailor your resume to any job description',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b bg-white px-6 py-4 flex gap-6">
          <Link href="/" className="font-semibold">
            Job App Assistant
          </Link>
          <Link href="/profile" className="text-gray-600 hover:text-gray-900">
            Profile
          </Link>
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

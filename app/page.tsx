import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
};
import { FaUserShield, FaQrcode, FaUtensils, FaChartBar } from 'react-icons/fa';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold mb-12 text-slate-800 text-center">
        Event QR Verification System
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">

        {/* Admin Dashboard */}
        <Link href="/admin/events"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-blue-500 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-full transition-all duration-500 opacity-5"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <FaUserShield size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
            <p className="text-gray-500 text-center mt-2">
              Create Events, Upload participants, and Send invitations.
            </p>
          </div>
        </Link>

        {/* Coordinator Scanner */}
        <Link href="/coordinator"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-green-500 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500 group-hover:w-full transition-all duration-500 opacity-5"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-green-100 text-green-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <FaQrcode size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Event Entry Scanner</h2>
            <p className="text-gray-500 text-center mt-2">
              Scan QR codes at execution entry gates to verify guests.
            </p>
          </div>
        </Link>

        {/* Food Token Scanner */}
        <Link href="/food-scanner"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-orange-500 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 group-hover:w-full transition-all duration-500 opacity-5"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-orange-100 text-orange-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <FaUtensils size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Food Token Scanner</h2>
            <p className="text-gray-500 text-center mt-2">
              Scan Meal Coupons (Breakfast, Lunch, etc).
            </p>
          </div>
        </Link>

        {/* Warden Dashboard */}
        <Link href="/warden/dashboard"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 hover:border-purple-500 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:w-full transition-all duration-500 opacity-5"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-purple-100 text-purple-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <FaChartBar size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Warden Dashboard</h2>
            <p className="text-gray-500 text-center mt-2">
              Live Counters for Veg/Non-Veg.
            </p>
          </div>
        </Link>

      </div>
    </main>
  );
}

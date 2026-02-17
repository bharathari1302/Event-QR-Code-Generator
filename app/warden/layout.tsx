import { Sidebar } from '@/app/components/ui/Sidebar';
import { Navbar } from '@/app/components/ui/Navbar';

export default function WardenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
            {/* Sidebar - Fixed width */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 md:ml-64">
                {/* Navbar - Fixed height */}
                <Navbar />

                {/* Page Content - Scrollable */}
                <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
                    <div className="max-w-7xl mx-auto w-full space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

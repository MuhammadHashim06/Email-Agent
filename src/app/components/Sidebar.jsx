
import { Inbox, Send, File, Plus, LogOut, LayoutDashboard } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function Sidebar({ setComposeOpen, currentLabel = 'inbox' }) {
    const navItems = [
        { label: 'Inbox', id: 'inbox', icon: Inbox },
        { label: 'Sent', id: 'sent', icon: Send },
        { label: 'Drafts', id: 'drafts', icon: File },
        { label: 'Stats', id: 'stats', icon: LayoutDashboard },
    ];

    return (
        <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 p-4 flex flex-col justify-between">
            <div>
                <div className="mb-6">
                    <Link href="/" className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        Replio
                    </Link>
                </div>

                <button
                    onClick={() => setComposeOpen(true)}
                    className="mb-6 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition shadow-md font-medium w-fit"
                >
                    <Plus size={20} />
                    Compose
                </button>

                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentLabel === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={`/?label=${item.id}`}
                                className={`flex items-center gap-3 px-4 py-2 rounded-r-full font-medium transition ${isActive
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <button
                onClick={() => signOut()}
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition mt-auto"
            >
                <LogOut size={18} />
                Sign out
            </button>
        </div>
    );
}

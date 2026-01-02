// "use client";

// import { useState, useEffect } from "react";
// import Sidebar from "./Sidebar";
// import EmailList from "./EmailList";
// import ComposeModal from "./ComposeModal";
// import EmailDetailModal from "./EmailDetailModal";
// import Link from "next/link";
// import { ChevronRight, ChevronLeft, Bell, X } from "lucide-react";
// import { useRouter } from "next/navigation";

// export default function Dashboard({
//     initialEmails,
//     userToken,
//     nextPageToken,
//     currentPage = 1,
//     totalMessages = 0,
//     currentLabel = 'inbox'
// }) {
//     const [isComposeOpen, setComposeOpen] = useState(false);
//     const [selectedEmail, setSelectedEmail] = useState(null);
//     const [notifications, setNotifications] = useState([]);
//     const [isNotificationsOpen, setNotificationsOpen] = useState(false);
//     const [composeData, setComposeData] = useState(null);
//     const router = useRouter();

//     const addNotification = (message, type = 'info') => {
//         const id = Date.now();
//         setNotifications(prev => [{ id, message, type, time: new Date() }, ...prev]);

//         // Auto-hide notification after 5 seconds if desired, or keep in list
//     };

//     const handleSendEmail = async (to, subject, body, options = {}) => {
//         try {
//             const res = await fetch('/api/send', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ to, subject, body, ...options })
//             });

//             if (res.ok) {
//                 addNotification(`Email sent to ${to}`, 'success');
//             } else {
//                 addNotification(`Failed to send email to ${to}`, 'error');
//             }
//         } catch (error) {
//             addNotification(`Error sending email: ${error.message}`, 'error');
//         }
//     };

//     const handleReply = (data) => {
//         setComposeData(data);
//         setSelectedEmail(null);
//         setComposeOpen(true);
//     };

//     const openCompose = () => {
//         setComposeData(null);
//         setComposeOpen(true);
//     };


//     // Polling for new emails (every 15 seconds)
//     useEffect(() => {
//         // Request notification permission
//         if ("Notification" in window && Notification.permission === "default") {
//             Notification.requestPermission();
//         }

//         const checkNewEmails = async () => {
//             try {
//                 const res = await fetch('/api/notifications/check');
//                 if (res.ok) {
//                     const data = await res.json();
//                     if (data.newCount > 0) {
//                         data.alerts.forEach(alert => {
//                             addNotification(`New Email: ${alert.subject}`, 'unread');

//                             // Show native browser notification
//                             if ("Notification" in window && Notification.permission === "granted") {
//                                 new Notification(`New Email from ${alert.from}`, {
//                                     body: alert.subject,
//                                     icon: '/favicon.ico' // Or any app icon
//                                 });
//                             }
//                         });
//                         // Optional: Refresh the email list if we're in the inbox
//                         if (currentLabel === 'inbox' && !selectedEmail) {
//                             router.refresh();
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error("Failed to check for new emails:", error);
//             }
//         };

//         const interval = setInterval(checkNewEmails, 15000);
//         checkNewEmails(); // Check immediately on mount
//         return () => clearInterval(interval);
//     }, [currentLabel, selectedEmail, router]);

//     // Pagination logic
//     const itemsPerPage = 15;
//     const startCount = (currentPage - 1) * itemsPerPage + 1;
//     const endCount = Math.min(startCount + (initialEmails?.length || 0) - 1, totalMessages || 0);

//     return (
//         <div className="flex h-screen bg-white">
//             <Sidebar setComposeOpen={openCompose} currentLabel={currentLabel} />
//             <main className="flex-1 flex flex-col min-w-0">
//                 <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
//                     <div className="flex-1 max-w-xl">
//                         <input type="text" placeholder="Search mail" className="bg-gray-100 px-4 py-2 rounded-lg w-full outline-none focus:bg-white focus:shadow-md transition" />
//                     </div>

//                     <div className="flex items-center gap-4">
//                         <div className="relative">
//                             <button
//                                 onClick={() => setNotificationsOpen(!isNotificationsOpen)}
//                                 className="p-2 hover:bg-gray-100 rounded-full transition relative"
//                             >
//                                 <Bell size={20} className="text-gray-600" />
//                                 {notifications.length > 0 && (
//                                     <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
//                                         {notifications.length}
//                                     </span>
//                                 )}
//                             </button>

//                             {isNotificationsOpen && (
//                                 <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
//                                     <div className="p-4 border-b border-gray-100 flex justify-between items-center">
//                                         <h3 className="font-semibold text-gray-800">Notifications</h3>
//                                         <button onClick={() => setNotifications([])} className="text-xs text-blue-600 hover:underline">Clear all</button>
//                                     </div>
//                                     <div className="max-h-96 overflow-y-auto">
//                                         {notifications.length === 0 ? (
//                                             <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
//                                         ) : (
//                                             notifications.map(notif => (
//                                                 <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition">
//                                                     <div className="flex justify-between gap-2">
//                                                         <p className={`text-sm ${notif.type === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{notif.message}</p>
//                                                         <span className="text-[10px] text-gray-400 whitespace-nowrap">{notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
//                                                     </div>
//                                                 </div>
//                                             ))
//                                         )}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
//                             {initialEmails?.[0]?.snippet?.[0] || 'U'}
//                         </div>
//                     </div>
//                 </header>

//                 <EmailList emails={initialEmails} onEmailClick={setSelectedEmail} />

//                 <div className="h-14 border-t border-gray-200 flex items-center justify-between px-6 bg-gray-50 text-sm text-gray-600">
//                     <div>
//                         Showing <span className="font-medium text-gray-900">{initialEmails?.length > 0 ? startCount : 0}-{endCount}</span> of <span className="font-medium text-gray-900">{totalMessages}</span>
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <button
//                             onClick={() => router.back()}
//                             disabled={currentPage <= 1}
//                             className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition"
//                             title="Previous Page"
//                         >
//                             <ChevronLeft size={20} />
//                         </button>

//                         {nextPageToken ? (
//                             <Link
//                                 href={`/?token=${nextPageToken}&page=${currentPage + 1}`}
//                                 className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition"
//                                 title="Next Page"
//                             >
//                                 <ChevronRight size={20} />
//                             </Link>
//                         ) : (
//                             <button disabled className="p-2 opacity-30">
//                                 <ChevronRight size={20} />
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </main>

//             <ComposeModal
//                 isOpen={isComposeOpen}
//                 initialData={composeData}
//                 onClose={() => setComposeOpen(false)}
//                 onSend={handleSendEmail}
//             />

//             <EmailDetailModal
//                 email={selectedEmail}
//                 onClose={() => setSelectedEmail(null)}
//                 onReply={handleReply}
//             />
//         </div>
//     );
// }






"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import EmailList from "./EmailList";
import ComposeModal from "./ComposeModal";
import EmailDetailModal from "./EmailDetailModal";
import StatsDashboard from "./StatsDashboard";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard({
    initialEmails,
    userToken,
    nextPageToken,
    currentPage = 1,
    totalMessages = 0,
    currentLabel = 'inbox'  // The label passed as a prop
}) {
    const [isComposeOpen, setComposeOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [composeData, setComposeData] = useState(null);
    const router = useRouter();

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [{ id, message, type, time: new Date() }, ...prev]);
    };

    const handleSendEmail = async (to, subject, body, options = {}) => {
        try {
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, body, ...options })
            });

            if (res.ok) {
                addNotification(`Email sent to ${to}`, 'success');
            } else {
                addNotification(`Failed to send email to ${to}`, 'error');
            }
        } catch (error) {
            addNotification(`Error sending email: ${error.message}`, 'error');
        }
    };

    const handleReply = (data) => {
        setComposeData(data);
        setSelectedEmail(null);
        setComposeOpen(true);
    };

    const openCompose = () => {
        setComposeData(null);
        setComposeOpen(true);
    };

    // Polling for new emails (every 15 seconds)
    useEffect(() => {
        const checkNewEmails = async () => {
            try {
                const res = await fetch('/api/notifications/check');
                if (res.ok) {
                    const data = await res.json();
                    if (data.newCount > 0) {
                        data.alerts.forEach(alert => {
                            addNotification(`New Email: ${alert.subject}`, 'unread');
                            // Show native browser notification
                            if ("Notification" in window && Notification.permission === "granted") {
                                new Notification(`New Email from ${alert.from}`, {
                                    body: alert.subject,
                                    icon: '/favicon.ico'
                                });
                            }
                        });
                        // Optional: Refresh the email list if we're in the inbox
                        if (currentLabel === 'inbox' && !selectedEmail) {
                            router.refresh();
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check for new emails:", error);
            }
        };

        const interval = setInterval(checkNewEmails, 15000);
        checkNewEmails(); // Check immediately on mount
        return () => clearInterval(interval);
    }, [currentLabel, selectedEmail, router]);

    // Pagination logic
    const itemsPerPage = 15;
    const startCount = (currentPage - 1) * itemsPerPage + 1;
    const endCount = Math.min(startCount + (initialEmails?.length || 0) - 1, totalMessages || 0);

    const isStatsPage = currentLabel === 'stats';

    return (
        <div className="flex h-screen bg-white">
            <Sidebar setComposeOpen={openCompose} currentLabel={currentLabel} />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-10">
                    <div className="flex-1 max-w-xl">
                        <input type="text" placeholder="Search mail" className="bg-gray-100 px-4 py-2 rounded-lg w-full outline-none focus:bg-white focus:shadow-md transition" />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                                className="p-2 hover:bg-gray-100 rounded-full transition relative"
                            >
                                <Bell size={20} className="text-gray-600" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                                        <button onClick={() => setNotifications([])} className="text-xs text-blue-600 hover:underline">Clear all</button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                                                    <div className="flex justify-between gap-2">
                                                        <p className={`text-sm ${notif.type === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{notif.message}</p>
                                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            {initialEmails?.[0]?.snippet?.[0] || 'U'}
                        </div>
                    </div>
                </header>

                {isStatsPage ? (
                    <>
                        <StatsDashboard />
                    </>
                ) : (
                    <>
                        <EmailList emails={initialEmails} onEmailClick={setSelectedEmail} />

                        <div className="h-14 border-t border-gray-200 flex items-center justify-between px-6 bg-gray-50 text-sm text-gray-600">
                            <div>
                                Showing <span className="font-medium text-gray-900">{initialEmails?.length > 0 ? startCount : 0}-{endCount}</span> of <span className="font-medium text-gray-900">{totalMessages}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.back()}
                                    disabled={currentPage <= 1}
                                    className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition"
                                    title="Previous Page"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                {nextPageToken ? (
                                    <Link
                                        href={`/?token=${nextPageToken}&page=${currentPage + 1}`}
                                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition"
                                        title="Next Page"
                                    >
                                        <ChevronRight size={20} />
                                    </Link>
                                ) : (
                                    <button disabled className="p-2 opacity-30">
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <ComposeModal
                isOpen={isComposeOpen}
                initialData={composeData}
                onClose={() => setComposeOpen(false)}
                onSend={handleSendEmail}
            />

            <EmailDetailModal
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                onReply={handleReply}
            />
        </div>
    );
}

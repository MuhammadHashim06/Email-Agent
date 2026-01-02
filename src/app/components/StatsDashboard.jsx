import React, { useState, useEffect } from 'react';
import { Inbox, Reply, SkipForward, AlertCircle, Paperclip, Clock, CheckCircle } from 'lucide-react';

const StatsDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/stats");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    console.error('Error fetching stats:', res.status);
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    const getTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const statusConfig = {
        received: {
            icon: Inbox,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            label: "Received"
        },
        analyzing: {
            icon: Clock,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            label: "Analyzing"
        },
        processed: {
            icon: CheckCircle,
            color: "text-green-800",
            bgColor: "bg-green-100",
            label: "Processed"
        },
        replied: {
            icon: Reply,
            color: "text-green-800",
            bgColor: "bg-green-50",
            label: "Replied"
        },
        skipped: {
            icon: SkipForward,
            color: "text-gray-800",
            bgColor: "bg-gray-50",
            label: "Skipped"
        },
        error: {
            icon: AlertCircle,
            color: "text-red-800",
            bgColor: "bg-red-100",
            label: "Error"
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-4">
            <h1 className="text-lg font-bold">Stats Dashboard</h1>

            {/* Stats Overview */}
            <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className=" dark:bg-[#1e293b] p-4 rounded-xl shadow-sm flex-1 bg-slate-100 text-center">
                    <div className="flex items-center gap-2 mb-1 justify-center">
                        <Inbox className="text-slate-400 text-[20px]" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Emails</p>
                    </div>
                    <p className="text-2xl font-bold">{data.stats.totalEmails}</p>
                </div>

                <div className="bg-blue-100 dark:bg-[#1e293b] p-4 rounded-xl shadow-sm flex-1 text-center">
                    <div className="flex items-center gap-2 mb-1 justify-center">
                        <Reply className="text-blue-600 text-[20px]" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Replied</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{data.stats.replied}</p>
                </div>

                <div className="bg-amber-100 dark:bg-[#1e293b] p-4 rounded-xl shadow-sm flex-1 text-center">
                    <div className="flex items-center gap-2 mb-1 justify-center">
                        <SkipForward className="text-amber-400 text-[20px]" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Skipped</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{data.stats.skipped}</p>
                </div>

                <div className="bg-rose-100 dark:bg-[#1e293b] p-4 rounded-xl shadow-sm flex-1 text-center">
                    <div className="flex items-center gap-2 mb-1 justify-center">
                        <AlertCircle className="text-rose-400 text-[20px]" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Errors</p>
                    </div>
                    <p className="text-2xl font-bold text-rose-400">{data.stats.errors}</p>
                </div>
            </div>

            {/* Recent Activity (Timeline) */}
            <div className="mt-6">
                <h3 className="text-lg font-bold">Recent Activity</h3>
                <div className="space-y-4 mt-4">
                    {data.timeline.map((event, idx) => {
                        const config = statusConfig[event.status];
                        const Icon = config.icon;
                        const processedDate = new Date(event.processedAt);
                        const timeAgo = getTimeAgo(processedDate);

                        return (
                            <div key={event.messageId} className="flex gap-4 py-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className={`flex-shrink-0 p-2 rounded-lg ${config.bgColor} h-fit`}>
                                    <Icon className={`w-5 h-5 ${config.color}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-1">
                                        <h3 className="text-gray-900 truncate">{event.subject}</h3>
                                        <span className="text-gray-500 flex-shrink-0">{timeAgo}</span>
                                    </div>

                                    <p className="text-gray-600 mb-2">{event.from}</p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-gray-700 ${config.bgColor}`}>
                                            {config.label}
                                        </span>

                                        <span className={`px-2 py-1 rounded text-gray-600 ${event.finalDecision === 'process'
                                            ? 'bg-blue-50'
                                            : 'bg-gray-100'
                                            }`}>
                                            {event.finalDecision === 'process' ? 'Processed' : 'Rejected'}
                                        </span>

                                        {event.attachments && event.attachments.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-gray-600">
                                                <Paperclip className="w-4 h-4" />
                                                {event.attachments.length} {event.attachments.length === 1 ? 'attachment' : 'attachments'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StatsDashboard;

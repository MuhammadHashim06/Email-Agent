
// import { X, Reply, Trash2, Printer } from "lucide-react";
// import { getEmailBody } from "../lib/email-parser";

// interface EmailDetailModalProps {
//     email: any;
//     onClose: () => void;
// }

// export default function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
//     if (!email) return null;

//     const headers = email.payload.headers;
//     const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
//     const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
//     const to = headers.find((h: any) => h.name === 'To')?.value || 'me';
//     const date = headers.find((h: any) => h.name === 'Date')?.value || '';

//     const bodyContent = getEmailBody(email.payload);

//     return (
//         <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
//             <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
//                 {/* Header Toolbar */}
//                 <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
//                     <div className="flex gap-2">
//                         <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Back">
//                             <X size={20} />
//                         </button>
//                         <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Delete">
//                             <Trash2 size={20} />
//                         </button>
//                     </div>
//                     <div className="flex gap-2">
//                         <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Print">
//                             <Printer size={20} />
//                         </button>
//                     </div>
//                 </div>

//                 {/* Content */}
//                 <div className="flex-1 overflow-y-auto p-8">
//                     <h1 className="text-2xl font-normal text-gray-900 mb-6">{subject}</h1>

//                     <div className="flex items-start justify-between mb-8">
//                         <div className="flex items-center gap-4">
//                             <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-medium">
//                                 {from.charAt(0).toUpperCase()}
//                             </div>
//                             <div>
//                                 <div className="font-bold text-gray-900">{from}</div>
//                                 <div className="text-sm text-gray-500">to {to}</div>
//                             </div>
//                         </div>
//                         <div className="text-sm text-gray-500">
//                             {date}
//                         </div>
//                     </div>

//                     <div
//                         className="prose max-w-none text-gray-800"
//                         dangerouslySetInnerHTML={{ __html: bodyContent }}
//                     />
//                 </div>

//                 {/* Footer Actions */}
//                 <div className="p-4 border-t border-gray-200 bg-gray-50">
//                     <button className="flex items-center gap-2 border border-gray-300 rounded-full px-6 py-2 text-gray-600 hover:bg-gray-100 font-medium transition">
//                         <Reply size={18} />
//                         Reply
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }















import { X, Reply, Trash2, Printer, Download, Paperclip, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getEmailBody, getAttachmentsMetadata } from "../lib/email-parser";
import { useState, useEffect } from "react";

function MessageItem({ message, isLast, onReply }) {
    const [isExpanded, setIsExpanded] = useState(isLast);
    const [metadata, setMetadata] = useState(null);
    const headers = message.payload.headers;
    const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
    const to = headers.find((h) => h.name === 'To')?.value || 'me';
    const date = headers.find((h) => h.name === 'Date')?.value || '';
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const messageId = headers.find((h) => h.name === 'Message-ID')?.value || '';

    useEffect(() => {
        if (isExpanded) {
            fetch(`/processed/${message.id}/metadata.json`)
                .then(res => res.ok ? res.json() : null)
                .then(data => setMetadata(data))
                .catch(() => { });
        }
    }, [isExpanded, message.id]);

    const bodyContent = getEmailBody(message.payload);
    const attachments = getAttachmentsMetadata(message.payload);

    const downloadAttachment = (attr) => {
        const url = `/api/attachments?messageId=${message.id}&attachmentId=${attr.attachmentId}&filename=${encodeURIComponent(attr.filename)}`;
        window.open(url, '_blank');
    };

    const handleReply = (e) => {
        e.stopPropagation();
        const fromEmail = from.match(/<(.+)>/)?.[1] || from;
        const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

        onReply({
            to: fromEmail,
            subject: replySubject,
            body: `\n\nOn ${date}, ${from} wrote:\n> ...`,
            threadId: message.threadId,
            messageId: messageId,
        });
    };

    return (
        <div className={`border-b border-gray-100 last:border-0 ${isExpanded ? 'py-6' : 'py-3 hover:bg-gray-50 cursor-pointer transition'}`} onClick={() => !isExpanded && setIsExpanded(true)}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium shrink-0">
                        {from.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{from.split('<')[0].trim()}</span>
                            {!isExpanded && (
                                <span className="text-gray-500 text-sm truncate max-w-md">
                                    {message.snippet}
                                </span>
                            )}
                        </div>
                        {isExpanded && <div className="text-xs text-gray-500">to {to}</div>}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{date}</span>
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 hover:bg-gray-200 rounded text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-6 pl-11">
                    <div
                        className="prose max-w-none text-gray-800 mb-8"
                        dangerouslySetInnerHTML={{ __html: bodyContent }}
                    />

                    {/* {metadata && metadata.attachments?.length > 0 && (
                        <div className="mt-6 border-t border-gray-50 pt-4 mb-6">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI Document Previews</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {metadata.attachments.map((attr, idx) => (
                                    attr.images.map((img, imgIdx) => (
                                        <div key={`${idx}-${imgIdx}`} className="group relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition">
                                            <img src={img} alt={attr.originalName} className="w-full h-full object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                                                <p className="text-[9px] text-white truncate font-medium">{attr.originalName}</p>
                                            </div>
                                        </div>
                                    ))
                                ))}
                            </div>
                        </div>
                    )} */}

                    {attachments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {attachments.map((attr, idx) => (
                                <div key={idx} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition cursor-pointer text-xs" onClick={() => downloadAttachment(attr)}>
                                    <Paperclip size={14} className="text-blue-600" />
                                    <span className="max-w-[120px] truncate">{attr.filename}</span>
                                    <Download size={14} className="text-gray-400" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex gap-2">
                        <button
                            onClick={handleReply}
                            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 font-medium transition"
                        >
                            <Reply size={14} />
                            Reply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EmailDetailModal({ email, onClose, onReply }) {
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (email?.threadId) {
            setLoading(true);
            fetch(`/api/thread?id=${email.threadId}`)
                .then(res => res.json())
                .then(data => {
                    setThread(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error loading thread:", err);
                    setLoading(false);
                });
        }
    }, [email?.threadId]);

    if (!email) return null;

    const subject = email.payload.headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header Toolbar */}
                <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
                    <div className="flex gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Back">
                            <X size={20} />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Delete">
                            <Trash2 size={20} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Print">
                            <Printer size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <h1 className="text-2xl font-normal text-gray-900 mb-8">{subject}</h1>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                            <Loader2 size={40} className="animate-spin" />
                            <p>Loading conversation...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {(thread?.messages || [email]).map((msg, idx, arr) => (
                                <MessageItem
                                    key={msg.id}
                                    message={msg}
                                    isLast={idx === arr.length - 1}
                                    onReply={onReply}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

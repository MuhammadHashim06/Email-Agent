
// import { X, Minimize2, Maximize2 } from "lucide-react";
// import { useState } from "react";

// interface ComposeModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onSend: (to: string, subject: string, body: string) => Promise<void>;
// }

// export default function ComposeModal({ isOpen, onClose, onSend }: ComposeModalProps) {
//     const [to, setTo] = useState("");
//     const [subject, setSubject] = useState("");
//     const [body, setBody] = useState("");
//     const [sending, setSending] = useState(false);

//     if (!isOpen) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setSending(true);
//         await onSend(to, subject, body);
//         setSending(false);
//         onClose();
//     };

//     return (
//         <div className="fixed bottom-0 right-20 w-[600px] h-[500px] bg-white rounded-t-lg shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
//             <div className="bg-gray-800 text-white flex justify-between items-center px-4 py-2 rounded-t-lg">
//                 <span className="font-medium text-sm">New Message</span>
//                 <div className="flex gap-2">
//                     <Minimize2 size={16} className="cursor-pointer" />
//                     <Maximize2 size={16} className="cursor-pointer" />
//                     <X size={16} className="cursor-pointer hover:bg-gray-700 rounded" onClick={onClose} />
//                 </div>
//             </div>

//             <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
//                 <div className="border-b border-gray-200">
//                     <input
//                         type="text"
//                         placeholder="Recipients"
//                         className="w-full px-4 py-2 outline-none text-sm placeholder-gray-500"
//                         value={to}
//                         onChange={(e) => setTo(e.target.value)}
//                         required
//                     />
//                 </div>
//                 <div className="border-b border-gray-200">
//                     <input
//                         type="text"
//                         placeholder="Subject"
//                         className="w-full px-4 py-2 outline-none text-sm placeholder-gray-500"
//                         value={subject}
//                         onChange={(e) => setSubject(e.target.value)}
//                         required
//                     />
//                 </div>
//                 <div className="flex-1">
//                     <textarea
//                         className="w-full h-full p-4 outline-none resize-none font-sans text-sm"
//                         value={body}
//                         onChange={(e) => setBody(e.target.value)}
//                     />
//                 </div>

//                 <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-gray-50">
//                     <div className="flex items-center gap-2">
//                         <button
//                             type="submit"
//                             disabled={sending}
//                             className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 hover:shadow disabled:opacity-50"
//                         >
//                             {sending ? 'Sending...' : 'Send'}
//                         </button>
//                     </div>
//                 </div>
//             </form>
//         </div>
//     );
// }





















"use client";

import { X, Minimize2, Maximize2, Paperclip, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function ComposeModal({ isOpen, onClose, onSend, initialData = null }) {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setTo(initialData.to || "");
            setSubject(initialData.subject || "");
            setBody(initialData.body || "");
        } else {
            setTo("");
            setSubject("");
            setBody("");
        }
        setAttachments([]);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result.split(',')[1];
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);

        const options = {
            attachments,
            threadId: initialData?.threadId,
            inReplyTo: initialData?.messageId,
            references: initialData?.references || initialData?.messageId
        };

        if (onSend.length > 3) {
            // If onSend expects options
            await onSend(to, subject, body, options);
        } else {
            // Backward compatibility or if we update handleSendEmail in Dashboard
            await onSend(to, subject, body, attachments, initialData);
        }

        setSending(false);
        onClose();
    };

    return (
        <div className="fixed bottom-0 right-20 w-[600px] max-h-[600px] h-[500px] bg-white rounded-t-lg shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200">
            <div className="bg-gray-800 text-white flex justify-between items-center px-4 py-2 rounded-t-lg">
                <span className="font-medium text-sm">{initialData ? 'Reply' : 'New Message'}</span>
                <div className="flex gap-2">
                    <Minimize2 size={16} className="cursor-pointer" />
                    <Maximize2 size={16} className="cursor-pointer" />
                    <X size={16} className="cursor-pointer hover:bg-gray-700 rounded" onClick={onClose} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="border-b border-gray-200">
                    <input
                        type="text"
                        placeholder="Recipients"
                        className="w-full px-4 py-2 outline-none text-sm placeholder-gray-500"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        required
                    />
                </div>
                <div className="border-b border-gray-200">
                    <input
                        type="text"
                        placeholder="Subject"
                        className="w-full px-4 py-2 outline-none text-sm placeholder-gray-500"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                    />
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <textarea
                        className="w-full flex-1 p-4 outline-none resize-none font-sans text-sm"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />

                    {attachments.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-50">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-600">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 flex items-center justify-between border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-4">
                        <button
                            type="submit"
                            disabled={sending}
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 hover:shadow disabled:opacity-50 flex items-center gap-2"
                        >
                            {sending && <Loader2 size={16} className="animate-spin" />}
                            {sending ? 'Sending...' : 'Send'}
                        </button>

                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"
                            title="Attach files"
                        >
                            <Paperclip size={20} />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}


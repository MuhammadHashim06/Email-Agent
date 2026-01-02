// import { Star } from "lucide-react";

// interface EmailListProps {
//     emails: any[]; // using any for now, will type later based on Gmail API response
//     onEmailClick: (email: any) => void;
// }

// export default function EmailList({ emails, onEmailClick }: EmailListProps) {
//     if (!emails || emails.length === 0) {
//         return (
//             <div className="flex-1 flex justify-center items-center text-gray-500">
//                 No emails found.
//             </div>
//         );
//     }

//     return (
//         <div className="flex-1 overflow-y-auto">
//             {emails.map((email) => {
//                 const headers = email.payload.headers;
//                 const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
//                 const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
//                 const snippet = email.snippet;

//                 return (
//                     <div
//                         key={email.id}
//                         onClick={() => onEmailClick(email)}
//                         className="flex items-center gap-4 p-3 border-b border-gray-100 hover:shadow-sm hover:z-10 bg-white cursor-pointer group"
//                     >
//                         <div className="text-gray-400 group-hover:text-gray-600">
//                             <Star size={18} />
//                         </div>
//                         <div className="w-48 truncate font-medium text-gray-800">
//                             {from}
//                         </div>
//                         <div className="flex-1 truncate text-gray-600">
//                             <span className="font-medium text-gray-800">{subject}</span>
//                             <span className="mx-2 text-gray-400">-</span>
//                             {snippet}
//                         </div>
//                         <div className="text-sm text-gray-500 w-20 text-right">
//                             {/* Date would go here */}
//                         </div>
//                     </div>
//                 );
//             })}
//         </div>
//     );
// }

























import { Star } from "lucide-react";

export default function EmailList({ emails, onEmailClick }) {
    if (!emails || emails.length === 0) {
        return (
            <div className="flex-1 flex justify-center items-center text-gray-500">
                No emails found.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {emails.map((email) => {
                const headers = email.payload.headers;
                const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
                const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
                const snippet = email.snippet;

                return (
                    <div
                        key={email.id}
                        onClick={() => onEmailClick(email)}
                        className={`flex items-center gap-4 p-3 border-b border-gray-100 hover:shadow-sm hover:z-10 bg-white cursor-pointer group transition-all ${email.labelIds?.includes('UNREAD') ? 'font-bold bg-blue-50/30' : ''
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="text-gray-400 group-hover:text-gray-600">
                                <Star size={18} />
                            </div>
                            {email.labelIds?.includes('UNREAD') && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                            )}
                        </div>
                        <div className={`w-48 truncate text-gray-800 ${email.labelIds?.includes('UNREAD') ? 'font-bold' : 'font-medium'}`}>
                            {from}
                        </div>
                        <div className="flex-1 truncate text-gray-600">
                            <span className={email.labelIds?.includes('UNREAD') ? 'text-gray-900' : 'text-gray-800'}>{subject}</span>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className="font-normal text-gray-500">{snippet}</span>
                        </div>
                        <div className="text-sm text-gray-500 w-24 text-right">
                            {new Date(parseInt(email.internalDate)).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

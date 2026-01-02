// import { auth, signIn, signOut } from "./auth";
// import { listMessages } from "./lib/gmail";
// import Dashboard from "./components/Dashboard";

// // @ts-ignore
// export default async function Home(props: { searchParams: Promise<{ token?: string, page?: string }> }) {
//     const searchParams = await props.searchParams;
//     const session = await auth();
//     const page = parseInt(searchParams.page || "1", 10);

//     if (!session) {
//         return (
//             <div className="flex h-screen w-full items-center justify-center bg-gray-50">
//                 <div className="text-center p-8 bg-white rounded-xl shadow-lg">
//                     <h1 className="text-2xl font-bold mb-4">Welcome to Gmail Clone</h1>
//                     <p className="mb-6 text-gray-600">Please sign in to access your emails.</p>
//                     <form
//                         action={async () => {
//                             "use server"
//                             await signIn("google")
//                         }}
//                     >
//                         <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
//                             Sign in with Google
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         );
//     }

//     // Fetch emails
//     let emails = [];
//     let nextPageToken;
//     let totalMessages = 0;
//     try {
//         if (session.accessToken) {
//             const result = await listMessages(session.accessToken as string, searchParams.token);
//             emails = result.messages;
//             nextPageToken = result.nextPageToken;
//             totalMessages = result.totalMessages || 0;
//         }
//     } catch (e) {
//         console.error("Failed to fetch emails", e);
//         // If token expired or error, might fallback or show error
//     }

//     return (
//         <Dashboard
//             initialEmails={emails}
//             userToken={session.accessToken as string}
//             nextPageToken={nextPageToken}
//             currentPage={page}
//             totalMessages={totalMessages}
//         />
//     );
// }











import { auth, signIn, signOut } from "./auth";
import { listMessages } from "./lib/gmail";
import Dashboard from "./components/Dashboard";

export default async function Home(props) {
    const searchParams = await props.searchParams;
    const session = await auth();
    const page = parseInt(searchParams.page || "1", 10);

    if (!session) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <h1 className="text-2xl font-bold mb-4">Welcome to Gmail Clone</h1>
                    <p className="mb-6 text-gray-600">Please sign in to access your emails.</p>
                    <form
                        action={async () => {
                            "use server";
                            await signIn("google");
                        }}
                    >
                        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
                            Sign in with Google
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Fetch emails
    let emails = [];
    let nextPageToken;
    let totalMessages = 0;
    const label = searchParams.label || 'inbox';
    const q = label === 'inbox' ? 'in:inbox' : label === 'sent' ? 'in:sent' : label === 'drafts' ? 'in:drafts' : `label:${label}`;

    try {
        if (session.accessToken) {
            const result = await listMessages(session.accessToken, searchParams.token, 15, q);
            emails = Array.isArray(result.messages) ? result.messages : [];
            nextPageToken = result.nextPageToken;
            totalMessages = result.totalMessages || 0;
        }
    } catch (e) {
        console.error("Failed to fetch emails", e);
        // If token expired or error, might fallback or show error
    }

    return (
        <Dashboard
            initialEmails={emails}
            userToken={session.accessToken}
            nextPageToken={nextPageToken}
            currentPage={page}
            totalMessages={totalMessages}
            currentLabel={label}
        />
    );
}

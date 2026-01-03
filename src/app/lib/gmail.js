
import { google } from 'googleapis';

export async function getGmailClient(accessToken) {
    if (!accessToken) {
        console.error("No access token provided to getGmailClient");
    }
    const auth = new google.auth.OAuth2(
        process.env.AUTH_GOOGLE_ID,
        process.env.AUTH_GOOGLE_SECRET
    );
    auth.setCredentials({ access_token: accessToken });

    return google.gmail({ version: 'v1', auth });
}

export async function listMessages(accessToken, pageToken, maxResults = 15, q = 'in:inbox') {
    const gmail = await getGmailClient(accessToken);
    const [response, profile] = await Promise.all([
        gmail.users.messages.list({
            userId: 'me',
            maxResults,
            pageToken,
            q
        }),
        gmail.users.getProfile({ userId: 'me' })
    ]);

    const messages = response.data.messages || [];

    // Fetch details for each message to get snippet and headers
    const details = await Promise.all(
        messages.map(async (msg) => {
            const msgDetails = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id || null,
                format: 'full' // or 'metadata' if body not needed immediately
            });
            return msgDetails.data;
        })
    );

    return {
        messages: details,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
        totalMessages: profile.data.messagesTotal
    };
}

export async function sendEmail(accessToken, to, subject, body, options = {}) {
    const { attachments = [], threadId, inReplyTo, references } = options;
    const gmail = await getGmailClient(accessToken);

    const boundary = `foo_bar_baz_${Date.now()}`;
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    let messageParts = [];

    // Basic Headers
    messageParts.push(`To: ${to}`);
    if (options.cc) messageParts.push(`Cc: ${options.cc}`);
    if (options.bcc) messageParts.push(`Bcc: ${options.bcc}`);
    messageParts.push(`Subject: ${utf8Subject}`);
    messageParts.push('MIME-Version: 1.0');

    if (inReplyTo) {
        const formattedInReplyTo = inReplyTo.startsWith('<') ? inReplyTo : `<${inReplyTo}>`;
        messageParts.push(`In-Reply-To: ${formattedInReplyTo}`);
    }
    if (references) {
        const formattedReferences = references.split(/\s+/).map(ref => (ref.startsWith('<') ? ref : `<${ref}>`)).join(' ');
        messageParts.push(`References: ${formattedReferences}`);
    }

    if (attachments.length > 0) {
        messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageParts.push('');

        // Body Part
        messageParts.push(`--${boundary}`);
        messageParts.push('Content-Type: text/html; charset=utf-8');
        messageParts.push('');
        messageParts.push(body);

        // Attachment Parts
        for (const attr of attachments) {
            messageParts.push(`--${boundary}`);
            messageParts.push(`Content-Type: ${attr.type || 'application/octet-stream'}; name="${attr.name}"`);
            messageParts.push(`Content-Disposition: attachment; filename="${attr.name}"`);
            messageParts.push('Content-Transfer-Encoding: base64');
            messageParts.push('');
            messageParts.push(attr.data); // data should be base64 string
        }
        messageParts.push(`--${boundary}--`);
    } else {
        messageParts.push('Content-Type: text/html; charset=utf-8');
        messageParts.push('');
        messageParts.push(body);
    }

    const message = messageParts.join('\r\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
            threadId: threadId,
        },
    });

    return res.data;
}

export async function getAttachment(accessToken, messageId, attachmentId) {
    const gmail = await getGmailClient(accessToken);
    const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
    });
    return response.data;
}

export async function getThread(accessToken, threadId) {
    const gmail = await getGmailClient(accessToken);
    const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId
    });
    return response.data;
}

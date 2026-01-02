
export function getEmailBody(payload) {
    if (!payload) return "";

    let body = "";

    // Helper to decode base64url
    const decode = (data) => {
        try {
            return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
            console.error("Failed to decode base64", e);
            return "";
        }
    };

    if (payload.body && payload.body.data) {
        return decode(payload.body.data);
    }

    if (payload.parts) {
        // Find HTML part first
        const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
            return decode(htmlPart.body.data);
        }

        // Fallback to plain text
        const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
            return decode(textPart.body.data);
        }

        // Recursive check for nested multipart
        for (const part of payload.parts) {
            if (part.parts) {
                const nestedBody = getEmailBody(part);
                if (nestedBody) return nestedBody;
            }
        }
    }

    return "(No content)";
}

export function getAttachmentsMetadata(payload) {
    if (!payload || !payload.parts) return [];

    const attachments = [];

    function findAttachments(parts) {
        for (const part of parts) {
            if (part.filename && part.filename.length > 0) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
            if (part.parts) {
                findAttachments(part.parts);
            }
        }
    }

    findAttachments(payload.parts);
    return attachments;
}

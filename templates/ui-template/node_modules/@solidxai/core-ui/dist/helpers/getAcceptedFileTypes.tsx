export default function getAcceptedFileTypes(mediaTypes: string[]) {
    if (!mediaTypes || mediaTypes.length === 0) return {}; // Default empty

    const fileTypeMapping: Record<string, string> = {
        image: "image/*",
        audio: "audio/*",
        video: "video/*",
        pdf: "application/pdf",
        file: "",
    };

    // If "file" exists in mediaTypes, allow all files
    if (mediaTypes.includes("file")) {
        return {};
    }

    const acceptedTypes = mediaTypes
        .map(type => fileTypeMapping[type.toLowerCase()])
        .filter(Boolean); // Remove undefined values

    return acceptedTypes.length > 0 ? Object.fromEntries(acceptedTypes.map(type => [type, []])) : {};
}
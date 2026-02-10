// export function getTextColor(bgColor: string) {
//     // Convert hex to RGB using slice instead of deprecated substr
//     const r = parseInt(bgColor.slice(1, 3), 16)
//     const g = parseInt(bgColor.slice(3, 5), 16)
//     const b = parseInt(bgColor.slice(5, 7), 16)

//     // Brightness formula (standard luminance)
//     const brightness = (r * 299 + g * 587 + b * 114) / 1000
//     return brightness > 128 ? '#000000' : '#FFFFFF'
// }

export function getRandomHexColor() {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
}

export const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to a color
    const hue = hash % 360;
    const saturation = 70 + (hash % 20); // 70-90% saturation
    const lightness = 40 + (hash % 20); // 40-60% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getTextColor = (bgColor: string) => {
    const hsl = bgColor.match(/\d+/g);
    if (!hsl) return '#000000';
    
    const h = parseInt(hsl[0]) / 360;
    const s = parseInt(hsl[1]) / 100;
    const l = parseInt(hsl[2]) / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}; 
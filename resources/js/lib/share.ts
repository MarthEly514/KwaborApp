export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const mapsEmbed = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;

/** wa.me link: opens a pre-filled chat. A phone number targets one person; without it the user picks the contact. */
export const whatsappUrl = (text: string, phone?: string | null) =>
    `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;
export const smsUrl = (text: string) => `sms:?&body=${encodeURIComponent(text)}`;
export const mailUrl = (subject: string, text: string, to = '') =>
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

export const isPhone = (c?: string | null) => !!c && !c.includes('@') && /^[+\d\s().-]{8,}$/.test(c);

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Agenda reminder: an .ics with alarms 24 h and 2 h before. */
export function downloadIcs(title: string, startsAt: string, location: string) {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + 3 * 3600_000);
    const alarm = (t: string) => `BEGIN:VALARM\r\nTRIGGER:-${t}\r\nACTION:DISPLAY\r\nDESCRIPTION:${title}\r\nEND:VALARM`;
    const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kwabor//FR', 'BEGIN:VEVENT',
        `UID:${stamp(start)}-${encodeURIComponent(title)}@kwabor`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${title}`, `LOCATION:${location}`,
        alarm('PT24H'), alarm('PT2H'), 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), 'kwabor-event.ics');
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv' }), name);
}

function download(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

/** Shrinks a photo in the browser (the server has no image library) before upload. */
export async function resizeImage(file: File, max = 1800): Promise<File> {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

// API route Vercel pour envoyer les .ics via Resend

import { Resend } from 'resend';
/* eslint-disable @typescript-eslint/no-explicit-any */

interface InviteRequest {
  to: string | string[];
  from?: string;
  subject: string;
  description?: string;
  location?: string;
  start: string; // ISO date string
  end?: string; // ISO date string
}

// Format a date to ICS (YYYYMMDDTHHmmSSZ)
function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      to,
      from = 'noreply@example.com',
      subject,
      description = '',
      location = '',
      start,
      end,
    }: InviteRequest = req.body;

    if (!to || !subject || !start) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Plus de Bulles//Calendrier//FR\nBEGIN:VEVENT\nUID:${Date.now()}@plusdebulles.fr\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(startDate)}\nDTEND:${formatDate(endDate)}\nSUMMARY:${subject}\nDESCRIPTION:${description}\nLOCATION:${location}\nEND:VEVENT\nEND:VCALENDAR`;

    const resend = new Resend(process.env.RESEND_API_KEY ?? '');

    await resend.emails.send({
      from,
      to,
      subject,
      text: description,
      attachments: [
        {
          filename: 'invite.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


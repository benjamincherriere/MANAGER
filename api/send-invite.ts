import { Resend } from 'resend';

export const config = {
  runtime: 'edge',
};

function buildICS(meeting: any) {
  const start = new Date(meeting.startAt);
  const end = new Date(start.getTime() + meeting.durationMin * 60000);
  const toISOString = (d: Date) => d.toISOString().replace(/[-:]|\.000/g, '');
  const uid = `${meeting.id}@plus-de-bulles-manager`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${meeting.title}`,
    `DTSTART:${toISOString(start)}`,
    `DTEND:${toISOString(end)}`,
    `DTSTAMP:${toISOString(new Date())}`,
    `ORGANIZER:mailto:${meeting.organizerEmail}`,
    `DESCRIPTION:${meeting.description || ''}`,
    `LOCATION:${meeting.location || ''}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel RDV fournisseur',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export default async function handler(req: Request) {
  const body = await req.json();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const ics = buildICS(body.meeting);

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: body.to || process.env.RESEND_DEFAULT_TO!,
    subject: `Invitation: ${body.meeting.title}`,
    html: `<p>Invitation pour le RDV fournisseur : ${body.meeting.title}</p>`,
    attachments: [{
      filename: 'invite.ics',
      content: ics,
      contentType: 'text/calendar',
    }],
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

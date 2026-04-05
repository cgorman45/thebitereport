import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TripAlertEmail {
  to: string;
  boatName: string;
  tripDate: string;
  duration: string;
  spotsLeft: number;
  type: 'selling_out' | 'spots_opened';
}

export async function sendTripAlert({ to, boatName, tripDate, duration, spotsLeft, type }: TripAlertEmail) {
  const dateStr = new Date(tripDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const subject = type === 'selling_out'
    ? `${boatName} — ${dateStr} is almost full!`
    : `${boatName} — Spots opened on ${dateStr}!`;

  const body = type === 'selling_out'
    ? `<p>The <strong>${boatName}</strong> ${duration} trip on <strong>${dateStr}</strong> is down to <strong>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}</strong>.</p>
       <p>Book soon before it sells out!</p>`
    : `<p>Great news! Spots have opened up on the <strong>${boatName}</strong> ${duration} trip on <strong>${dateStr}</strong>.</p>
       <p>There are now <strong>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''}</strong> available.</p>`;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">
        THE <span style="color: #00d4ff;">BITE</span> REPORT
      </div>
      ${body}
      <p style="margin-top: 24px;">
        <a href="https://thebitereport.com/plan-your-trip"
           style="background: #00d4ff; color: #0a0f1a; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          View Trips
        </a>
      </p>
      <p style="margin-top: 32px; font-size: 12px; color: #888;">
        You're receiving this because you're watching this trip on The Bite Report.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: 'The Bite Report <alerts@thebitereport.com>',
    to,
    subject,
    html,
  });
}

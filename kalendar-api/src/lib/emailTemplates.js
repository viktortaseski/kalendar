import { appUrl, escapeHtml, formatWhen } from './email.js';

export function employeeInvite({
  inviteeName,
  inviterName,
  businessName,
}) {
  const url = appUrl('/inbox');
  const safe = {
    inviteeName: escapeHtml(inviteeName || 'there'),
    inviterName: escapeHtml(inviterName || 'A team owner'),
    businessName: escapeHtml(businessName),
    url: escapeHtml(url),
  };

  const subject = `${inviterName || 'Someone'} invited you to join ${businessName} on Kalendar`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:22px;">You've got a team invitation</h2>
      <p style="margin:0 0 16px;color:#374151;">Hi ${safe.inviteeName},</p>
      <p style="margin:0 0 24px;color:#374151;"><strong>${safe.inviterName}</strong> has invited you to join <strong>${safe.businessName}</strong> as a team member on Kalendar.</p>
      <a href="${safe.url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open inbox to respond</a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">You can accept or decline this invite from your Kalendar inbox.</p>
    </div>
  </body>
</html>`;

  const text = [
    `You've got a team invitation.`,
    ``,
    `Hi ${inviteeName || 'there'},`,
    `${inviterName || 'A team owner'} has invited you to join ${businessName} on Kalendar.`,
    ``,
    `Open your inbox to respond: ${url}`,
  ].join('\n');

  return { subject, html, text };
}

export function bookingConfirmation({
  customerName,
  businessName,
  businessSlug,
  employeeName,
  serviceName,
  startsAt,
  timezone,
}) {
  const when = formatWhen(startsAt, timezone);
  const url = appUrl(`/businesses/${businessSlug}`);
  const safe = {
    customerName: escapeHtml(customerName),
    businessName: escapeHtml(businessName),
    employeeName: escapeHtml(employeeName),
    serviceName: escapeHtml(serviceName),
    when: escapeHtml(when),
    url: escapeHtml(url),
  };

  const subject = `Booking confirmed at ${businessName}`;

  const rows = [
    `<tr><td style="padding:6px 12px;color:#6b7280;">When</td><td style="padding:6px 12px;color:#111827;">${safe.when}</td></tr>`,
    safe.serviceName ? `<tr><td style="padding:6px 12px;color:#6b7280;">Service</td><td style="padding:6px 12px;color:#111827;">${safe.serviceName}</td></tr>` : '',
    safe.employeeName ? `<tr><td style="padding:6px 12px;color:#6b7280;">With</td><td style="padding:6px 12px;color:#111827;">${safe.employeeName}</td></tr>` : '',
  ].join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:22px;">Your booking is confirmed</h2>
      <p style="margin:0 0 16px;color:#374151;">Hi ${safe.customerName},</p>
      <p style="margin:0 0 24px;color:#374151;">Your appointment at <strong>${safe.businessName}</strong> is booked. Here are the details:</p>
      <table style="border-collapse:collapse;margin-bottom:24px;">${rows}</table>
      <a href="${safe.url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">View booking</a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Need to cancel or change? Reply to this email or contact ${safe.businessName} directly.</p>
    </div>
  </body>
</html>`;

  const text = [
    `Your booking is confirmed.`,
    ``,
    `Hi ${customerName},`,
    `Your appointment at ${businessName} is booked.`,
    ``,
    `When: ${when}`,
    serviceName ? `Service: ${serviceName}` : null,
    employeeName ? `With: ${employeeName}` : null,
    ``,
    `View: ${url}`,
  ].filter((line) => line !== null).join('\n');

  return { subject, html, text };
}

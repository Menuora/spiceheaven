process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "smoke-secret";

const app = require("../api/index");

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const adminPage = await fetch(`${base}/admin`);
    const blocked = await fetch(`${base}/api/admin/dashboard`);
    const settings = await fetch(`${base}/api/settings`);
    const gallery = await fetch(`${base}/gallery.html`);
    const booking = await fetch(`${base}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Smoke Guest", phone: "1234567890", date: "2026-06-22", time: "19:00", guests: "2" })
    });
    const login = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password" })
    });
    const cookie = login.headers.get("set-cookie");
    const dashboard = await fetch(`${base}/api/admin/dashboard`, { headers: { cookie } });
    console.log(JSON.stringify({ adminPage: adminPage.status, blocked: blocked.status, settings: settings.status, gallery: gallery.status, booking: booking.status, login: login.status, dashboard: dashboard.status }, null, 2));
    if (adminPage.status !== 200 || blocked.status !== 401 || settings.status !== 200 || gallery.status !== 200 || booking.status !== 201 || login.status !== 200 || dashboard.status !== 200) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

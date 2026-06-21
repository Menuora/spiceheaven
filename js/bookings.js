document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("bookingForm");
  var status = document.getElementById("bookingStatus");
  var timeInput = document.getElementById("time");
  var guestsInput = document.getElementById("guests");
  var dateInput = document.getElementById("date");

  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  document.querySelectorAll(".time-slot").forEach(function (slot) {
    slot.addEventListener("click", function () {
      document.querySelectorAll(".time-slot").forEach(function (s) { s.classList.remove("selected"); });
      slot.classList.add("selected");
      if (timeInput) timeInput.value = slot.dataset.time;
    });
  });

  if (guestsInput) {
    document.getElementById("party-size")?.addEventListener("change", function (event) {
      guestsInput.value = event.target.value;
    });
  }

  if (!form) return;
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    status.textContent = "Sending your reservation...";
    status.className = "booking-status";
    var payload = Object.fromEntries(new FormData(form).entries());
    try {
      var response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save booking");
      form.reset();
      document.querySelectorAll(".time-slot").forEach(function (s) { s.classList.remove("selected"); });
      status.textContent = "Thank you. Your table request has been sent.";
      status.classList.add("success");
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });
});

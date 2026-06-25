document.addEventListener("DOMContentLoaded", function () {
  var loginView = document.getElementById("loginView");
  var dashboardView = document.getElementById("dashboardView");
  var loginForm = document.getElementById("loginForm");
  var loginStatus = document.getElementById("loginStatus");
  var bookingsList = document.getElementById("bookingsList");
  var galleryList = document.getElementById("galleryList");
  var settingsForm = document.getElementById("settingsForm");
  var imagesForm = document.getElementById("imagesForm");
  var uploadForm = document.getElementById("uploadForm");
  var passwordForm = document.getElementById("passwordForm");
  var statusBar = document.getElementById("adminStatus");
  var adminSessionActive = false;

  function showStatus(message, isError) {
    statusBar.textContent = message;
    statusBar.className = isError ? "admin-status error" : "admin-status success";
    setTimeout(function () { statusBar.textContent = ""; statusBar.className = "admin-status"; }, 3500);
  }

  async function api(url, options) {
    var response = await fetch(url, options || {});
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function fillForm(form, values) {
    Object.keys(values || {}).forEach(function (key) {
      var field = form.querySelector("[name='" + key + "']");
      if (field) field.value = values[key] || "";
    });
  }

  function renderBookings(bookings) {
    bookingsList.innerHTML = bookings.length ? bookings.map(function (b) {
      return `<article class="admin-item"><div><strong>${b.name}</strong><span>${b.date} at ${b.time} · ${b.guests} guests</span><small>${b.phone}${b.email ? " · " + b.email : ""}</small>${b.message ? `<p>${b.message}</p>` : ""}</div><button data-booking="${b.id}">${b.status || "new"}</button></article>`;
    }).join("") : "<p class='muted'>No bookings yet.</p>";
  }

  function renderGallery(items) {
    galleryList.innerHTML = items.length ? items.map(function (item) {
      return `<article class="admin-gallery-item"><img src="${item.imageUrl}" alt="${item.title}"><div><strong>${item.title}</strong><span>${item.type === "menu" ? "Full menu" : "Item image"}</span></div><button data-delete-gallery="${item.id}">Remove</button></article>`;
    }).join("") : "<p class='muted'>No uploaded images yet.</p>";
  }

  async function loadDashboard() {
    try {
      if (window.dbApi) {
        var bookings = await window.dbApi.dbGetBookings();
        var gallery = await window.dbApi.dbGetGallery();
        var data = await window.dbApi.dbGetSettings();
        renderBookings(bookings || []);
        renderGallery(gallery || []);
        fillForm(settingsForm, data.settings || {});
        fillForm(imagesForm, data.images || {});
      } else {
        var data = await api("/api/admin/dashboard");
        renderBookings(data.bookings || []);
        renderGallery(data.gallery || []);
        fillForm(settingsForm, data.settings || {});
        fillForm(imagesForm, data.images || {});
      }
      loginView.hidden = true;
      dashboardView.hidden = false;
    } catch (error) {
      showStatus("Error loading dashboard: " + error.message, true);
    }
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginStatus.textContent = "Checking credentials...";
    try {
      if (window.dbApi) {
        var username = loginForm.querySelector("[name='username']").value;
        var password = loginForm.querySelector("[name='password']").value;
        await window.dbApi.dbLogin(username, password);
      } else {
        await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries())) });
      }
      loginStatus.textContent = "";
      await loadDashboard();
    } catch (error) {
      loginStatus.textContent = error.message;
    }
  });

  settingsForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      var payload = Object.fromEntries(new FormData(settingsForm).entries());
      if (window.dbApi) {
        await window.dbApi.dbUpdateSettings(payload);
      } else {
        await api("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      showStatus("Website settings saved.");
    } catch (error) { showStatus(error.message, true); }
  });

  imagesForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      var payload = Object.fromEntries(new FormData(imagesForm).entries());
      if (window.dbApi) {
        await window.dbApi.dbUpdateImages(payload);
      } else {
        await api("/api/admin/images", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      showStatus("Homepage image settings saved.");
    } catch (error) { showStatus(error.message, true); }
  });

  uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      var formData = new FormData(uploadForm);
      var title = formData.get("title");
      var type = formData.get("type");
      var imageUrl = formData.get("imageUrl");
      var fileInput = uploadForm.querySelector("[name='image']");
      var file = fileInput ? fileInput.files[0] : null;

      if (window.dbApi) {
        if (file) {
          showStatus("Uploading image...");
          imageUrl = await window.dbApi.dbUploadImage(file);
        }
        if (!imageUrl) throw new Error("Please select a file or enter an image URL.");
        await window.dbApi.dbAddGalleryItem(title, type, imageUrl);
        uploadForm.reset();
        await loadDashboard();
        showStatus("Image added to gallery.");
      } else {
        var response = await fetch("/api/admin/gallery", { method: "POST", body: formData });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");
        uploadForm.reset();
        await loadDashboard();
        showStatus("Image added to gallery.");
      }
    } catch (error) { showStatus(error.message, true); }
  });

  if (passwordForm) {
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var currentPassword = passwordForm.querySelector("[name='currentPassword']").value;
      var newPassword = passwordForm.querySelector("[name='newPassword']").value;
      var confirmPassword = passwordForm.querySelector("[name='confirmPassword']").value;

      if (newPassword !== confirmPassword) {
        showStatus("New passwords do not match.", true);
        return;
      }

      try {
        if (window.dbApi) {
          showStatus("Updating password...");
          await window.dbApi.dbChangePassword(currentPassword, newPassword);
          passwordForm.reset();
          showStatus("Password updated successfully.");
        } else {
          showStatus("Local mock mode: Password update simulated.", false);
        }
      } catch (error) {
        showStatus(error.message, true);
      }
    });
  }

  document.addEventListener("click", async function (event) {
    var deleteId = event.target.dataset.deleteGallery;
    var bookingId = event.target.dataset.booking;
    try {
      if (deleteId) {
        if (window.dbApi) {
          await window.dbApi.dbDeleteGalleryItem(deleteId);
        } else {
          await api("/api/admin/gallery/" + deleteId, { method: "DELETE" });
        }
        await loadDashboard();
        showStatus("Image removed.");
      }
      if (bookingId) {
        if (window.dbApi) {
          await window.dbApi.dbUpdateBookingStatus(bookingId, "confirmed");
        } else {
          await api("/api/admin/bookings/" + bookingId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "confirmed" }) });
        }
        await loadDashboard();
        showStatus("Booking marked confirmed.");
      }
      if (event.target.id === "logoutBtn") {
        if (window.dbApi) {
          await window.dbApi.dbLogout();
        } else {
          await api("/api/admin/logout", { method: "POST" });
        }
        dashboardView.hidden = true;
        loginView.hidden = false;
      }
    } catch (error) { showStatus(error.message, true); }
  });

  // Session check
  if (window.dbApi) {
    window.dbApi.dbCheckAuth(function (user) {
      if (user) {
        loadDashboard();
      } else {
        dashboardView.hidden = true;
        loginView.hidden = false;
      }
    });
  } else {
    api("/api/admin/me").then(function (me) {
      if (me.authenticated) {
        loadDashboard();
      } else {
        dashboardView.hidden = true;
        loginView.hidden = false;
      }
    }).catch(function () {});
  }
});

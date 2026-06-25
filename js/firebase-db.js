// Firebase and Fallback Client-Side Database Layer for Spice Haven Template

(function () {
  const DEFAULTS = {
    settings: {
      restaurantName: "Spice Haven",
      facebookUrl: "#",
      instagramUrl: "#",
      twitterUrl: "#",
      googleMapsEmbed: "",
      openingHours: "Mon-Sun: 12:00 PM - 10:30 PM"
    },
    images: {
      heroImage1: "images/hero.webp",
      heroImage1Secondary: "images/about-1.webp",
      heroImage2: "images/gallery-10.webp",
      heroImage2Secondary: "images/gallery-13.webp",
      aboutImage1: "images/about-1.webp",
      aboutImage2: "images/about-2.webp",
      reservationImage: "images/gallery-16.jpg",
      menuHeaderImage: "images/gallery-13.webp",
      galleryHeaderImage: "images/gallery-8.webp",
      contactHeaderImage: "images/about-2.webp"
    }
  };

  // Helper to detect if Firebase credentials are fully configured
  function isFirebaseConfigured() {
    const config = window.ENV && window.ENV.firebase;
    return !!(
      config &&
      config.apiKey &&
      !config.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
      config.projectId &&
      !config.projectId.includes("YOUR_FIREBASE_PROJECT_ID")
    );
  }

  const useFirebase = isFirebaseConfigured();
  let db = null;
  let auth = null;

  if (useFirebase) {
    console.log("Spice Haven: Initializing Firebase SDK backend...");
    try {
      firebase.initializeApp(window.ENV.firebase);
      db = firebase.firestore();
      auth = firebase.auth();
    } catch (e) {
      console.error("Failed to initialize Firebase SDK:", e);
    }
  } else {
    console.warn("Spice Haven: Firebase credentials not set or incomplete. Running in Client-Side Fallback Mode (using LocalStorage).");
  }

  // --- LOCAL FALLBACK HELPERS ---
  function getLocal(key, defaultValue) {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    try {
      return JSON.parse(val);
    } catch (e) {
      return defaultValue;
    }
  }

  function setLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Ensure initial fallback data exists
  if (!useFirebase) {
    if (!localStorage.getItem("spiceheaven_settings")) {
      setLocal("spiceheaven_settings", DEFAULTS.settings);
    }
    if (!localStorage.getItem("spiceheaven_images")) {
      setLocal("spiceheaven_images", DEFAULTS.images);
    }
    if (!localStorage.getItem("spiceheaven_bookings")) {
      setLocal("spiceheaven_bookings", []);
    }
    if (!localStorage.getItem("spiceheaven_gallery")) {
      setLocal("spiceheaven_gallery", []);
    }
    if (!localStorage.getItem("spiceheaven_admin_password")) {
      localStorage.setItem("spiceheaven_admin_password", "password");
    }
  }

  // --- INTERFACE EXPORTS ---
  const dbApi = {
    isFirebaseMode: function () {
      return useFirebase;
    },

    // 1. GET SETTINGS & IMAGES
    dbGetSettings: async function () {
      if (useFirebase) {
        try {
          const settingsDoc = await db.collection("config").doc("settings").get();
          const imagesDoc = await db.collection("config").doc("images").get();

          const settings = settingsDoc.exists ? settingsDoc.data() : DEFAULTS.settings;
          const images = imagesDoc.exists ? imagesDoc.data() : DEFAULTS.images;

          return { settings, images };
        } catch (e) {
          console.error("Error reading Firestore settings:", e);
          return { settings: DEFAULTS.settings, images: DEFAULTS.images };
        }
      } else {
        return {
          settings: getLocal("spiceheaven_settings", DEFAULTS.settings),
          images: getLocal("spiceheaven_images", DEFAULTS.images)
        };
      }
    },

    // 2. GET GALLERY ITEMS
    dbGetGallery: async function () {
      if (useFirebase) {
        try {
          const snapshot = await db.collection("gallery").orderBy("createdAt", "desc").get();
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          return items;
        } catch (e) {
          console.error("Error fetching Firestore gallery:", e);
          return [];
        }
      } else {
        return getLocal("spiceheaven_gallery", []);
      }
    },

    // 3. GET BOOKINGS
    dbGetBookings: async function () {
      if (useFirebase) {
        try {
          const snapshot = await db.collection("bookings").orderBy("createdAt", "desc").get();
          const bookings = [];
          snapshot.forEach(doc => {
            bookings.push({ id: doc.id, ...doc.data() });
          });
          return bookings;
        } catch (e) {
          console.error("Error fetching Firestore bookings:", e);
          return [];
        }
      } else {
        return getLocal("spiceheaven_bookings", []);
      }
    },

    // 4. ADD BOOKING
    dbAddBooking: async function (bookingData) {
      const booking = {
        name: bookingData.name,
        phone: bookingData.phone,
        email: bookingData.email || "",
        date: bookingData.date,
        time: bookingData.time,
        guests: bookingData.guests || "2",
        message: bookingData.message || "",
        status: "new",
        createdAt: new Date().toISOString()
      };

      if (useFirebase) {
        const docRef = await db.collection("bookings").add(booking);
        booking.id = docRef.id;
        return booking;
      } else {
        const list = getLocal("spiceheaven_bookings", []);
        booking.id = Date.now().toString(36);
        list.unshift(booking);
        setLocal("spiceheaven_bookings", list);
        return booking;
      }
    },

    // 5. UPDATE BOOKING STATUS
    dbUpdateBookingStatus: async function (bookingId, status) {
      if (useFirebase) {
        await db.collection("bookings").doc(bookingId).update({ status });
      } else {
        const list = getLocal("spiceheaven_bookings", []);
        const booking = list.find(b => b.id === bookingId);
        if (booking) {
          booking.status = status;
          setLocal("spiceheaven_bookings", list);
        }
      }
      return { ok: true };
    },

    // 6. UPDATE SETTINGS
    dbUpdateSettings: async function (newSettings) {
      if (useFirebase) {
        // Clean maps URL if needed
        const googleMapsEmbed = dbApi.normalizeMap(newSettings.googleMapsEmbed);
        const data = { ...newSettings, googleMapsEmbed };
        await db.collection("config").doc("settings").set(data, { merge: true });
      } else {
        const current = getLocal("spiceheaven_settings", DEFAULTS.settings);
        const googleMapsEmbed = dbApi.normalizeMap(newSettings.googleMapsEmbed);
        const updated = { ...current, ...newSettings, googleMapsEmbed };
        setLocal("spiceheaven_settings", updated);
      }
      return { ok: true };
    },

    // 7. UPDATE HOMEPAGE IMAGES
    dbUpdateImages: async function (newImages) {
      if (useFirebase) {
        await db.collection("config").doc("images").set(newImages, { merge: true });
      } else {
        const current = getLocal("spiceheaven_images", DEFAULTS.images);
        const updated = { ...current, ...newImages };
        setLocal("spiceheaven_images", updated);
      }
      return { ok: true };
    },

    // 8. ADD GALLERY ITEM
    dbAddGalleryItem: async function (title, type, imageUrl) {
      const item = {
        title: title || (type === "menu" ? "Menu Image" : "Dish Image"),
        type: type === "menu" ? "menu" : "item",
        imageUrl,
        createdAt: new Date().toISOString()
      };

      if (useFirebase) {
        const docRef = await db.collection("gallery").add(item);
        item.id = docRef.id;
        return item;
      } else {
        const list = getLocal("spiceheaven_gallery", []);
        item.id = Date.now().toString(36);
        list.unshift(item);
        setLocal("spiceheaven_gallery", list);
        return item;
      }
    },

    // 9. DELETE GALLERY ITEM
    dbDeleteGalleryItem: async function (itemId) {
      if (useFirebase) {
        await db.collection("gallery").doc(itemId).delete();
      } else {
        let list = getLocal("spiceheaven_gallery", []);
        list = list.filter(item => item.id !== itemId);
        setLocal("spiceheaven_gallery", list);
      }
      return { ok: true };
    },

    // 10. AUTH: LOGIN
    dbLogin: async function (usernameOrEmail, password) {
      if (useFirebase) {
        // Firebase Auth expects email. Let's auto-append domain if simple username is entered.
        let email = usernameOrEmail;
        if (!email.includes("@")) {
          email = email + "@spiceheaven.com";
        }
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Ensure database default configs exist once admin logs in
        await dbApi.ensureFirestoreInitialized();
        return userCredential.user;
      } else {
        const storedPassword = localStorage.getItem("spiceheaven_admin_password") || "password";
        const email = usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail;
        if (email === "admin" && password === storedPassword) {
          sessionStorage.setItem("spiceheaven_admin_auth", "true");
          return { email: "admin@spiceheaven.com", uid: "fallback-admin-id" };
        } else {
          throw new Error("Invalid admin username or password.");
        }
      }
    },

    // 11. AUTH: LOGOUT
    dbLogout: async function () {
      if (useFirebase) {
        await auth.signOut();
      } else {
        sessionStorage.removeItem("spiceheaven_admin_auth");
      }
      return { ok: true };
    },

    // 12. AUTH: CHECK ACTIVE SESSION
    dbCheckAuth: function (callback) {
      if (useFirebase) {
        auth.onAuthStateChanged(function (user) {
          callback(user);
        });
      } else {
        const isAuthed = sessionStorage.getItem("spiceheaven_admin_auth") === "true";
        setTimeout(() => {
          callback(isAuthed ? { email: "admin@spiceheaven.com", uid: "fallback-admin-id" } : null);
        }, 50);
      }
    },

    // 13. AUTH: CHANGE PASSWORD
    dbChangePassword: async function (currentPassword, newPassword) {
      if (useFirebase) {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user found.");
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
      } else {
        const storedPassword = localStorage.getItem("spiceheaven_admin_password") || "password";
        if (currentPassword !== storedPassword) {
          throw new Error("Current password is incorrect.");
        }
        localStorage.setItem("spiceheaven_admin_password", newPassword);
      }
      return { ok: true };
    },

    // 14. HELPER: CLOUDINARY CLIENT UPLOAD
    dbUploadImage: async function (file) {
      const cloudName = window.ENV && window.ENV.cloudinary && window.ENV.cloudinary.cloudName;
      const uploadPreset = window.ENV && window.ENV.cloudinary && window.ENV.cloudinary.uploadPreset;

      const isCloudinaryConfigured = cloudName && !cloudName.includes("YOUR_CLOUDINARY_CLOUD_NAME") &&
                                     uploadPreset && !uploadPreset.includes("YOUR_CLOUDINARY_UPLOAD_PRESET");

      if (isCloudinaryConfigured) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Cloudinary upload failed");
        }
        const data = await res.json();
        return data.secure_url;
      } else {
        // Fallback: convert file to Base64 dataURL for client-side persistence preview
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (e) => reject(new Error("File reading failed"));
          reader.readAsDataURL(file);
        });
      }
    },

    normalizeMap: function (input) {
      const value = String(input || "").trim();
      const srcMatch = value.match(/src=["']([^"']+)["']/i);
      return srcMatch ? srcMatch[1] : value;
    },

    // Helper to auto-create Firestore default docs if they don't exist
    ensureFirestoreInitialized: async function () {
      if (!useFirebase) return;
      try {
        const settingsRef = db.collection("config").doc("settings");
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
          await settingsRef.set(DEFAULTS.settings);
        }

        const imagesRef = db.collection("config").doc("images");
        const imagesDoc = await imagesRef.get();
        if (!imagesDoc.exists) {
          await imagesRef.set(DEFAULTS.images);
        }
      } catch (e) {
        console.warn("Failed to auto-initialize defaults in Firestore (might be due to permission rules):", e);
      }
    }
  };

  window.dbApi = dbApi;
})();

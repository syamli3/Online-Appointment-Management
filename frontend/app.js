// Point this at wherever the FastAPI backend is running.
// If you serve the frontend from the same FastAPI app (see README), "" works fine.
const API_BASE = "";

let doctorsCache = [];

/* ---------------- Navigation between views ---------------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");

function showView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (name === "appointments") loadAppointments();
  if (name === "doctors") loadDoctors();
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

/* ---------------- Toast helper ---------------- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

/* ---------------- Doctors list ---------------- */
async function loadDoctors() {
  const grid = document.getElementById("doctors-grid");
  try {
    const res = await fetch(`${API_BASE}/api/doctors`);
    if (!res.ok) throw new Error("Failed to fetch doctors");
    doctorsCache = await res.json();

    if (doctorsCache.length === 0) {
      grid.innerHTML = `<p class="empty-state">No doctors available right now.</p>`;
      return;
    }

    grid.innerHTML = doctorsCache
      .map(
        (doc) => `
        <div class="doctor-card">
          <span class="spec-tag">${escapeHtml(doc.specialization)}</span>
          <h3>${escapeHtml(doc.name)}</h3>
          <p class="fee">Consultation fee: <strong>₹${doc.consultation_fee}</strong></p>
          <button class="book-link" data-doctor-id="${doc.id}">Book with this doctor →</button>
        </div>`
      )
      .join("");

    grid.querySelectorAll(".book-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        populateDoctorSelect();
        document.getElementById("doctor-select").value = btn.dataset.doctorId;
        updateFeePreview();
        showView("book");
      });
    });

    populateDoctorSelect();
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Couldn't load doctors. Is the backend running? (${err.message})</p>`;
  }
}

function populateDoctorSelect() {
  const select = document.getElementById("doctor-select");
  const current = select.value;
  select.innerHTML =
    `<option value="" disabled ${current ? "" : "selected"}>Select a doctor</option>` +
    doctorsCache
      .map((doc) => `<option value="${doc.id}">${escapeHtml(doc.name)} — ${escapeHtml(doc.specialization)}</option>`)
      .join("");
  if (current) select.value = current;
}

function updateFeePreview() {
  const select = document.getElementById("doctor-select");
  const preview = document.getElementById("fee-preview");
  const doc = doctorsCache.find((d) => String(d.id) === select.value);
  if (doc) {
    document.getElementById("fee-amount").textContent = `₹${doc.consultation_fee}`;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
}

/* ---------------- Booking form ---------------- */
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("appt-date");
dateInput.min = new Date().toISOString().split("T")[0]; // no past dates in the picker

document.getElementById("doctor-select").addEventListener("change", updateFeePreview);

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

function validateForm(data) {
  const errors = {};

  const name = data.patient_name.trim();
  if (name.length < 2) {
    errors.patientName = "Please enter the patient's full name.";
  } else if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
    errors.patientName = "Name should only contain letters and spaces.";
  }

  if (!data.doctor_id) {
    errors.doctor = "Please select a doctor.";
  }

  if (!data.appointment_date) {
    errors.date = "Please pick a date.";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(data.appointment_date + "T00:00:00");
    if (picked < today) errors.date = "Date can't be in the past.";
  }

  if (!data.appointment_time) {
    errors.time = "Please pick a time.";
  }

  return errors;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const data = {
    patient_name: document.getElementById("patient-name").value,
    doctor_id: document.getElementById("doctor-select").value,
    appointment_date: document.getElementById("appt-date").value,
    appointment_time: document.getElementById("appt-time").value,
  };

  const errors = validateForm(data);
  if (Object.keys(errors).length > 0) {
    if (errors.patientName) document.getElementById("err-patient-name").textContent = errors.patientName;
    if (errors.doctor) document.getElementById("err-doctor").textContent = errors.doctor;
    if (errors.date) document.getElementById("err-date").textContent = errors.date;
    if (errors.time) document.getElementById("err-time").textContent = errors.time;
    return;
  }

  const submitBtn = document.getElementById("submit-btn");
  const status = document.getElementById("form-status");
  submitBtn.disabled = true;
  status.textContent = "";
  status.className = "form-status";

  try {
    const res = await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_name: data.patient_name.trim(),
        doctor_id: Number(data.doctor_id),
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      const message = Array.isArray(body.detail)
        ? body.detail.map((d) => d.msg).join(", ")
        : body.detail || "Something went wrong.";
      throw new Error(message);
    }

    status.textContent = "Appointment confirmed!";
    status.classList.add("success");
    showToast(`Booked with ${body.doctor.name} on ${body.appointment_date} at ${body.appointment_time}`);
    form.reset();
    document.getElementById("fee-preview").classList.add("hidden");
    setTimeout(() => showView("appointments"), 700);
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------------- Appointments list ---------------- */
async function loadAppointments() {
  const list = document.getElementById("appointments-list");
  try {
    const res = await fetch(`${API_BASE}/api/appointments`);
    if (!res.ok) throw new Error("Failed to fetch appointments");
    const appointments = await res.json();

    if (appointments.length === 0) {
      list.innerHTML = `<p class="empty-state">No appointments booked yet. Head to "Book Appointment" to reserve a slot.</p>`;
      return;
    }

    list.innerHTML = appointments
      .map(
        (a) => `
        <div class="stub" data-id="${a.id}">
          <div class="stub-main">
            <span class="stub-patient">${escapeHtml(a.patient_name)}</span>
            <span class="stub-doctor">${escapeHtml(a.doctor.name)} · ${escapeHtml(a.doctor.specialization)}</span>
            <span class="stub-datetime">${a.appointment_date} · ${a.appointment_time}</span>
          </div>
          <div class="stub-perf"></div>
          <div class="stub-side">
            <span class="stamp-mark">CONFIRMED</span>
            <button class="cancel-link" data-id="${a.id}">Cancel</button>
          </div>
        </div>`
      )
      .join("");

    list.querySelectorAll(".cancel-link").forEach((btn) => {
      btn.addEventListener("click", () => cancelAppointment(btn.dataset.id));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Couldn't load appointments. (${err.message})</p>`;
  }
}

async function cancelAppointment(id) {
  try {
    const res = await fetch(`${API_BASE}/api/appointments/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to cancel");
    showToast("Appointment cancelled.");
    loadAppointments();
  } catch (err) {
    showToast(`Couldn't cancel: ${err.message}`);
  }
}

/* ---------------- Utilities ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Init ---------------- */
loadDoctors();

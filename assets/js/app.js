(function () {
  "use strict";

  const STORAGE_KEY = "pulseFitnessMembers";
  const PAYMENT_STORAGE_KEY = "pulseFitnessPayments";
  const CONTACT_EMAIL = "hello@pulsefitness.example";
  const PLAN_MONTHS = { Monthly: 1, Quarterly: 3, Yearly: 12 };
  const PLAN_PRICES = { Monthly: 49, Quarterly: 129, Yearly: 449 };
  const sampleMembers = [
    { id: "sample-1", name: "Olivia Bennett", email: "olivia.bennett@example.com", phone: "+1 415 555 0138", plan: "Yearly", joinDate: "2026-03-12" },
    { id: "sample-2", name: "Ethan Carter", email: "ethan.carter@example.com", phone: "+1 415 555 0174", plan: "Quarterly", joinDate: "2026-09-22" },
    { id: "sample-3", name: "Sophia Ramirez", email: "sophia.ramirez@example.com", phone: "+1 415 555 0191", plan: "Monthly", joinDate: "2026-08-05" }
  ];

  const $ = (selector) => document.querySelector(selector);
  const membersBody = $("#membersTableBody");
  const recentBody = $("#recentMembersBody");
  const form = $("#memberForm");
  const modalElement = $("#memberModal");
  const memberModal = new bootstrap.Modal(modalElement);
  const paymentModal = new bootstrap.Modal($("#paymentModal"));
  let noticeTimer;
  let activityRange = 30;
  let members = loadMembers();
  let payments = loadPayments();
  let newMemberPaymentId = "";

  function loadMembers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleMembers));
        return [...sampleMembers];
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Member data must be a list.");
      return parsed;
    } catch (error) {
      console.error("Could not access saved gym members.", error);
      showNotice("Browser storage could not be read. Check storage permissions or the saved member data.", true);
      return [];
    }
  }

  function saveMembers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
      return true;
    } catch (error) {
      console.error("Could not save gym members.", error);
      showNotice("Your changes could not be saved in this browser. Check storage permissions and available space.", true);
      return false;
    }
  }

  function loadPayments() {
    try {
      const saved = localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (saved === null) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Payment data must be a list.");
      return parsed;
    } catch (error) {
      console.error("Could not access saved gym payments.", error);
      showNotice("Payment history could not be read. Check browser storage or saved payment data.", true);
      return [];
    }
  }

  function savePayments() {
    try {
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
      return true;
    } catch (error) {
      console.error("Could not save gym payments.", error);
      showNotice("Payment could not be saved in this browser. Check storage permissions and available space.", true);
      return false;
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount) || 0);
  }

  function todayInputValue() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  function dateFromInput(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function membershipEndDate(member) {
    const joined = dateFromInput(member.joinDate);
    const months = PLAN_MONTHS[member.plan];
    if (!months || Number.isNaN(joined.getTime())) return null;
    const targetMonth = joined.getMonth() + months;
    const lastDay = new Date(joined.getFullYear(), targetMonth + 1, 0).getDate();
    return new Date(joined.getFullYear(), targetMonth, Math.min(joined.getDate(), lastDay));
  }

  function getStatus(member) {
    const endDate = membershipEndDate(member);
    if (!endDate) return "Expired";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate >= today ? "Active" : "Expired";
  }

  function formatDate(value) {
    const date = dateFromInput(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
  }

  function memberCell(member, index) {
    return `<div class="member-cell"><div class="member-avatar tone-${index % 5}">${escapeHtml(initials(member.name))}</div><div><div class="member-name">${escapeHtml(member.name)}</div><div class="member-email">${escapeHtml(member.email)}</div></div></div>`;
  }

  function statusBadge(member) {
    const status = getStatus(member);
    return `<span class="status-badge ${status === "Active" ? "status-active" : "status-expired"}">${status}</span>`;
  }

  function renderMembers() {
    const query = $("#memberSearch").value.trim().toLowerCase();
    const selectedPlan = $("#memberPlanFilter").value;
    const sorted = [...members].sort((a, b) => b.joinDate.localeCompare(a.joinDate));
    const filtered = sorted.filter((member) =>
      (!selectedPlan || member.plan === selectedPlan) &&
      [member.name, member.email, member.phone].some((value) => value.toLowerCase().includes(query))
    );

    membersBody.innerHTML = filtered.map((member, index) => `
      <tr>
        <td>${memberCell(member, index)}</td>
        <td>${escapeHtml(member.phone)}</td>
        <td><span class="plan-name">${escapeHtml(member.plan)}</span></td>
        <td>${formatDate(member.joinDate)}</td>
        <td>${statusBadge(member)}</td>
        <td><div class="action-buttons">
          <button class="action-button" type="button" data-edit-member="${escapeHtml(member.id)}" aria-label="Edit ${escapeHtml(member.name)}"><i class="bi bi-pencil"></i></button>
          <button class="action-button delete" type="button" data-delete-member="${escapeHtml(member.id)}" aria-label="Delete ${escapeHtml(member.name)}"><i class="bi bi-trash3"></i></button>
        </div></td>
      </tr>`).join("");

    $("#membersEmpty").classList.toggle("d-none", filtered.length > 0);
    $("#membersTableBody").closest(".table-responsive").classList.toggle("d-none", filtered.length === 0);
    $("#membersTotalPill").textContent = String(members.length);
    $("#memberNavCount").textContent = String(members.length);

    const recent = sorted.slice(0, 5);
    recentBody.innerHTML = recent.map((member, index) => `
      <tr><td>${memberCell(member, index)}</td><td><span class="plan-name">${escapeHtml(member.plan)}</span></td><td>${formatDate(member.joinDate)}</td><td>${statusBadge(member)}</td></tr>`).join("");
    $("#recentEmpty").classList.toggle("d-none", recent.length > 0);
    $("#recentMembersBody").closest(".table-responsive").classList.toggle("d-none", recent.length === 0);

    $("#totalMembers").textContent = String(members.length);
    $("#activeMembers").textContent = String(members.filter((member) => getStatus(member) === "Active").length);
    $("#expiredMembers").textContent = String(members.filter((member) => getStatus(member) === "Expired").length);
    renderDashboardInsights();
    renderPaymentViews();
  }

  function renderActivityChart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - activityRange + 1);
    let bins;

    if (activityRange === 7) {
      bins = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return { label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date), start: date, end: date };
      });
    } else {
      const binCount = activityRange === 30 ? 5 : 3;
      const daysPerBin = activityRange / binCount;
      bins = Array.from({ length: binCount }, (_, index) => {
        const binStart = new Date(start);
        binStart.setDate(start.getDate() + Math.floor(index * daysPerBin));
        const binEnd = new Date(start);
        binEnd.setDate(start.getDate() + Math.floor((index + 1) * daysPerBin) - 1);
        return {
          label: activityRange === 30
            ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(binStart)
            : new Intl.DateTimeFormat("en", { month: "short" }).format(binStart),
          start: binStart,
          end: binEnd
        };
      });
    }

    const counts = bins.map((bin) => members.filter((member) => {
      const joined = dateFromInput(member.joinDate);
      joined.setHours(0, 0, 0, 0);
      return joined >= bin.start && joined <= bin.end && joined <= today;
    }).length);
    const maxCount = Math.max(...counts, 1);
    const total = counts.reduce((sum, count) => sum + count, 0);

    $("#activityTotal").textContent = String(total);
    $("#activityChart").innerHTML = bins.map((bin, index) => {
      const count = counts[index];
      const height = count ? Math.max(12, Math.round((count / maxCount) * 100)) : 3;
      return `<div class="chart-column" title="${escapeHtml(bin.label)}: ${count} ${count === 1 ? "member" : "members"}"><div class="chart-bar-track"><div class="chart-bar" style="height:${height}%" aria-hidden="true"></div></div><span class="chart-label">${escapeHtml(bin.label)}</span></div>`;
    }).join("");
    $("#activityChart").setAttribute("aria-label", `${total} members joined in the last ${activityRange} days`);
  }

  function renderPlanMix() {
    const plans = [
      { name: "Monthly", color: "blue" },
      { name: "Quarterly", color: "purple" },
      { name: "Yearly", color: "orange" }
    ];
    const counts = plans.map((plan) => members.filter((member) => member.plan === plan.name).length);
    const total = members.length;
    let angle = 0;
    const segments = plans.map((plan, index) => {
      const start = angle;
      angle += total ? counts[index] / total * 360 : 0;
      return `${plan.color === "blue" ? "#4c80e8" : plan.color === "purple" ? "#9375d6" : "#e6a14a"} ${start}deg ${angle}deg`;
    });

    $("#mixTotal").textContent = String(total);
    $("#mixChart").classList.toggle("is-empty", total === 0);
    $("#mixChart").style.background = total ? `conic-gradient(${segments.join(", ")})` : "";
    $("#mixLegend").innerHTML = plans.map((plan, index) => `
      <button class="mix-legend-button" type="button" data-filter-plan="${plan.name}" aria-label="Show ${counts[index]} ${plan.name} members">
        <span class="legend-dot legend-${plan.color}"></span><span>${plan.name}</span><strong>${counts[index]}</strong>
      </button>`).join("");
  }

  function renderRenewals() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = members.map((member) => {
      const endDate = membershipEndDate(member);
      if (!endDate) return null;
      endDate.setHours(0, 0, 0, 0);
      const daysRemaining = Math.round((endDate - today) / 86400000);
      return daysRemaining >= 0 && daysRemaining <= 30 ? { member, endDate, daysRemaining } : null;
    }).filter(Boolean).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 4);

    $("#renewalList").innerHTML = upcoming.map(({ member, endDate, daysRemaining }) => {
      const dueText = daysRemaining === 0 ? "Due today" : daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`;
      return `<article class="renewal-item">
        <div class="renewal-avatar">${escapeHtml(initials(member.name))}</div>
        <div class="renewal-details"><strong>${escapeHtml(member.name)}</strong><span>${escapeHtml(member.plan)} · renews ${formatDate(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`)}</span></div>
        <span class="renewal-days">${dueText}</span>
        <button class="renewal-edit" type="button" data-edit-member="${escapeHtml(member.id)}" aria-label="Edit ${escapeHtml(member.name)}"><i class="bi bi-pencil"></i></button>
      </article>`;
    }).join("");
    $("#renewalsEmpty").classList.toggle("d-none", upcoming.length > 0);
    $("#renewalList").classList.toggle("d-none", upcoming.length === 0);
  }

  function renderDashboardInsights() {
    const activeCount = members.filter((member) => getStatus(member) === "Active").length;
    const activeRate = members.length ? Math.round(activeCount / members.length * 100) : 0;
    $("#heroActiveRate").textContent = `${activeRate}%`;
    renderActivityChart();
    renderPlanMix();
    renderRenewals();
  }

  function renderPaymentViews() {
    const query = $("#paymentSearch").value.trim().toLowerCase();
    const statusFilter = $("#paymentStatusFilter").value;
    const sortedPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date));
    const filteredPayments = sortedPayments.filter((payment) =>
      (!statusFilter || payment.status === statusFilter) &&
      [payment.memberName, payment.memberEmail, payment.plan, payment.method, payment.id]
        .some((value) => String(value).toLowerCase().includes(query))
    );
    const paidPayments = payments.filter((payment) => payment.status === "Paid");
    const pendingPayments = payments.filter((payment) => payment.status === "Pending");
    const collected = paidPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    const pendingTotal = pendingPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    const monthKey = todayInputValue().slice(0, 7);
    const monthCollected = paidPayments
      .filter((payment) => payment.date.startsWith(monthKey))
      .reduce((total, payment) => total + Number(payment.amount), 0);

    $("#paymentsCollected").textContent = formatCurrency(collected);
    $("#paymentsThisMonth").textContent = formatCurrency(monthCollected);
    $("#paymentsPending").textContent = formatCurrency(pendingTotal);
    $("#paymentsCount").textContent = String(payments.length);
    $("#pendingNavCount").textContent = String(pendingPayments.length);
    $("#totalRevenue").textContent = formatCurrency(collected);
    $("#pendingPaymentsNote").textContent = pendingPayments.length
      ? `${pendingPayments.length} payment${pendingPayments.length === 1 ? "" : "s"} awaiting collection`
      : "No pending payments";

    $("#paymentsTableBody").innerHTML = filteredPayments.map((payment) => `
      <tr>
        <td><div class="payment-member"><span class="payment-avatar">${escapeHtml(initials(payment.memberName))}</span><div><strong>${escapeHtml(payment.memberName)}</strong><small>${escapeHtml(payment.memberEmail)}</small></div></div></td>
        <td><span class="plan-name">${escapeHtml(payment.plan)}</span></td>
        <td>${formatDate(payment.date)}</td>
        <td>${escapeHtml(payment.method)}</td>
        <td><span class="payment-status ${payment.status === "Paid" ? "payment-paid" : "payment-pending"}">${escapeHtml(payment.status)}</span></td>
        <td class="text-end payment-amount-cell">${formatCurrency(payment.amount)}</td>
        <td><div class="action-buttons">
          ${payment.status === "Pending" ? `<button class="action-button" type="button" data-mark-paid="${escapeHtml(payment.id)}" aria-label="Mark payment paid"><i class="bi bi-check2-circle"></i></button>` : ""}
          <button class="action-button delete" type="button" data-delete-payment="${escapeHtml(payment.id)}" aria-label="Delete payment"><i class="bi bi-trash3"></i></button>
        </div></td>
      </tr>`).join("");
    $("#paymentsEmpty").classList.toggle("d-none", filteredPayments.length > 0);
    $("#paymentsTableBody").closest(".table-responsive").classList.toggle("d-none", filteredPayments.length === 0);

    $("#reportMemberCount").textContent = String(members.length);
    $("#reportActiveCount").textContent = String(members.filter((member) => getStatus(member) === "Active").length);
    $("#reportRevenue").textContent = formatCurrency(collected);
    $("#reportPendingCount").textContent = String(pendingPayments.length);
    const plans = ["Monthly", "Quarterly", "Yearly"];
    const planColors = { Monthly: "plan-bar-monthly", Quarterly: "plan-bar-quarterly", Yearly: "plan-bar-yearly" };
    $("#reportPlanRows").innerHTML = plans.map((plan) => {
      const count = members.filter((member) => member.plan === plan).length;
      const percentage = members.length ? Math.round(count / members.length * 100) : 0;
      return `<div class="report-plan-row"><div class="report-plan-label"><span>${plan}</span><strong>${count} <small>member${count === 1 ? "" : "s"}</small></strong></div><div class="report-plan-track"><span class="${planColors[plan]}" style="width:${percentage}%"></span></div></div>`;
    }).join("");
  }

  function openPaymentModal(memberId) {
    if (!members.length) {
      setView("members");
      showNotice("Add a member before recording a payment.", true);
      return;
    }

    const select = $("#paymentMember");
    select.innerHTML = `<option value="" disabled>Select a member</option>${members
      .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} — ${escapeHtml(member.plan)}</option>`)
      .join("")}`;
    select.value = memberId || "";
    $("#paymentForm").reset();
    $("#paymentForm").classList.remove("was-validated");
    if (memberId) select.value = memberId;
    $("#paymentDate").value = todayInputValue();
    $("#paymentStatus").value = "Paid";
    updatePaymentAmount();
    paymentModal.show();
  }

  function updatePaymentAmount() {
    const selectedMember = members.find((member) => member.id === $("#paymentMember").value);
    $("#paymentAmount").value = selectedMember ? (PLAN_PRICES[selectedMember.plan] || 0).toFixed(2) : "";
  }

  function savePayment(event) {
    event.preventDefault();
    const paymentForm = event.currentTarget;
    paymentForm.classList.add("was-validated");
    if (!paymentForm.checkValidity()) return;

    const member = members.find((item) => item.id === $("#paymentMember").value);
    const amount = Math.round(Number($("#paymentAmount").value) * 100) / 100;
    if (!member || !Number.isFinite(amount) || amount <= 0) {
      showNotice("Choose a member and enter a valid payment amount.", true);
      return;
    }

    const payment = {
      id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : `payment-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      plan: member.plan,
      amount,
      method: $("#paymentMethod").value,
      status: $("#paymentStatus").value,
      date: $("#paymentDate").value
    };
    const previousPayments = payments;
    payments = [...payments, payment];
    if (!savePayments()) {
      payments = previousPayments;
      return;
    }

    paymentModal.hide();
    renderMembers();
    showNotice(payment.status === "Paid" ? `${formatCurrency(amount)} payment recorded.` : `${formatCurrency(amount)} payment marked as pending.`);
  }

  function markPaymentPaid(id) {
    const payment = payments.find((item) => item.id === id);
    if (!payment || payment.status !== "Pending") return;
    const previousPayments = payments;
    payments = payments.map((item) => item.id === id ? { ...item, status: "Paid", date: todayInputValue() } : item);
    if (!savePayments()) {
      payments = previousPayments;
      return;
    }
    renderMembers();
    showNotice(`${formatCurrency(payment.amount)} payment marked as paid.`);
  }

  function deletePayment(id) {
    const payment = payments.find((item) => item.id === id);
    if (!payment || !window.confirm(`Delete the ${formatCurrency(payment.amount)} payment record for ${payment.memberName}?`)) return;
    const previousPayments = payments;
    payments = payments.filter((item) => item.id !== id);
    if (!savePayments()) {
      payments = previousPayments;
      return;
    }
    renderMembers();
    showNotice("Payment record deleted.");
  }

  function exportCsv(filename, headers, rows) {
    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function showNotice(message, isError) {
    const notice = $("#appNotice");
    notice.textContent = message;
    notice.classList.toggle("error", Boolean(isError));
    notice.classList.add("show");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.remove("show"), 4000);
  }

  function resetFormValidation() {
    form.classList.remove("was-validated");
    form.querySelectorAll(".is-invalid").forEach((input) => input.classList.remove("is-invalid"));
    $("#memberName").setCustomValidity("");
    $("#memberEmail").setCustomValidity("");
  }

  function openAddModal(plan) {
    form.reset();
    resetFormValidation();
    $("#memberId").value = "";
    $("#memberModalTitle").textContent = "Add new member";
    const today = new Date();
    $("#memberJoinDate").value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    $("#memberPlan").value = plan || "Monthly";
    $("#emailFeedback").textContent = "Enter a valid email address.";
    memberModal.show();
    window.setTimeout(() => $("#memberName").focus(), 250);
  }

  function openEditModal(id) {
    const member = members.find((item) => item.id === id);
    if (!member) return;
    form.reset();
    resetFormValidation();
    $("#memberId").value = member.id;
    $("#memberName").value = member.name;
    $("#memberEmail").value = member.email;
    $("#memberPhone").value = member.phone;
    $("#memberPlan").value = member.plan;
    $("#memberJoinDate").value = member.joinDate;
    $("#memberModalTitle").textContent = "Edit member";
    $("#emailFeedback").textContent = "Enter a valid email address.";
    memberModal.show();
  }

  function handleSubmit(event) {
    event.preventDefault();
    $("#memberName").setCustomValidity($("#memberName").value.trim() ? "" : "Enter the member's full name.");
    form.classList.add("was-validated");
    if (!form.checkValidity()) return;

    const id = $("#memberId").value;
    const email = $("#memberEmail").value.trim().toLowerCase();
    const duplicate = members.some((member) => member.email.toLowerCase() === email && member.id !== id);
    if (duplicate) {
      $("#memberEmail").setCustomValidity("This email is already registered.");
      $("#emailFeedback").textContent = "A member with this email address already exists.";
      $("#memberEmail").classList.add("is-invalid");
      $("#memberEmail").focus();
      return;
    }
    $("#memberEmail").setCustomValidity("");

    const isNewMember = !id;
    const member = {
      id: id || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `member-${Date.now()}`),
      name: $("#memberName").value.trim(),
      email,
      phone: $("#memberPhone").value.trim(),
      plan: $("#memberPlan").value,
      joinDate: $("#memberJoinDate").value
    };
    const previousMembers = members;
    members = id ? members.map((item) => item.id === id ? member : item) : [...members, member];
    if (!saveMembers()) {
      members = previousMembers;
      return;
    }

    memberModal.hide();
    renderMembers();
    showNotice(id ? "Member details updated successfully." : "New member added successfully.");
    if (isNewMember) {
      newMemberPaymentId = member.id;
      modalElement.addEventListener("hidden.bs.modal", () => {
        const savedMemberId = newMemberPaymentId;
        newMemberPaymentId = "";
        if (savedMemberId) openPaymentModal(savedMemberId);
      }, { once: true });
    }
  }

  function deleteMember(id) {
    const member = members.find((item) => item.id === id);
    if (!member || !window.confirm(`Delete ${member.name} from your member records? This cannot be undone.`)) return;
    const previousMembers = members;
    members = members.filter((item) => item.id !== id);
    if (!saveMembers()) {
      members = previousMembers;
      return;
    }
    renderMembers();
    showNotice(`${member.name} was removed from your members.`);
  }

  function setView(view) {
    const validViews = ["home", "dashboard", "members", "plans", "payments", "reports", "contact"];
    if (!validViews.includes(view)) view = "home";
    validViews.forEach((name) => {
      $(`#${name}View`).classList.toggle("d-none", name !== view);
    });
    document.querySelectorAll("[data-view]").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });
    const labels = { home: "Home", dashboard: "Dashboard", members: "Members", plans: "Membership plans", payments: "Payments", reports: "Reports", contact: "Contact" };
    $("#breadcrumbCurrent").textContent = labels[view];
    document.title = `${labels[view]} | Pulse Fitness`;
    if (window.location.hash !== `#${view}`) window.location.hash = view;
    closeSidebar();
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("is-open");
    $("#sidebarOverlay").classList.remove("is-visible");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (event) => {
    const rangeButton = event.target.closest("[data-activity-range]");
    if (rangeButton) {
      activityRange = Number(rangeButton.dataset.activityRange);
      document.querySelectorAll("[data-activity-range]").forEach((button) => {
        button.classList.toggle("active", button === rangeButton);
      });
      renderActivityChart();
      return;
    }
    const planFilterButton = event.target.closest("[data-filter-plan]");
    if (planFilterButton) {
      $("#memberPlanFilter").value = planFilterButton.dataset.filterPlan;
      $("#memberSearch").value = "";
      renderMembers();
      setView("members");
      return;
    }
    const addButton = event.target.closest("[data-add-member]");
    if (addButton) {
      openAddModal(addButton.dataset.plan);
      return;
    }
    const navLink = event.target.closest("[data-view]");
    if (navLink) {
      event.preventDefault();
      setView(navLink.dataset.view);
      return;
    }
    const viewLink = event.target.closest("[data-view-link]");
    if (viewLink) {
      setView(viewLink.dataset.viewLink);
      return;
    }
    const editButton = event.target.closest("[data-edit-member]");
    if (editButton) {
      openEditModal(editButton.dataset.editMember);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-member]");
    if (deleteButton) {
      deleteMember(deleteButton.dataset.deleteMember);
      return;
    }
    const markPaidButton = event.target.closest("[data-mark-paid]");
    if (markPaidButton) {
      markPaymentPaid(markPaidButton.dataset.markPaid);
      return;
    }
    const deletePaymentButton = event.target.closest("[data-delete-payment]");
    if (deletePaymentButton) deletePayment(deletePaymentButton.dataset.deletePayment);
  });

  form.addEventListener("submit", handleSubmit);
  $("#paymentForm").addEventListener("submit", savePayment);
  $("#paymentMember").addEventListener("change", updatePaymentAmount);
  $("#recordPaymentButton").addEventListener("click", () => openPaymentModal());
  $("#paymentSearch").addEventListener("input", renderPaymentViews);
  $("#paymentStatusFilter").addEventListener("change", renderPaymentViews);
  $("#exportMembersButton").addEventListener("click", () => {
    exportCsv("pulse-fitness-members.csv",
      ["Name", "Email", "Phone", "Plan", "Join date", "Membership status"],
      members.map((member) => [member.name, member.email, member.phone, member.plan, member.joinDate, getStatus(member)]));
    showNotice(`${members.length} member records exported.`);
  });
  $("#exportPaymentsButton").addEventListener("click", () => {
    exportCsv("pulse-fitness-payments.csv",
      ["Member", "Email", "Plan", "Amount (USD)", "Method", "Status", "Date", "Payment ID"],
      payments.map((payment) => [payment.memberName, payment.memberEmail, payment.plan, payment.amount, payment.method, payment.status, payment.date, payment.id]));
    showNotice(`${payments.length} payment records exported.`);
  });
  $("#memberEmail").addEventListener("input", () => {
    $("#memberEmail").setCustomValidity("");
    $("#emailFeedback").textContent = "Enter a valid email address.";
  });
  $("#memberName").addEventListener("input", () => $("#memberName").setCustomValidity(""));
  $("#memberSearch").addEventListener("input", renderMembers);
  $("#memberPlanFilter").addEventListener("change", renderMembers);
  $("#contactForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const contactForm = event.currentTarget;
    $("#contactName").setCustomValidity($("#contactName").value.trim() ? "" : "Please enter your name.");
    $("#contactMessage").setCustomValidity($("#contactMessage").value.trim() ? "" : "Please write a short message.");
    contactForm.classList.add("was-validated");
    if (!contactForm.checkValidity()) return;

    const subject = `${$("#contactTopic").value} — ${$("#contactName").value.trim()}`;
    const body = [
      `Name: ${$("#contactName").value.trim()}`,
      `Reply to: ${$("#contactEmail").value.trim()}`,
      "",
      $("#contactMessage").value.trim()
    ].join("\n");
    const emailLink = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showNotice("Your email draft is ready. Send it from your email app.");
    window.location.href = emailLink;
  });
  $("#contactName").addEventListener("input", () => $("#contactName").setCustomValidity(""));
  $("#contactMessage").addEventListener("input", () => $("#contactMessage").setCustomValidity(""));
  $("#menuToggle").addEventListener("click", () => {
    const isOpen = $("#sidebar").classList.toggle("is-open");
    $("#sidebarOverlay").classList.toggle("is-visible", isOpen);
    $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
  });
  $("#sidebarOverlay").addEventListener("click", closeSidebar);
  window.addEventListener("hashchange", () => setView(window.location.hash.slice(1) || "home"));
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setView("members");
      $("#memberSearch").focus();
    }
  });

  document.querySelectorAll(".tilt-card, .stat-card, .plan-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty("--tilt-x", `${(y * -4).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });

  $("#todayLabel").textContent = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
  renderMembers();
  setView(window.location.hash.slice(1) || "home");
})();

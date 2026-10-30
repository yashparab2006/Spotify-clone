/**
 * Spotify Clone - Explore Premium Page Module
 * Plans, FAQ accordions, billing toggles, feature comparison & subscription modal
 */

export const premiumPlans = [
    {
        id: "individual",
        name: "Individual",
        badge: "Free for 1 month",
        priceMonthly: 10.99,
        priceAnnual: 99.99,
        accounts: "1 Premium account",
        desc: "For one person who wants ad-free music, on-demand playback, and offline downloads anywhere.",
        perks: [
            "1 verified Premium account",
            "Listen ad-free without interruptions",
            "Download up to 10,000 songs for offline play",
            "Play songs in any order on any device",
            "High-fidelity audio streaming (320 kbps)",
            "Cancel online anytime with 1 click"
        ],
        buttonText: "Try 1 Month Free",
        popular: false
    },
    {
        id: "duo",
        name: "Duo",
        badge: "Most Popular",
        priceMonthly: 14.99,
        priceAnnual: 139.99,
        accounts: "2 Premium accounts",
        desc: "For couples or roommates living under the same roof. 2 separate accounts, 1 discounted bill.",
        perks: [
            "2 separate, independent Premium accounts",
            "Duo Mix: an auto-updated shared playlist",
            "Ad-free music listening on all devices",
            "Offline playback for both members",
            "High audio quality on phone, desktop & TV",
            "Separate saved songs, playlists & recommendations"
        ],
        buttonText: "Get Premium Duo",
        popular: true
    },
    {
        id: "family",
        name: "Family",
        badge: "Best Value",
        priceMonthly: 16.99,
        priceAnnual: 159.99,
        accounts: "Up to 6 accounts",
        desc: "For up to 6 family members living together. Includes Spotify Kids and explicit content controls.",
        perks: [
            "6 separate individual Premium accounts",
            "Family Mix: shared playlist updated with favorites",
            "Block explicit music for younger listeners",
            "Access to Spotify Kids dedicated mobile app",
            "Ad-free listening and unlimited offline downloads",
            "Only $2.83 per person / month"
        ],
        buttonText: "Get Premium Family",
        popular: false
    },
    {
        id: "student",
        name: "Student",
        badge: "Special Discount",
        priceMonthly: 5.99,
        priceAnnual: 59.99,
        accounts: "1 verified student",
        desc: "Huge 50% discount for eligible university or college students. Includes free Hulu subscription.",
        perks: [
            "50% discount off standard Individual plan",
            "Hulu (With Ads) subscription included free",
            "Ad-free music and podcast listening",
            "Download songs for offline studying",
            "Verified annually via SheerID",
            "Keep student rate for up to 4 years"
        ],
        buttonText: "Get Student Discount",
        popular: false
    }
];

export const premiumFaqs = [
    {
        q: "How does the Spotify Premium 1-month free trial work?",
        a: "If you've never had Premium before, you can try it free for 30 days. You get complete access to all Premium features with zero ads and unlimited downloads. We'll remind you 7 days before your trial ends. If you don't cancel, your subscription continues automatically at the regular monthly price."
    },
    {
        q: "Can I cancel my subscription at any time?",
        a: "Yes! There are no contracts, no cancellation fees, and no commitments. You can cancel your subscription with a single click in your Account settings. You'll keep your Premium benefits until the end of your current billing period."
    },
    {
        q: "How do the Duo and Family plans work?",
        a: "Every member gets their own private Premium account with their own passwords, saved music, and personalized playlists. Members must simply reside at the same physical address. The plan manager pays one simple combined monthly bill."
    },
    {
        q: "How do I qualify for the Student discount?",
        a: "You must be currently enrolled at an accredited college or university. Verification is quick and automated through SheerID. Once approved, you get the $5.99/mo rate for up to 12 months at a time, renewable up to 4 years."
    },
    {
        q: "What audio quality does Premium provide?",
        a: "Spotify Premium streams audio at up to 320 kbps (Very High quality AAC/Ogg Vorbis), compared to 160 kbps on the Free plan. You get richer bass, clearer vocals, and pristine instrument separation."
    }
];

export function initPremium({ onSubscribeSuccess, toast }) {
    let billingCycle = "monthly"; // 'monthly' | 'annual'
    let selectedPlan = premiumPlans[0];

    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Render plans grid
    function renderPlans() {
        const grid = $("premiumPlansGrid");
        if (!grid) return;

        grid.innerHTML = premiumPlans.map(plan => {
            const price = billingCycle === "monthly" 
                ? `$${plan.priceMonthly} <span class="price-cycle">/ month</span>`
                : `$${plan.priceAnnual} <span class="price-cycle">/ year (Save 20%)</span>`;

            return `
            <div class="premium-plan-card ${plan.popular ? 'popular-card' : ''}" data-plan-id="${plan.id}">
                ${plan.popular ? '<div class="popular-ribbon"><i class="fa-solid fa-fire"></i> Most Popular</div>' : ''}
                <div class="plan-card-header">
                    <span class="plan-badge ${plan.popular ? 'green-badge' : ''}">${plan.badge}</span>
                    <h3 class="plan-title">${plan.name}</h3>
                    <div class="plan-price">${price}</div>
                    <span class="plan-accounts"><i class="fa-solid fa-users"></i> ${plan.accounts}</span>
                </div>
                <p class="plan-desc">${plan.desc}</p>
                <div class="plan-divider"></div>
                <ul class="plan-perks-list">
                    ${plan.perks.map(p => `<li><i class="fa-solid fa-check"></i> <span>${p}</span></li>`).join("")}
                </ul>
                <button class="badge plan-action-btn ${plan.popular ? 'create-btn' : ''}" data-plan-id="${plan.id}">
                    ${plan.buttonText}
                </button>
            </div>`;
        }).join("");

        // Attach plan button click handlers
        $$(".plan-action-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const planId = btn.dataset.planId;
                const plan = premiumPlans.find(p => p.id === planId) || premiumPlans[0];
                openCheckoutModal(plan);
            });
        });
    }

    // Render FAQs
    function renderFaqs() {
        const container = $("premiumFaqContainer");
        if (!container) return;

        container.innerHTML = premiumFaqs.map((faq, idx) => `
            <div class="faq-accordion-item" data-idx="${idx}">
                <button class="faq-question-btn">
                    <span>${faq.q}</span>
                    <i class="fa-solid fa-chevron-down faq-chevron"></i>
                </button>
                <div class="faq-answer-panel">
                    <p>${faq.a}</p>
                </div>
            </div>
        `).join("");

        $$(".faq-question-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const item = btn.closest(".faq-accordion-item");
                const wasActive = item.classList.contains("open");
                $$(".faq-accordion-item").forEach(i => i.classList.remove("open"));
                if (!wasActive) item.classList.add("open");
            });
        });
    }

    // Billing toggle (Monthly vs Annual)
    const toggleMonthly = $("billingMonthlyBtn");
    const toggleAnnual = $("billingAnnualBtn");

    if (toggleMonthly && toggleAnnual) {
        toggleMonthly.addEventListener("click", () => {
            billingCycle = "monthly";
            toggleMonthly.classList.add("active-toggle");
            toggleAnnual.classList.remove("active-toggle");
            renderPlans();
        });

        toggleAnnual.addEventListener("click", () => {
            billingCycle = "annual";
            toggleAnnual.classList.add("active-toggle");
            toggleMonthly.classList.remove("active-toggle");
            renderPlans();
            toast("Switched to annual billing with 20% discount!", "fa-tag");
        });
    }

    // Checkout Modal
    const modal = $("subscribeModal");
    const closeBtn = $("closeCheckoutModalBtn");
    const cancelBtn = $("cancelCheckoutBtn");
    const confirmBtn = $("confirmSubscribeBtn");

    function openCheckoutModal(plan) {
        selectedPlan = plan;
        $("checkoutPlanTitle").textContent = `Get Spotify ${plan.name}`;
        $("checkoutPlanPrice").textContent = billingCycle === "monthly" 
            ? `$${plan.priceMonthly} / month` 
            : `$${plan.priceAnnual} / year`;
        $("checkoutPromoTag").textContent = plan.badge;
        $("checkoutPlanDesc").textContent = plan.desc;
        confirmBtn.textContent = plan.id === "individual" ? "Start 1 Month Free" : `Subscribe to ${plan.name}`;
        modal.style.display = "flex";
    }

    function closeCheckoutModal() {
        modal.style.display = "none";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeCheckoutModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeCheckoutModal();
        });
    }

    // Payment radio click styling
    $$(".payment-radio").forEach(radio => {
        radio.addEventListener("click", () => {
            $$(".payment-radio").forEach(r => r.classList.remove("selected"));
            radio.classList.add("selected");
        });
    });

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Start 1 Month Free`;
                closeCheckoutModal();

                if (onSubscribeSuccess) {
                    onSubscribeSuccess(selectedPlan);
                }
                toast(`🎉 Welcome to Spotify Premium ${selectedPlan.name}!`, "fa-gem");
            }, 900);
        });
    }

    // Hero action buttons
    const heroTryBtn = $("heroTryPremiumBtn");
    const heroViewPlansBtn = $("heroViewPlansBtn");

    if (heroTryBtn) {
        heroTryBtn.addEventListener("click", () => {
            openCheckoutModal(premiumPlans[0]);
        });
    }

    if (heroViewPlansBtn) {
        heroViewPlansBtn.addEventListener("click", () => {
            const plansHeader = $("premiumPlansSection");
            if (plansHeader) {
                plansHeader.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    // Initial render
    renderPlans();
    renderFaqs();
}


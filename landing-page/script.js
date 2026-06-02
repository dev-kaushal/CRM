document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // THEME SWITCHER SYSTEM (localStorage Sync)
    // ==========================================================================
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Push button pop animation
        themeToggle.style.transform = 'scale(0.85) rotate(15deg)';
        setTimeout(() => {
            themeToggle.style.transform = 'scale(1) rotate(0)';
        }, 150);
    });

    // ==========================================================================
    // 3D TILT EFFECT ON GLASS CARDS
    // ==========================================================================
    const cards = document.querySelectorAll('.tilt-effect, .glass-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -4; // Subtle 4deg rotation max
            const rotateY = ((x - centerX) / centerX) * 4;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            card.style.transition = 'transform 0.4s ease';
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'none';
        });
    });

    // ==========================================================================
    // SECTION 1: HERO PIPELINE STEPPER INTERACTION
    // ==========================================================================
    const heroNodes = document.querySelectorAll('.hero-pipeline-preview .step-node');
    const progressBar = document.querySelector('.pipeline-progress-bar');
    const detailsContent = document.getElementById('pipeline-visual-details-content');

    const heroDetails = {
        lead: {
            title: "1. Leads Intake Management",
            description: "All inbound lead streams—Meta Ads, Google Leads, Whatsapp, and direct contact forms—are consolidated automatically into a single, clean intake stream with lead attribution mapping.",
            kpi: "Response Time: < 3 mins",
            tag: "Intake Stream"
        },
        prospect: {
            title: "2. BANT Qualification Gate",
            description: "Identify sales-readiness through an embedded BANT framework. Sales reps score inbound contacts against verified budgets, authority flags, exact need lists, and purchase schedules.",
            kpi: "Qualification Rate: +38%",
            tag: "BANT Matrix"
        },
        deal: {
            title: "3. Opportunity Pipeline Tracking",
            description: "Convert qualified prospects into pipeline value. Reps move opportunities through customizable stages (New -> Proposal -> Negotiation -> Contract) with weighted forecasts.",
            kpi: "Weighted Yield: ₹4.2Cr+",
            tag: "Custom pipeline"
        },
        contract: {
            title: "4. Contract Generation & E-Sign",
            description: "Draft proposals and standard retainers in seconds, send to clients immediately, and verify signature logs in real-time. Secure, audited, and linked with opportunities.",
            kpi: "Signoff Cycles: -72% time",
            tag: "Encrypted E-Sign"
        },
        customer: {
            title: "5. Customer Retainer Lifecycle",
            description: "Once signed, accounts are provisioned and retainers are active. Track monthly recurring revenue, customer satisfaction metrics, and retainers in a centralized customer panel.",
            kpi: "LTV Optimization: +45%",
            tag: "Lifecycle Retention"
        }
    };

    heroNodes.forEach((node, idx) => {
        node.addEventListener('click', () => {
            // Activate selected node
            heroNodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');

            // Move progress bar
            const pct = (idx / (heroNodes.length - 1)) * 100;
            progressBar.style.width = `${pct}%`;

            // Update content details
            const stageName = node.getAttribute('data-stage');
            const data = heroDetails[stageName];
            if (data) {
                detailsContent.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <span class="badge" style="margin-bottom:0;">${data.tag}</span>
                        <strong style="color:var(--brand-accent); font-size:0.9rem;">${data.kpi}</strong>
                    </div>
                    <h3 class="cause-font" style="font-size:1.35rem; margin-bottom:0.5rem; color:var(--text-color);">${data.title}</h3>
                    <p style="font-size:0.95rem; color:var(--muted-color); line-height:1.6;">${data.description}</p>
                `;
            }
        });
    });

    // ==========================================================================
    // TRUST BAR: NUMERIC COUNT ANIMATION
    // ==========================================================================
    const stats = document.querySelectorAll('.trust-stats .stat-item h3');
    const startCountAnimations = () => {
        stats.forEach(stat => {
            const targetStr = stat.getAttribute('data-target');
            const targetVal = parseFloat(targetStr.replace(/[^0-9.]/g, ''));
            const suffix = targetStr.replace(/[0-9.]/g, '');
            
            let count = 0;
            const duration = 2000; // 2 seconds
            const stepTime = 30;
            const steps = duration / stepTime;
            const increment = targetVal / steps;

            const timer = setInterval(() => {
                count += increment;
                if (count >= targetVal) {
                    clearInterval(timer);
                    stat.innerText = targetStr;
                } else {
                    stat.innerText = (targetVal % 1 === 0 ? Math.floor(count) : count.toFixed(1)) + suffix;
                }
            }, stepTime);
        });
    };

    // Trigger counter animations using IntersectionObserver
    const trustSection = document.querySelector('.trust-bar');
    if (trustSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                startCountAnimations();
                observer.unobserve(trustSection);
            }
        }, { threshold: 0.2 });
        observer.observe(trustSection);
    } else {
        startCountAnimations(); // Fallback
    }

    // ==========================================================================
    // SECTION 5: COMPLETE SALES PIPELINE STEP SWITCHER
    // ==========================================================================
    const stageBtns = document.querySelectorAll('.pipeline-stage-nav .stage-btn');
    const stagePanes = document.querySelectorAll('.pipeline-interactive-box .stage-pane');

    stageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active Tab Button
            stageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch content pane
            const targetPane = btn.getAttribute('data-pane');
            stagePanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === targetPane) {
                    pane.classList.add('active');
                }
            });
        });
    });

    // ==========================================================================
    // SECTION 12: DASHBOARD SHOWCASE SWITCHER
    // ==========================================================================
    const showcaseBtns = document.querySelectorAll('.showcase-tabs .showcase-tab-btn');
    const showcasePanes = document.querySelectorAll('.showcase-viewports .showcase-pane');

    showcaseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active Tab Button
            showcaseBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch pane
            const targetPane = btn.getAttribute('data-pane');
            showcasePanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === targetPane) {
                    pane.classList.add('active');
                }
            });
        });
    });

    // ==========================================================================
    // SECTION 16: TESTIMONIALS SLIDER CAROUSEL
    // ==========================================================================
    const testimonialCards = document.querySelectorAll('.carousel-container .testimonial-card');
    const prevBtn = document.querySelector('.carousel-container .carousel-nav-prev');
    const nextBtn = document.querySelector('.carousel-container .carousel-nav-next');
    let activeTestimonialIndex = 0;

    const showTestimonial = (index) => {
        testimonialCards.forEach((card, idx) => {
            card.classList.remove('active');
            if (idx === index) {
                card.classList.add('active');
            }
        });
    };

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            activeTestimonialIndex = (activeTestimonialIndex - 1 + testimonialCards.length) % testimonialCards.length;
            showTestimonial(activeTestimonialIndex);
        });

        nextBtn.addEventListener('click', () => {
            activeTestimonialIndex = (activeTestimonialIndex + 1) % testimonialCards.length;
            showTestimonial(activeTestimonialIndex);
        });

        // Autoplay every 7 seconds
        setInterval(() => {
            activeTestimonialIndex = (activeTestimonialIndex + 1) % testimonialCards.length;
            showTestimonial(activeTestimonialIndex);
        }, 7000);
    }

    // ==========================================================================
    // SECTION 19: FAQ ACCORDION + FILTER CATEGORIES
    // ==========================================================================
    const faqQuestions = document.querySelectorAll('.faq-list .faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.parentElement;
            const isActive = parent.classList.contains('active');
            
            // Close other items
            document.querySelectorAll('.faq-list .faq-item').forEach(item => {
                item.classList.remove('active');
            });

            if (!isActive) {
                parent.classList.add('active');
            }
        });
    });

    // FAQ Category Filter Logic
    const faqCatBtns = document.querySelectorAll('.faq-categories .faq-cat-btn');
    const faqItems = document.querySelectorAll('.faq-list .faq-item');

    faqCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            faqCatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-cat');
            faqItems.forEach(item => {
                if (category === 'all' || item.getAttribute('data-category') === category) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
});

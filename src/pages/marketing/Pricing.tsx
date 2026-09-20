// Noska pricing — DB-driven via billing_plans (admin-configurable, §17).
// Prices, trials, badges and savings compute from the database; nothing hardcoded.
import { FaqAccordion } from './components/FaqAccordion';
import { PricingCards } from '@/components/billing/PricingCards';
import { PlanComparison } from '@/components/billing/PlanComparison';
import './Pricing.css';

export default function Pricing() {
  const faqs = [
    { id: 1, q: 'Can I use Noska for free?', a: 'Yes! Noska is free for individuals. Upgrade only if you need higher limits and premium features.' },
    { id: 2, q: 'How does billing work?', a: 'Choose monthly or yearly billing. Yearly billing saves you money compared to paying monthly — the exact savings are shown on each plan.' },
    { id: 3, q: 'Can I change my plan or cancel at any time?', a: 'Yes, you can upgrade, downgrade, or cancel at any time. Downgrades and cancellations take effect at the end of your current billing period, so you keep access until then.' },
    { id: 4, q: 'What happens if a payment fails?', a: 'We notify you and keep your access during a grace period while you update your payment method.' },
    { id: 5, q: 'Do you offer trials or coupons?', a: 'Many plans include a free trial, and you can apply coupon codes at checkout when available.' },
  ];

  return (
    <div className="pricing-wrapper">
      <section className="pricing-header mkt-container">
        <h1>One tool for your whole team.</h1>
        <p>Go free with your notes, or upgrade to add AI agents, automations, advanced collaboration, and higher limits.</p>
      </section>

      <section className="plans-section mkt-container">
        <PricingCards />
      </section>

      <section className="comparison-section mkt-container">
        <h2 className="comparison-title">Compare all features</h2>
        <PlanComparison />
      </section>

      <section className="faq-section mkt-container">
        <h2 className="faq-title">Frequently asked questions</h2>
        <FaqAccordion items={faqs.map((f) => ({ q: f.q, a: f.a }))} className="faq-list" />
      </section>
    </div>
  );
}

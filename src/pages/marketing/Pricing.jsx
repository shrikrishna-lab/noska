import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import './Pricing.css';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const plans = [
    {
      name: 'Free',
      desc: 'For organizing every corner of your work & life.',
      price: 0,
      btnText: 'Get started',
      features: [
        'Collaborative workspace',
        'Integrate with Slack, GitHub & more',
        'Basic page analytics',
        '7-day page history',
        'Invite up to 10 guests'
      ]
    },
    {
      name: 'Plus',
      desc: 'A collaborative hub for small groups & teams.',
      price: billingCycle === 'yearly' ? 8 : 10,
      btnText: 'Start Plus trial',
      highlighted: true,
      features: [
        'Everything in Free',
        'Unlimited blocks for teams',
        'Unlimited file uploads',
        '30-day page history',
        'Invite up to 100 guests'
      ]
    },
    {
      name: 'Business',
      desc: 'For companies connecting multiple teams & projects.',
      price: billingCycle === 'yearly' ? 15 : 18,
      btnText: 'Start Business trial',
      features: [
        'Everything in Plus',
        'Private teamspaces',
        'Advanced page analytics',
        '90-day page history',
        'Invite up to 250 guests'
      ]
    },
    {
      name: 'Enterprise',
      desc: 'Talk to us — SSO/SCIM are roadmap items we build with design partners.',
      price: 'Custom',
      btnText: 'Contact sales',
      features: [
        'Everything in Business',
        'Dedicated support channel',
        'Unlimited page history',
        'Custom guest limits',
        'Early access to SAML SSO & SCIM as they ship'
      ]
    }
  ];

  const faqs = [
    {
      id: 1,
      q: 'Can I use Noska for free?',
      a: 'Yes! Noska is free for individuals. You can create unlimited pages, collaborate with guests, and use standard integrations without paying a dime.'
    },
    {
      id: 2,
      q: 'What counts as a guest in Noska?',
      a: 'A guest is someone you invite to specific pages in your workspace. They can view, comment on, or edit those pages, but they cannot create new pages outside of those folders or access other parts of your workspace.'
    },
    {
      id: 3,
      q: 'How does billing work for teams?',
      a: 'Noska charges per seat (active member) in your workspace. If you add a member, you will be billed a pro-rated amount for their seat. If you remove a member, you will receive a credit on your next bill.'
    },
    {
      id: 4,
      q: 'Can I change my plan or cancel at any time?',
      a: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time. When you downgrade or cancel, you will retain access to your plan features until the end of your current billing cycle.'
    },
    {
      id: 5,
      q: 'Do you offer education or non-profit discounts?',
      a: 'Yes! Noska offers a free Plus plan to students and educators using their school email addresses. We also offer a 50% discount on Plus plans for qualified non-profit organizations.'
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="pricing-wrapper">
      {/* Pricing Header */}
      <section className="pricing-header mkt-container">
        <h1>One tool for your whole team.</h1>
        <p>Go free with your notes, or upgrade to add team collaboration, advanced security, and unlimited history.</p>

        {/* Toggle Switch */}
        <div className="billing-toggle-container">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Billed monthly
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Billed yearly
            <span className="save-badge">Save 20%</span>
          </button>
        </div>
      </section>

      {/* Pricing Plan Cards Grid */}
      <section className="plans-section mkt-container">
        <div className="plans-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`plan-card ${plan.highlighted ? 'highlighted' : ''}`}>
              {plan.highlighted && <div className="card-ribbon">Most Popular</div>}
              <div className="card-top">
                <h3>{plan.name}</h3>
                <p className="plan-desc">{plan.desc}</p>
                <div className="price-container">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="currency">$</span>
                      <span className="price-num">{plan.price}</span>
                      <span className="price-period">/seat/month</span>
                    </>
                  ) : (
                    <span className="price-num custom-price">{plan.price}</span>
                  )}
                </div>
                <button className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} btn-plan-action`}>
                  {plan.btnText}
                </button>
              </div>
              <hr className="card-divider" />
              <div className="card-bottom">
                <p className="features-title">Features include:</p>
                <ul className="features-list">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx}>
                      <Check size={16} className="check-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Feature Comparison Grid */}
      <section className="comparison-section mkt-container">
        <h2 className="comparison-title">Compare all features</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-col">Feature</th>
                <th>Free</th>
                <th>Plus</th>
                <th>Business</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="category-row">
                <td colSpan={5}>Content & Collab</td>
              </tr>
              <tr>
                <td className="feature-col">Unlimited pages & blocks</td>
                <td>Individual only</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td className="feature-col">Page history</td>
                <td>7 days</td>
                <td>30 days</td>
                <td>90 days</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td className="feature-col">File uploads</td>
                <td>5 MB</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr className="category-row">
                <td colSpan={5}>Security & Admin</td>
              </tr>
              <tr>
                <td className="feature-col">Row-level security on every table</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td className="feature-col">Client-side page encryption</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td className="feature-col">SAML SSO & SCIM</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>Roadmap</td>
              </tr>
              <tr>
                <td className="feature-col">Custom guest limits</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="faq-section mkt-container">
        <h2 className="faq-title">Frequently asked questions</h2>
        <div className="faq-list">
          {faqs.map(faq => (
            <div key={faq.id} className="faq-item">
              <button className="faq-question" onClick={() => toggleFaq(faq.id)}>
                <span>{faq.q}</span>
                {expandedFaq === faq.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <div className={`faq-answer ${expandedFaq === faq.id ? 'open' : ''}`}>
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { Check, Sparkles, Award, Crown, Building2 } from 'lucide-react';

interface PlanFeature {
  name: string;
  starter: boolean | string;
  growth: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const features: PlanFeature[] = [
  { name: 'Basic billing & KOT', starter: true, growth: true, pro: true, enterprise: true },
  { name: 'Table management', starter: 'Up to 10', growth: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Menu items', starter: 'Up to 50', growth: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Staff users', starter: '1', growth: '3', pro: '10', enterprise: 'Unlimited' },
  { name: 'Token number system', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Multiple table sections', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Item modifiers & add-ons', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Kitchen Display System', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Inventory management', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Procurement (PO→GRN→Invoice)', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Aggregator orders (Zomato/Swiggy)', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Order Taker App (Waiter)', starter: false, growth: true, pro: true, enterprise: true },
  { name: 'Customer CRM', starter: false, growth: 'Basic', pro: 'Full', enterprise: 'Full' },
  { name: 'QR code ordering', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'Self-order kiosk', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'Loyalty points & tiers', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'Promotions & coupons', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'WhatsApp marketing', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'AI business insights', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'Anti-theft & loss prevention', starter: false, growth: false, pro: true, enterprise: true },
  { name: 'Multi-branch support', starter: false, growth: false, pro: 'Up to 3', enterprise: 'Unlimited' },
  { name: 'White-label / Reseller mode', starter: false, growth: false, pro: false, enterprise: true },
  { name: 'API access', starter: false, growth: false, pro: false, enterprise: true },
  { name: 'Dedicated support + SLA', starter: false, growth: false, pro: false, enterprise: true },
];

export function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '₹999',
      period: '/month',
      description: 'Perfect for solo cafes & small counters',
      icon: Sparkles,
      color: 'from-gray-500 to-gray-600',
      borderColor: 'border-gray-200',
      buttonClass: 'bg-gray-600 hover:bg-gray-700',
      popular: false,
    },
    {
      name: 'Growth',
      price: '₹1,999',
      period: '/month',
      description: 'For QSRs & casual dining restaurants',
      icon: Award,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-200',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      popular: false,
    },
    {
      name: 'Pro',
      price: '₹3,499',
      period: '/month',
      description: 'Full-service restaurants & growing brands',
      icon: Crown,
      color: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-300',
      buttonClass: 'bg-amber-500 hover:bg-amber-600',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Chains, multi-branch & cloud kitchens',
      icon: Building2,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-200',
      buttonClass: 'bg-purple-600 hover:bg-purple-700',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Choose the perfect plan for your restaurant
          </p>
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-6 py-3 rounded-full">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">14-day free trial on all plans • No credit card required</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl shadow-lg border-2 ${plan.borderColor} overflow-hidden ${
                plan.popular ? 'ring-4 ring-amber-200 transform scale-105' : ''
              } transition-transform hover:scale-105`}
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="p-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6 h-12">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600">{plan.period}</span>}
                </div>
                <button className={`w-full ${plan.buttonClass} text-white font-semibold py-3 px-4 rounded-lg transition-colors`}>
                  Start Free Trial
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Growth</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{feature.name}</td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.starter)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.growth)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.pro)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderFeatureValue(feature.enterprise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your restaurant?</h2>
          <p className="text-xl mb-6 opacity-90">
            Start your free 14-day trial today. No credit card required.
          </p>
          <button className="bg-white text-amber-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg text-lg transition-colors">
            Start Free Trial
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-3">💳</div>
            <h3 className="font-semibold text-gray-900 mb-2">No Credit Card Required</h3>
            <p className="text-gray-600 text-sm">Start your trial instantly without payment details</p>
          </div>
          <div>
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
            <p className="text-gray-600 text-sm">No long-term contracts or hidden fees</p>
          </div>
          <div>
            <div className="text-4xl mb-3">📞</div>
            <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-gray-600 text-sm">Our team is here to help you succeed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-600 mx-auto" />;
  }
  if (value === false) {
    return <span className="text-gray-400">—</span>;
  }
  return <span className="text-sm font-medium text-gray-700">{value}</span>;
}


interface PromotionalMessagesProps {
  planName: string;
}

export function PromotionalMessages({ planName }: PromotionalMessagesProps) {
  const isPaidPlan = planName !== 'free';

  return (
    <div className="space-y-4 my-4">
      {/* Universal promotional message for all tiers */}
      <div className="bg-gradient-to-r from-cyber-blue/10 to-tech-accent/10 p-4 rounded-lg border border-cyber-blue/20">
        <p className="text-sm font-bold text-center leading-relaxed">
          🚀 Upgrade to CriderGPT+ or Pro for Exclusive Unlocking. 🔧 Every subscription helps build the future of CriderGPT. You're not just subscribing — you're fueling smarter AI, better tools, and constant innovation. Your support directly powers new features, faster updates, and all-new upgrades.
        </p>
      </div>

      {/* Additional message for paid plans */}
      {isPaidPlan && (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border border-green-500/20">
          <p className="text-sm font-bold text-center leading-relaxed">
            💸 No waste. Just progress. Your subscription goes straight into making CriderGPT stronger, smarter, and more valuable with every update. Why Upgrade? When you subscribe, you're not just unlocking features — you're investing in smarter AI, faster updates, and powerful tools made just for you. Every dollar goes back into CriderGPT. No fluff. Just future.
          </p>
        </div>
      )}
    </div>
  );
}

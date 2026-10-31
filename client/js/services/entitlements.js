/**
 * services/entitlements.js
 * "Can this user use feature X?" - the single question every gated feature asks.
 *
 * Right now config.enforcePlans is false, so everything is allowed and the app behaves as
 * one generous free plan. When billing arrives (phase 7B) the plan will come from the server
 * and this file is the only place that changes. Feature code should look like:
 *
 *   if (!(await can('export-pdf'))) return showUpgradePrompt('export-pdf');
 */

import { config } from '../core/config.js';
import { DEFAULT_PLAN, PLANS, planIncludes } from '../../../shared/plans.js';
import { profileRepo } from '../data/profileRepo.js';

export async function getPlanId() {
  const { plan } = await profileRepo.get();
  return PLANS[plan] ? plan : DEFAULT_PLAN;
}

export async function can(featureKey) {
  if (!config.enforcePlans) return true;
  return planIncludes(await getPlanId(), featureKey);
}

import { useState, useEffect } from "react";
import axios from "axios";

const API = `/api`;

let cachedPlan = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

export default function usePlan() {
  const [planInfo, setPlanInfo] = useState(cachedPlan);
  const [loading, setLoading] = useState(!cachedPlan);

  useEffect(() => {
    const now = Date.now();
    if (cachedPlan && now - cacheTime < CACHE_TTL) {
      setPlanInfo(cachedPlan);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/user/plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        cachedPlan = res.data;
        cacheTime = Date.now();
        setPlanInfo(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan = planInfo?.plan ?? {};
  const isAdmin = planInfo?.isAdmin ?? false;
  const planType = planInfo?.planType ?? "free";
  const role = planInfo?.role ?? "employee";
  const postsUsed = planInfo?.postsUsedThisMonth ?? 0;
  const maxPosts = plan?.maxPostsPerMonth === "unlimited" ? null : plan?.maxPostsPerMonth ?? 10;
  const connectedCount = planInfo?.connectedAccountsCount ?? 0;
  const maxAccounts = plan?.maxAccounts ?? 1;
  const tokens = planInfo?.tokens ?? 0;

  return {
    planInfo,
    loading,
    plan,
    planType,
    isAdmin,
    role,
    postsUsed,
    maxPosts,
    connectedCount,
    maxAccounts,
    tokens,
    canAI: isAdmin || !!plan?.aiEnabled,
    canBulkUpload: isAdmin || !!plan?.bulkUpload,
    canAnalyticsDetailed: isAdmin || !!plan?.analyticsDetailed,
    canCustomRecurrence: isAdmin || !!plan?.customRecurrence,
    canManagerRoles: isAdmin || !!plan?.managerRoleEnabled,
    hasFullHierarchy: isAdmin || !!plan?.fullHierarchy,
    canProductivityNotes: isAdmin || !!plan?.productivityNotes,
    canTodoScheduling: isAdmin || !!plan?.taskScheduling,
    canDocs: isAdmin || !!plan?.docs,
    hasOrgTools: isAdmin || !!plan?.orgTools,
  };
}

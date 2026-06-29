"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

export type MetaFacebookStatus = {
  metaConfigured: boolean;
  connected: boolean;
  facebook: {
    facebookUserId?: string | null;
    facebookUserName?: string | null;
    connected?: boolean;
    grantedScopes?: string[];
    missingScopes?: string[];
  } | null;
  pages: Array<{
    id: string;
    pageId: string;
    pageName: string;
    pictureUrl?: string | null;
    category?: string | null;
    link?: string | null;
    tasks?: string[];
    connected: boolean;
    webhookStatus?: string;
    syncStatus?: string;
    activeFormsCount?: number;
    totalFormsCount?: number;
    business?: { name: string; businessId: string } | null;
  }>;
  businesses: Array<{
    id: string;
    businessId: string;
    name: string;
    verificationStatus: string | null;
    pictureUrl: string | null;
    link: string | null;
    pagesCount?: number;
    formsCount?: number;
  }>;
  businessesCount: number;
  adAccountsCount?: number;
  connectedPagesCount: number;
  totalPagesCount: number;
  webhookUrl: string;
  webhookVerified?: boolean;
};

async function fetchWithTimeout(url: string, init?: RequestInit, ms = 15000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    return await apiFetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

export function useMetaFacebookStatus() {
  const [status, setStatus] = useState<MetaFacebookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/status");
      const json = await res.json();
      if (json.data) setStatus(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncBusinesses = useCallback(async () => {
    setSyncing("businesses");
    try {
      await fetchWithTimeout("/api/facebook/businesses", { method: "POST" });
      await load();
    } finally {
      setSyncing(null);
    }
  }, [load]);

  const syncPages = useCallback(async () => {
    setSyncing("pages");
    try {
      await fetchWithTimeout("/api/facebook/pages", { method: "POST" });
      await load();
    } finally {
      setSyncing(null);
    }
  }, [load]);

  const togglePage = useCallback(
    async (pageId: string, isConnected: boolean) => {
      setSyncing(`page-${pageId}`);
      try {
        await fetchWithTimeout(`/api/facebook/pages/${pageId}`, {
          method: isConnected ? "DELETE" : "POST",
        });
        await load();
      } finally {
        setSyncing(null);
      }
    },
    [load]
  );

  return {
    status,
    loading,
    syncing,
    reload: load,
    syncBusinesses,
    syncPages,
    togglePage,
  };
}

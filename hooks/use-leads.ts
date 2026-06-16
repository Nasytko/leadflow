"use client";

import { useEffect, useState, useCallback } from "react";

type UseLeadsOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  formId?: string;
};

export function useLeads(options: UseLeadsOptions = {}) {
  const { page = 1, limit = 20, search = "", status = "", formId = "" } = options;
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
      ...(formId && { formId }),
    });
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    if (data.data) {
      setLeads(data.data.items);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    }
    setLoading(false);
  }, [page, limit, search, status, formId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, total, totalPages, loading, refetch: fetchLeads };
}

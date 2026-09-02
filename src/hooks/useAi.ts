import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "../services/aiService";

const statusKey = ["ai-provider-status"] as const;

export function useAiStatus() {
  return useQuery({ queryKey: statusKey, queryFn: () => aiService.getStatus(), retry: false });
}

export function useConnectAi() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => aiService.connect(),
    onSuccess: (status) => client.setQueryData(statusKey, status),
  });
}

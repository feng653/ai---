import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "../services/aiService";

const statusKey = ["ai-provider-status"] as const;
const providersKey = ["ai-providers"] as const;

export function useAiProviders() {
  return useQuery({ queryKey: providersKey, queryFn: () => aiService.listProviders(), retry: false });
}

function useProviderMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: providersKey }),
        client.invalidateQueries({ queryKey: statusKey }),
      ]);
    },
  });
}

export function useAiStatus() {
  return useQuery({ queryKey: statusKey, queryFn: () => aiService.getStatus(), retry: false });
}

export function useSelectAiProvider() {
  return useProviderMutation((id: import("../domain/ai").AiProviderId) => aiService.selectProvider(id));
}

export function useSaveApiProvider() {
  return useProviderMutation((input: import("../domain/ai").ApiProviderInput) => aiService.saveApiProvider(input));
}

export function useTestApiProvider() {
  return useMutation({ mutationFn: (input: import("../domain/ai").ApiProviderInput) => aiService.testApiProvider(input) });
}

export function useLoginCodex() {
  return useProviderMutation(() => aiService.loginCodex());
}

export function useDisconnectAiProvider() {
  return useProviderMutation((id: import("../domain/ai").AiProviderId) => aiService.disconnectProvider(id));
}

export function useConnectAi() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => aiService.connect(),
    onSuccess: (status) => client.setQueryData(statusKey, status),
  });
}

export interface WorkspaceSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceSitumConfig {
  id: string
  workspaceId: string
  situmAccountId: string
  configured: boolean
  readOnlyConfigured: boolean
  readWriteConfigured: boolean
  updatedAt: string
}

interface ApiErrorShape {
  data?: { data?: { requestId?: string }, requestId?: string, statusMessage?: string }
  statusMessage?: string
}

const WORKSPACE_STORAGE_KEY = 'situm-explore-workspace-id'

function readSavedWorkspaceId() {
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistWorkspaceId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id)
    else window.localStorage.removeItem(WORKSPACE_STORAGE_KEY)
  } catch {
    // Workspace selection remains available for the current page session.
  }
}

export function getSafeErrorMessage(error: unknown, fallback: string) {
  const value = error as ApiErrorShape
  return value.data?.data?.requestId
    ? `${fallback} (Reference ${value.data.data.requestId})`
    : value.data?.requestId
      ? `${fallback} (Reference ${value.data.requestId})`
      : fallback
}

export function useWorkspaceContext() {
  const workspaces = useState<WorkspaceSummary[]>('workspace-list', () => [])
  const selectedWorkspaceId = useState<string | null>('selected-workspace-id', () => null)
  const loaded = useState('workspace-list-loaded', () => false)

  const selectedWorkspace = computed(() => workspaces.value.find(workspace => workspace.id === selectedWorkspaceId.value) ?? null)

  async function loadWorkspaces() {
    const records = await $fetch<WorkspaceSummary[]>('/api/workspaces')
    workspaces.value = records
    if (!records.some(workspace => workspace.id === selectedWorkspaceId.value)) {
      const saved = import.meta.client ? readSavedWorkspaceId() : null
      selectedWorkspaceId.value = records.find(workspace => workspace.id === saved)?.id ?? records[0]?.id ?? null
    }
    if (import.meta.client && selectedWorkspaceId.value) persistWorkspaceId(selectedWorkspaceId.value)
    loaded.value = true
    return records
  }

  function selectWorkspace(id: string | null) {
    selectedWorkspaceId.value = id
    if (import.meta.client) {
      persistWorkspaceId(id)
    }
  }

  return { workspaces, selectedWorkspaceId, selectedWorkspace, loaded, loadWorkspaces, selectWorkspace }
}

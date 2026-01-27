export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | (string & {})

export type ProjectCommentResponse = {
  commentId?: string | null
  authorId?: string | null
  message?: string | null
  timeSpentMinutes?: number | null
  createdAt?: string | null
}

export type Project = {
  id?: string | null
  name?: string | null
  description?: string | null
  status?: ProjectStatus | null
  memberIds?: string[] | null
  createdAt?: string | null
  updatedAt?: string | null
  comments?: ProjectCommentResponse[] | null
}

export type UserSummary = {
  id?: string | null
  displayName?: string | null
  email?: string | null
  team?: string | null
  isAdmin?: boolean | null
  activeProjectCount?: number | null
}

export type User = {
  id?: string | null
  username?: string | null
  displayName?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  team?: string | null
  bio?: string | null
  isAdmin?: boolean | null
}

export type CreateProjectPayload = {
  name: string
  description?: string
  status: ProjectStatus
  memberIds: string[]
}

export type LoginPayload = {
  username: string
  password: string
  remember?: boolean
}

export type RegisterPayload = {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  team?: string
  bio?: string
}

export type UpdateProfilePayload = {
  email: string
  firstName: string
  lastName: string
  team: string
  bio?: string
}

export type AuthResponse = {
  token?: string | null
  user?: User | null
}

export type ConfirmEmailStatus = 'CONFIRMED' | 'ALREADY_CONFIRMED' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN'

export type ConfirmEmailResponse = {
  status: ConfirmEmailStatus
}

export type CommentAttachment = {
  id: string
  url: string
  contentType: string
  fileName: string
  size: number
}

export type ProjectComment = {
  id: string
  projectId: string
  authorUserId: string
  authorName: string
  message: string
  createdAt: string
  timeSpentMinutes?: number | null
  reactions?: Record<string, string[]>
  attachment?: CommentAttachment | null
}

export type CreateProjectCommentPayload = {
  message: string
  timeSpentMinutes?: number | null
  attachment?: CommentAttachment | null
}

export type CommentReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD'

export type CommentReactionPayload = {
  type: CommentReactionType
}

export type StatSlice = {
  label: string
  value: number
}

export type DashboardStatsResponse = {
  statusBreakdown: StatSlice[]
  workloadBreakdown: StatSlice[]
  activeInactiveBreakdown: StatSlice[]
}

export type DashboardCounters = {
  assigned: number
  inProgress: number
  completed: number
}

export type WorkspaceDashboardStatsResponse = {
  counters: DashboardCounters
  pies: {
    projectsByStatus: StatSlice[]
    projectsByTeam: StatSlice[]
    workloadByTeam: StatSlice[]
  }
  scope: {
    teams: string[]
    selectedTeams: string[]
    assignedToMe: boolean
  }
}

export type UserStatsResponse = {
  userId: string
  statusBreakdown: StatSlice[]
  activeInactiveBreakdown: StatSlice[]
  timeSpentWeekMinutes: number
  timeSpentMonthMinutes: number
  teamAverages?: {
    activeProjects: number
  } | null
}

export type PeopleOverviewStatsResponse = {
  pies: {
    peopleByTeam: StatSlice[]
    workloadByTeam: StatSlice[]
  }
}

export type PeopleUserStatsResponse = {
  userId: string
  pies: {
    projectsByStatus: StatSlice[]
    activeInactive: StatSlice[]
  }
}

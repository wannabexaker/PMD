import { describe, it, expect } from 'vitest'
import {
  toFolderKey,
  formatStatusLabel,
  PROJECT_STATUS_FLOW,
  PROJECT_STATUS_SELECTABLE,
  PROJECT_STATUS_CHART_COLORS,
  projectStatusChartColor,
} from './statuses'

describe('statuses (single source of truth)', () => {
  it('maps known statuses to their folder key', () => {
    expect(toFolderKey('NOT_STARTED')).toBe('NOT_STARTED')
    expect(toFolderKey('IN_PROGRESS')).toBe('IN_PROGRESS')
    expect(toFolderKey('COMPLETED')).toBe('COMPLETED')
    expect(toFolderKey('CANCELED')).toBe('CANCELED')
    expect(toFolderKey('ARCHIVED')).toBe('ARCHIVED')
  })

  it('falls back to NOT_STARTED for empty or unknown input', () => {
    expect(toFolderKey(null)).toBe('NOT_STARTED')
    expect(toFolderKey(undefined)).toBe('NOT_STARTED')
    expect(toFolderKey('SOMETHING_ELSE')).toBe('NOT_STARTED')
  })

  it('humanizes status labels', () => {
    expect(formatStatusLabel('IN_PROGRESS')).toBe('IN PROGRESS')
    expect(formatStatusLabel('NOT_STARTED')).toBe('NOT STARTED')
    expect(formatStatusLabel(null)).toBe('Unknown')
  })

  it('keeps ARCHIVED out of the user-selectable set but in the flow', () => {
    expect(PROJECT_STATUS_SELECTABLE).not.toContain('ARCHIVED')
    expect(PROJECT_STATUS_FLOW).toContain('ARCHIVED')
  })
})

describe('projectStatusChartColor', () => {
  it('maps status keys and backend labels to the same semantic colour', () => {
    expect(projectStatusChartColor('COMPLETED')).toBe(PROJECT_STATUS_CHART_COLORS.COMPLETED)
    expect(projectStatusChartColor('In progress')).toBe(PROJECT_STATUS_CHART_COLORS.IN_PROGRESS)
    expect(projectStatusChartColor('Canceled')).toBe(PROJECT_STATUS_CHART_COLORS.CANCELED)
    expect(projectStatusChartColor('Not started')).toBe(PROJECT_STATUS_CHART_COLORS.NOT_STARTED)
  })

  it('falls back to the not-started colour', () => {
    expect(projectStatusChartColor(null)).toBe(PROJECT_STATUS_CHART_COLORS.NOT_STARTED)
    expect(projectStatusChartColor('whatever')).toBe(PROJECT_STATUS_CHART_COLORS.NOT_STARTED)
  })
})

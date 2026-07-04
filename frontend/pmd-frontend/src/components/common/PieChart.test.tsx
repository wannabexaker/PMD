// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PieChart } from './PieChart'

describe('PieChart', () => {
  it('renders the empty label when the total is zero', () => {
    render(<PieChart data={[{ label: 'A', value: 0, color: '#ff0000' }]} emptyLabel="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })

  it('renders the total, legend labels and percentages', () => {
    render(
      <PieChart
        data={[
          { label: 'Done', value: 3, color: '#00ff00' },
          { label: 'Todo', value: 1, color: '#0000ff' },
        ]}
      />,
    )
    expect(screen.getByText('4')).toBeTruthy() // total = 3 + 1
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.getByText('Todo')).toBeTruthy()
    expect(screen.getByText(/75%/)).toBeTruthy()
    expect(screen.getByText(/25%/)).toBeTruthy()
  })
})

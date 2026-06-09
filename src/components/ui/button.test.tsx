import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('<Button />', () => {
  it('renders its children', () => {
    render(<Button>Lưu</Button>)
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument()
  })

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Gửi</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Gửi
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})

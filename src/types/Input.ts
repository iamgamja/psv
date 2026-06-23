import type { Modal } from '../util/Modal'

export type Input = {
  render(): void

  info_modal: Modal
  setting_modal: Modal
}

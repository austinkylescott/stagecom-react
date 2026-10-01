import { expect } from '@playwright/test'
import type { Locator } from '@playwright/test'

export async function waitForReactHandler(
  locator: Locator,
  handlerName: string,
) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element, name) =>
          Object.keys(element).some((key) => {
            if (!key.startsWith('__reactProps$')) return false
            const props = Reflect.get(element, key) as
              Record<string, unknown> | undefined
            return typeof props?.[name] === 'function'
          }),
        handlerName,
      ),
    )
    .toBe(true)
}
